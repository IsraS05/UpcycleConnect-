// handlers/proHandler.go — UpcycleConnect
// Handlers HTTP pour l'Espace Pro/Artisan
//
// Toutes les routes sont protégées par middleware.RequirePro().
// L'id_user est toujours extrait du JWT (jamais du body ou de l'URL)
// pour éviter l'usurpation d'identité.
//
// Conventions de réponse (cohérentes avec api.js côté front) :
//   Succès : { data: ... } OU tableau direct
//   Erreur  : { "error": "message" }
//   Codes   : 200 OK, 201 Created, 204 No Content, 400, 401, 403, 404, 500

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"upcycleconnect/bdd"
	"upcycleconnect/middleware"
	"upcycleconnect/models"

	stripe "github.com/stripe/stripe-go/v81"
	stripeSession "github.com/stripe/stripe-go/v81/checkout/session"
)

// ─────────────────────────────────────────
// Helper : extraire un paramètre d'URL
// Compatible avec net/http standard (sans gorilla/mux)
// Pattern : /api/pro/projects/42 → id=42
// ─────────────────────────────────────────

// parseIDFromPath — extrait le dernier segment numérique de l'URL
// Ex : "/api/pro/projects/42" → 42
func parseIDFromPath(r *http.Request) (int, error) {
	path  := strings.TrimSuffix(r.URL.Path, "/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 {
		return 0, fmt.Errorf("ID absent de l'URL")
	}
	last := parts[len(parts)-1]

	// Si le dernier segment est un verbe (:id/read, :id/step), prendre l'avant-dernier
	if last == "read" || last == "step" || last == "read-all" || last == "cancel" || last == "upgrade" {
		if len(parts) < 2 {
			return 0, fmt.Errorf("ID absent de l'URL")
		}
		last = parts[len(parts)-2]
	}

	id, err := strconv.Atoi(last)
	if err != nil {
		return 0, fmt.Errorf("ID invalide : %s", last)
	}
	return id, nil
}

// ─────────────────────────────────────────
// MODULE A — DASHBOARD (Tasks 38-40)
// ─────────────────────────────────────────

// GetDashboardKPIsHandler — GET /api/pro/dashboard/kpis
// Retourne les KPIs du Pro connecté depuis upcycling_score + depot_box + projet_pro
func GetDashboardKPIsHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	kpis, err := bdd.GetProDashboardKPIs(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetDashboardKPIsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération KPIs.")
		return
	}

	sendJSON(w, http.StatusOK, kpis)
}

// GetDashboardAlertsHandler — GET /api/pro/dashboard/alerts?limit=10
func GetDashboardAlertsHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit    := 10
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	alerts, err := bdd.GetProAlerts(idUser, limit)
	if err != nil {
		fmt.Printf("[ERROR] GetDashboardAlertsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération alertes.")
		return
	}

	// Retourner un tableau vide si nil (évite null côté JS)
	if alerts == nil {
		alerts = []models.ProAlert{}
	}
	sendJSON(w, http.StatusOK, alerts)
}

// GetDashboardActivityHandler — GET /api/pro/dashboard/activity?limit=5
// L'activité récente est construite depuis les notifications de l'utilisateur
func GetDashboardActivityHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit    := 5
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	notifs, err := bdd.GetProNotifications(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetDashboardActivityHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération activité.")
		return
	}

	// Convertir les notifications en items d'activité
	activity := make([]models.ProActivityItem, 0)
	for i, n := range notifs {
		if i >= limit {
			break
		}
		item := models.ProActivityItem{
			Icon:   "📢",
			Bg:     "var(--uc-vxl)",
			Label:  n.Contenu,
			Detail: "",
			Time:   n.Time,
		}
		activity = append(activity, item)
	}

	sendJSON(w, http.StatusOK, activity)
}

