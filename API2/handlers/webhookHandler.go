package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"upcycleconnect/bdd"

	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/webhook"
)

func StripeWebhookHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Lire le body brut
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		fmt.Printf("[ERROR] Webhook read body : %v\n", err)
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// 2. Vérifier la signature Stripe
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	var event stripe.Event

	if webhookSecret != "" {
		event, err = webhook.ConstructEventWithOptions(
	    payload,
	    r.Header.Get("Stripe-Signature"),
	    webhookSecret,
	    webhook.ConstructEventOptions{
	        IgnoreAPIVersionMismatch: true,
	    },
	)
	if err != nil {
	    fmt.Printf("[ERROR] Webhook signature invalide : %v\n", err)
	    http.Error(w, "Signature invalide", http.StatusBadRequest)
	    return
	}
		
	} else {
		// Pas de secret défini → on parse sans vérification (dev uniquement)
		fmt.Println("[WARN] STRIPE_WEBHOOK_SECRET non défini — signature non vérifiée")
		if err := json.Unmarshal(payload, &event); err != nil {
			http.Error(w, "Parse error", http.StatusBadRequest)
			return
		}
	}

	// 3. Traiter l'événement
	switch event.Type {

	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			fmt.Printf("[ERROR] Webhook parse session : %v\n", err)
			http.Error(w, "Parse error", http.StatusBadRequest)
			return
		}

		// Récupérer commande_id depuis les métadonnées
		commandeIdStr := session.Metadata["commande_id"]
		commandeId, err := strconv.Atoi(commandeIdStr)
		if err != nil || commandeId == 0 {
			fmt.Printf("[ERROR] Webhook commande_id invalide : %s\n", commandeIdStr)
			w.WriteHeader(http.StatusOK) // On répond 200 pour éviter les retry Stripe
			return
		}

		// Mettre à jour le paiement en BDD
		if err := bdd.UpdatePaiementByCommande(commandeId, session.ID, "Paye"); err != nil {
			fmt.Printf("[ERROR] Webhook UpdatePaiement commande %d : %v\n", commandeId, err)
		} else {
			fmt.Printf("[INFO] Webhook paiement confirmé — commande %d session %s\n", commandeId, session.ID)
		}

	case "checkout.session.expired":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			w.WriteHeader(http.StatusOK)
			return
		}
		commandeIdStr := session.Metadata["commande_id"]
		commandeId, _ := strconv.Atoi(commandeIdStr)
		if commandeId > 0 {
			_ = bdd.UpdatePaiementByCommande(commandeId, session.ID, "Echoue")
			fmt.Printf("[INFO] Webhook session expirée — commande %d\n", commandeId)
		}

	default:
		fmt.Printf("[INFO] Webhook événement ignoré : %s\n", event.Type)
	}

	// Toujours répondre 200 à Stripe
	w.WriteHeader(http.StatusOK)
}