// MarkAlertReadHandler — PATCH /api/pro/dashboard/alerts/:id/read
func MarkAlertReadHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID alerte invalide.")
		return
	}

	if err := bdd.MarkAlertRead(id, idUser); err != nil {
		sendError(w, http.StatusNotFound, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ─────────────────────────────────────────
// MODULE A — NOTIFICATIONS (Task 41)
// ─────────────────────────────────────────

// GetNotificationsHandler — GET /api/pro/notifications
func GetNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	notifs, err := bdd.GetProNotifications(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetNotificationsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération notifications.")
		return
	}

	if notifs == nil {
		notifs = []models.ProNotification{}
	}
	sendJSON(w, http.StatusOK, notifs)
}

// MarkNotificationReadHandler — PATCH /api/pro/notifications/:id/read
func MarkNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID notification invalide.")
		return
	}

	if err := bdd.MarkAlertRead(id, idUser); err != nil {
		sendError(w, http.StatusNotFound, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MarkAllNotificationsReadHandler — PATCH /api/pro/notifications/read-all
func MarkAllNotificationsReadHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if err := bdd.MarkAllNotificationsRead(idUser); err != nil {
		fmt.Printf("[ERROR] MarkAllNotificationsReadHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur mise à jour notifications.")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ─────────────────────────────────────────
// MODULE B — ABONNEMENT (Task 42)
// ─────────────────────────────────────────

// GetSubscriptionHandler — GET /api/pro/subscription
func GetSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	sub, err := bdd.GetProSubscription(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetSubscriptionHandler : %v\n", err)
		sendError(w, http.StatusNotFound, "Aucun abonnement actif trouvé.")
		return
	}

	sendJSON(w, http.StatusOK, sub)
}

// UpgradeSubscriptionHandler — POST /api/pro/subscription/upgrade
// Body : { "plan": "PREMIUM" }
func UpgradeSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req models.UpgradeRequest
	if err := decodeBody(r, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	if req.Plan != "STANDARD" && req.Plan != "PREMIUM" {
		sendError(w, http.StatusBadRequest, "Plan invalide. Valeurs acceptées : STANDARD, PREMIUM")
		return
	}

	if err := bdd.UpgradeSubscription(idUser, req.Plan); err != nil {
		fmt.Printf("[ERROR] UpgradeSubscriptionHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur changement de plan : "+err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Plan mis à jour avec succès."})
}

// CancelSubscriptionHandler — POST /api/pro/subscription/cancel
func CancelSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if err := bdd.CancelSubscription(idUser); err != nil {
		fmt.Printf("[ERROR] CancelSubscriptionHandler : %v\n", err)
		sendError(w, http.StatusBadRequest, err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Abonnement annulé."})
}

// ─────────────────────────────────────────
// MODULE B — FACTURATION (Tasks 43-44)
// ─────────────────────────────────────────

// GetInvoicesHandler — GET /api/pro/billing/invoices
func GetInvoicesHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	invoices, err := bdd.GetProInvoices(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetInvoicesHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération factures.")
		return
	}

	if invoices == nil {
		invoices = []models.ProInvoice{}
	}
	sendJSON(w, http.StatusOK, invoices)
}

// DownloadInvoicePDFHandler — GET /api/pro/billing/invoices/:id/pdf
// Retourne le PDF de la facture en blob
// Dans cette implémentation, génère un PDF simple via les données BDD
// (Intégration avec une librairie PDF Go à compléter selon besoin)
func DownloadInvoicePDFHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Extraire l'ID de facture depuis l'URL
	// URL : /api/pro/billing/invoices/42/pdf
	path  := strings.TrimSuffix(r.URL.Path, "/pdf")
	parts := strings.Split(path, "/")
	if len(parts) == 0 {
		sendError(w, http.StatusBadRequest, "ID de facture manquant.")
		return
	}
	invoiceIdStr := parts[len(parts)-1]
	_ = invoiceIdStr // utilisé pour logging

	// Récupérer les données de la facture
	invoices, err := bdd.GetProInvoices(idUser)
	if err != nil || len(invoices) == 0 {
		sendError(w, http.StatusNotFound, "Facture introuvable.")
		return
	}

	// TODO : Générer un vrai PDF avec une librairie (ex: github.com/jung-kurt/gofpdf)
	// Pour l'instant, retourner les données JSON que le front convertira via window.print()
	// Le front billing.js gère le fallback via _printInvoice()

	// Vérifier si le document existe dans la table document
	docs, err := bdd.GetProDocuments(idUser)
	if err == nil && len(docs) > 0 {
		// Retourner le premier PDF trouvé (à affiner selon l'implémentation réelle)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "PDF non disponible côté serveur",
			"message": "Utilisez l'impression navigateur (fallback activé automatiquement)",
		})
		return
	}

	sendError(w, http.StatusNotFound, "PDF non disponible.")
}

// ─────────────────────────────────────────
// MODULE C — MARKETPLACE (Tasks 46-47)
// ─────────────────────────────────────────

// GetMarketItemsHandler — GET /api/pro/marketplace/items
// Query params : material, condition, page
func GetMarketItemsHandler(w http.ResponseWriter, r *http.Request) {
	// Pas de vérification d'authentification stricte — la marketplace est accessible
	// mais on récupère quand même l'id_user si disponible
	material  := r.URL.Query().Get("material")
	condition := r.URL.Query().Get("condition")

	items, err := bdd.GetProMarketItems(material, condition)
	if err != nil {
		fmt.Printf("[ERROR] GetMarketItemsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération annonces.")
		return
	}

	if items == nil {
		items = []models.MarketItem{}
	}
	sendJSON(w, http.StatusOK, items)
}

// GetMarketItemHandler — GET /api/pro/marketplace/items/:id
func GetMarketItemHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID invalide.")
		return
	}

	// Chercher l'annonce spécifique dans la liste filtrée par ID
	items, err := bdd.GetProMarketItems("", "")
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Erreur récupération annonce.")
		return
	}

	for _, item := range items {
		if item.IdAnnonce == id {
			sendJSON(w, http.StatusOK, item)
			return
		}
	}

	sendError(w, http.StatusNotFound, fmt.Sprintf("Annonce %d introuvable.", id))
}

// CreateCheckoutHandler — POST /api/pro/marketplace/checkout
// Body : { "item_id": 42, "quantity": 1 }
// Crée une session Stripe et retourne l'URL de redirection

func CreateCheckoutHandler(w http.ResponseWriter, r *http.Request) {
    idUser, err := middleware.GetUserIdFromContext(r)
    if err != nil {
        sendError(w, http.StatusUnauthorized, err.Error())
        return
    }

    var req models.CheckoutRequest
    if err := decodeBody(r, &req); err != nil {
        sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
        return
    }

    if req.ItemId == 0 {
        sendError(w, http.StatusBadRequest, "item_id requis.")
        return
    }
    if req.Quantity <= 0 {
        req.Quantity = 1
    }

    // Récupérer le prix de l'annonce
    items, err := bdd.GetProMarketItems("", "")
    if err != nil {
        sendError(w, http.StatusInternalServerError, "Erreur récupération annonce.")
        return
    }

    var targetItem *models.MarketItem
    for i := range items {
        if items[i].IdAnnonce == req.ItemId {
            targetItem = &items[i]
            break
        }
    }

    if targetItem == nil {
        sendError(w, http.StatusNotFound, fmt.Sprintf("Annonce %d introuvable.", req.ItemId))
        return
    }

    montant := targetItem.Price * float64(req.Quantity)

	// Prix négatif ou nul
	if targetItem.Price < 0 {
	    sendError(w, http.StatusBadRequest, "Le prix ne peut pas être négatif.")
	    return
	}

	if req.Quantity > 100 {
	    sendError(w, http.StatusBadRequest, "Quantité maximale dépassée (100).")
	    return
	}

	if targetItem.Price < 0 {
	    sendError(w, http.StatusBadRequest, "Le prix ne peut pas être négatif.")
	    return
	}

	if req.Quantity > 100 {
	    sendError(w, http.StatusBadRequest, "Quantité maximale dépassée (100).")
	    return
	}

    // Vérifier la clé Stripe AVANT de créer la commande en BDD
    stripeKey := os.Getenv("STRIPE_SECRET_KEY")
    if stripeKey == "" {
        fmt.Println("[ERROR] STRIPE_SECRET_KEY non définie")
        sendError(w, http.StatusInternalServerError, "Configuration paiement manquante.")
        return
    }

    // Créer l'enregistrement commande + paiement en BDD
    commandeId, err := bdd.CreateCheckoutRecord(idUser, req.ItemId, montant)
    if err != nil {
        fmt.Printf("[ERROR] CreateCheckoutHandler : %v\n", err)
        sendError(w, http.StatusInternalServerError, "Erreur création commande.")
        return
    }

    // Stripe
    stripe.Key = stripeKey

    unitAmount := int64(montant * 100)
    params := &stripe.CheckoutSessionParams{
        PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
                    Currency: stripe.String("eur"),
                    ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
                        Name: stripe.String(targetItem.Name),
                    },
                    UnitAmount: stripe.Int64(unitAmount),
                },
                Quantity: stripe.Int64(int64(req.Quantity)),
            },
        },
        Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
        SuccessURL: stripe.String("http://localhost/UpcycleConnect-/EspacePro/index.html#/billing?success=1&session_id={CHECKOUT_SESSION_ID}"),
        CancelURL:  stripe.String("http://localhost/UpcycleConnect-/EspacePro/index.html#/marketplace"),
        // Métadonnées pour le webhook
        Metadata: map[string]string{
            "commande_id": fmt.Sprintf("%d", commandeId),
            "user_id":     fmt.Sprintf("%d", idUser),
        },
    }

    s, err := stripeSession.New(params)
   if err != nil {
    fmt.Printf("[ERROR] Stripe session (commande_id=%d) : %v\n", commandeId, err)
    sendError(w, http.StatusInternalServerError, "Erreur création session Stripe.")
    return
}

    sendJSON(w, http.StatusOK, models.CheckoutResponse{
        StripeSessionUrl: s.URL,
    })
}



// ─────────────────────────────────────────
// MODULE C — CONTENEURS/CARTE (Tasks 48-49)
// ─────────────────────────────────────────

// GetContainersHandler — GET /api/pro/containers?lat=48.85&lng=2.35&radius=2000
func GetContainersHandler(w http.ResponseWriter, r *http.Request) {
	// lat, lng, radius sont utilisés pour filtrer côté Go si nécessaire
	// (le schéma SQL n'a pas de coordonnées géographiques pour l'instant)
	containers, err := bdd.GetProContainers()
	if err != nil {
		fmt.Printf("[ERROR] GetContainersHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération conteneurs.")
		return
	}

	if containers == nil {
		containers = []models.ProContainer{}
	}
	sendJSON(w, http.StatusOK, containers)
}

// GetContainerHandler — GET /api/pro/containers/:id
func GetContainerHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID conteneur invalide.")
		return
	}

	container, err := bdd.GetProContainerById(id)
	if err != nil {
		sendError(w, http.StatusNotFound, fmt.Sprintf("Conteneur %d introuvable.", id))
		return
	}

	sendJSON(w, http.StatusOK, container)
}

// ─────────────────────────────────────────
// MODULE C — SCANNER QR (Tasks 50-51)
// ─────────────────────────────────────────

// ValidateQRHandler — POST /api/pro/scanner/validate
// Body : { "qr_code": "UC-C047-OBJ-0012" }
func ValidateQRHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}
	_ = idUser // utilisé pour le logging

	var req models.ScanValidateRequest
	if err := decodeBody(r, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	if strings.TrimSpace(req.QrCode) == "" {
		sendError(w, http.StatusBadRequest, "qr_code requis.")
		return
	}

	result, err := bdd.ValidateQRCode(req.QrCode)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Code QR invalide : "+err.Error())
		return
	}

	sendJSON(w, http.StatusOK, result)
}

// ConfirmCollectionHandler — POST /api/pro/scanner/collect
// Body : { "object_id": "OBJ-0012", "container_id": "C-047" }
func ConfirmCollectionHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req models.CollectRequest
	if err := decodeBody(r, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	if req.ObjectId == "" || req.ContainerId == "" {
		sendError(w, http.StatusBadRequest, "object_id et container_id requis.")
		return
	}

	if err := bdd.ConfirmCollection(idUser, req.ObjectId, req.ContainerId); err != nil {
		sendError(w, http.StatusBadRequest, err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Collecte confirmée. Score Upcycling mis à jour.",
	})
}

// ─────────────────────────────────────────
// MODULE D — PROJETS PRO (Tasks 52-55)
// ─────────────────────────────────────────

// GetProjectsHandler — GET /api/pro/projects
func GetProjectsHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	projects, err := bdd.GetProProjects(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetProjectsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération projets.")
		return
	}

	if projects == nil {
		projects = []models.ProProject{}
	}
	sendJSON(w, http.StatusOK, projects)
}

// GetProjectHandler — GET /api/pro/projects/:id
func GetProjectHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID projet invalide.")
		return
	}

	project, err := bdd.GetProProjectById(id, idUser)
	if err != nil {
		sendError(w, http.StatusNotFound, fmt.Sprintf("Projet %d introuvable.", id))
		return
	}

	sendJSON(w, http.StatusOK, project)
}

// CreateProjectHandler — POST /api/pro/projects
func CreateProjectHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var dto models.ProjectCreateDTO
	if err := decodeBody(r, &dto); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	if strings.TrimSpace(dto.Name) == "" {
		sendError(w, http.StatusBadRequest, "Le nom du projet est requis.")
		return
	}

	// Calculer et loguer l'impact (données utiles pour les logs)
	if dto.Material != "" && dto.WeightKg > 0 {
		impact := bdd.CalculateImpact(dto.WeightKg, dto.Material)
		fmt.Printf("[INFO] CreateProjectHandler — impact estimé : CO₂=%.2fkg, score=%d pts\n",
			impact.Co2Kg, impact.ScorePoints)
	}

	id, err := bdd.CreateProProject(idUser, dto)
	if err != nil {
		fmt.Printf("[ERROR] CreateProjectHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur création projet.")
		return
	}

	sendJSON(w, http.StatusCreated, map[string]interface{}{
		"id":      id,
		"message": "Projet créé avec succès.",
	})
}

// UpdateProjectHandler — PUT /api/pro/projects/:id
func UpdateProjectHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID projet invalide.")
		return
	}

	var dto models.ProjectCreateDTO
	if err := decodeBody(r, &dto); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	if err := bdd.UpdateProProject(id, idUser, dto); err != nil {
		sendError(w, http.StatusNotFound, err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Projet mis à jour."})
}

// UpdateProjectStepHandler — PATCH /api/pro/projects/:id/step
// Body : { "step": "TRANSFORMATION" }
func UpdateProjectStepHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID projet invalide.")
		return
	}

	var dto models.ProjectUpdateStepDTO
	if err := decodeBody(r, &dto); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	validSteps := map[string]bool{
		"COLLECTE": true, "TRANSFORMATION": true, "VENTE": true, "TERMINE": true,
	}
	if !validSteps[dto.Step] {
		sendError(w, http.StatusBadRequest,
			"Étape invalide. Valeurs : COLLECTE, TRANSFORMATION, VENTE, TERMINE")
		return





	}

	// L'étape est stockée dans la description pour l'instant (schéma à étendre)
	// On met à jour le titre avec le préfixe d'étape
	/*updateDto := models.ProjectCreateDTO{
		Name:        fmt.Sprintf("[%s] Projet %d", dto.Step, id),
		Description: dto.Step,
	}

	if err := bdd.UpdateProProject(id, idUser, updateDto); err != nil {
		sendError(w, http.StatusNotFound, err.Error())
		return
	}*/


	if err := bdd.UpdateProProjectStep(id, idUser, dto.Step); err != nil {
    sendError(w, http.StatusNotFound, err.Error())
    return
	}


	// Si passage en VENTE → créer une annonce automatiquement
    if dto.Step == "VENTE" {
        projet, err := bdd.GetProProjectById(id, idUser)
        if err == nil {
            annonceId, err := bdd.CreateAnnonceFromProject(idUser, projet)
            if err != nil {
                fmt.Printf("[WARN] CreateAnnonceFromProject : %v\n", err)
            } else {
                fmt.Printf("[INFO] Annonce %d créée depuis projet %d\n", annonceId, id)
            }
        }
    }


	sendJSON(w, http.StatusOK, map[string]string{
		"message": fmt.Sprintf("Étape mise à jour : %s", dto.Step),
		"step":    dto.Step,
	})
}

// DeleteProjectHandler — DELETE /api/pro/projects/:id
func DeleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	id, err := parseIDFromPath(r)
	if err != nil {
		sendError(w, http.StatusBadRequest, "ID projet invalide.")
		return
	}

	if err := bdd.DeleteProProject(id, idUser); err != nil {
		sendError(w, http.StatusNotFound, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ─────────────────────────────────────────
// MODULE D — PROFIL PRO (Tasks 56-58)
// ─────────────────────────────────────────

// GetProfileHandler — GET /api/pro/profile
func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	profile, err := bdd.GetProProfile(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetProfileHandler : %v\n", err)
		sendError(w, http.StatusNotFound, "Profil Pro introuvable.")
		return
	}

	sendJSON(w, http.StatusOK, profile)
}

// UpdateProfileHandler — PUT /api/pro/profile
func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var dto models.ProfileUpdateDTO
	if err := decodeBody(r, &dto); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	// Validation SIRET : 14 chiffres
	if dto.Siret != "" {
		cleaned := strings.ReplaceAll(dto.Siret, " ", "")
		if len(cleaned) != 14 {
			sendError(w, http.StatusBadRequest, "Le SIRET doit contenir 14 chiffres.")
			return
		}
	}

	if err := bdd.UpdateProProfile(idUser, dto); err != nil {
		fmt.Printf("[ERROR] UpdateProfileHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur mise à jour profil.")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Profil mis à jour."})
}

// GetDocumentsHandler — GET /api/pro/profile/documents
func GetDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	docs, err := bdd.GetProDocuments(idUser)
	if err != nil {
		fmt.Printf("[ERROR] GetDocumentsHandler : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur récupération documents.")
		return
	}

	if docs == nil {
		docs = []models.ProDocument{}
	}
	sendJSON(w, http.StatusOK, docs)
}

// UploadDocumentHandler — POST /api/pro/profile/documents
// Traite un upload multipart/form-data (fichier PDF/image)
// Champs : file (File), type (string)
func UploadDocumentHandler(w http.ResponseWriter, r *http.Request) {
	idUser, err := middleware.GetUserIdFromContext(r)
	if err != nil {
		sendError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Parser le formulaire multipart (max 5 Mo)
	const maxSize = 5 << 20 // 5 MB
	if err := r.ParseMultipartForm(maxSize); err != nil {
		sendError(w, http.StatusBadRequest, "Fichier trop volumineux (max 5 Mo).")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		sendError(w, http.StatusBadRequest, "Fichier manquant dans le formulaire.")
		return
	}
	defer file.Close()

	docType := r.FormValue("type")
	if docType == "" {
		docType = "autre"
	}

	// Validation du type MIME
	allowedTypes := map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/png":       true,
	}
	contentType := header.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		sendError(w, http.StatusBadRequest,
			"Type de fichier non supporté. Formats acceptés : PDF, JPG, PNG.")
		return
	}

	// TODO : Uploader le fichier vers un stockage Cloud (S3, OVH Object Storage, etc.)
	// Pour l'instant, construire l'URL simulée
	// En production : url, err = storage.Upload(file, header.Filename)

	urlPdf := fmt.Sprintf("/uploads/docs/%d_%s", idUser, header.Filename)

	// Enregistrer la référence en BDD
	docId, err := bdd.SaveProDocument(idUser, docType, urlPdf, header.Filename)
	if err != nil {
		fmt.Printf("[ERROR] UploadDocumentHandler SaveProDocument : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur enregistrement document.")
		return
	}

	fmt.Printf("[INFO] UploadDocumentHandler — doc %d uploadé : %s (user=%d, type=%s)\n",
		docId, header.Filename, idUser, docType)

	sendJSON(w, http.StatusCreated, models.ProDocument{
		Id:         docId,
		Type:       docType,
		Label:      header.Filename,
		Filename:   header.Filename,
		Status:     "pending",
		UploadedAt: "today",
		UrlPdf:     urlPdf,
		IdUser:     idUser,
	})
}

// ─────────────────────────────────────────
// CALCUL IMPACT (Task 55) — Endpoint utilitaire
// ─────────────────────────────────────────

// CalculateImpactHandler — GET /api/pro/impact?material=bois&weight=14.5
// Retourne l'impact CO₂ calculé côté serveur (même algorithme que le front)
func CalculateImpactHandler(w http.ResponseWriter, r *http.Request) {
	material   := r.URL.Query().Get("material")
	weightStr  := r.URL.Query().Get("weight")

	if material == "" || weightStr == "" {
		sendError(w, http.StatusBadRequest, "Paramètres requis : material, weight")
		return
	}

	weight, err := strconv.ParseFloat(weightStr, 64)
	if err != nil || weight <= 0 {
		sendError(w, http.StatusBadRequest, "weight doit être un nombre positif.")
		return
	}

	impact := bdd.CalculateImpact(weight, material)
	sendJSON(w, http.StatusOK, impact)
}

