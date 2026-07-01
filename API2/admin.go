package main

import (
	"fmt"
	"net/http"
	"upcycleconnect/admin"
	"upcycleconnect/bdd"
	"upcycleconnect/handlers"
	"upcycleconnect/middleware"

	"github.com/joho/godotenv"
)

func Health(w http.ResponseWriter, r *http.Request) {
	err := bdd.Db.Ping()
	if err != nil {
		panic(err)
	}
	fmt.Fprintln(w, "ping à la bdd")
}

// proRoute — enveloppe un handler Pro dans le middleware JWT
// Remplace RequirePro() qui utilisait un ServeMux séparé
func proRoute(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		middleware.RequirePro(h).ServeHTTP(w, r)
	}
}

func main() {
	bdd.Db = bdd.NewDB()

	if err := godotenv.Load(); err != nil {
        fmt.Println("[INFO] Pas de fichier .env, variables système utilisées")}

	// ──────────────────────────────────────────
	// HEALTH
	// ──────────────────────────────────────────
	http.HandleFunc("GET /{$}", Health)

	// ──────────────────────────────────────────
	// AUTH (public — pas de JWT requis)
	// ──────────────────────────────────────────
	http.HandleFunc("POST /login", admin.Login)
	http.HandleFunc("OPTIONS /login", admin.Login)

	// Login Espace Pro (génère un JWT)
	http.HandleFunc("POST /api/auth/login", handlers.LoginHandler)
	http.HandleFunc("OPTIONS /api/auth/login", func(w http.ResponseWriter, r *http.Request) {
	    w.Header().Set("Access-Control-Allow-Origin", "*")
	    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	    w.WriteHeader(http.StatusNoContent)
	})
	http.HandleFunc("POST /api/auth/refresh", handlers.RefreshHandler)
	http.HandleFunc("OPTIONS /api/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
	    w.Header().Set("Access-Control-Allow-Origin", "*")
	    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	    w.WriteHeader(http.StatusNoContent)
	})
	http.HandleFunc("POST /api/auth/logout", handlers.LogoutHandler)

	// ──────────────────────────────────────────
	// ADMIN — Routes existantes (inchangées)
	// ──────────────────────────────────────────

	// Utilisateurs
	http.HandleFunc("GET /admin/users", admin.GetAllUsers)
	http.HandleFunc("POST /admin/users/add", admin.CreateUser)
	http.HandleFunc("OPTIONS /admin/users/add", admin.CreateUser)
	http.HandleFunc("DELETE /admin/users/delete/{id}", admin.DeleteUser)
	http.HandleFunc("OPTIONS /admin/users/delete/{id}", admin.DeleteUser)
	http.HandleFunc("PUT /admin/users/modify/{id}", admin.UpdateUser)
	http.HandleFunc("OPTIONS /admin/users/modify/{id}", admin.UpdateUser)
	http.HandleFunc("GET /admin/users/role/{role}", admin.GetUserByRole)
	http.HandleFunc("GET /admin/users/search", admin.GetUserByName)

	// Categories
	http.HandleFunc("GET /admin/categories", admin.GetAllCategories)
	http.HandleFunc("POST /admin/categories/add", admin.CreateCategorie)
	http.HandleFunc("OPTIONS /admin/categories/add", admin.CreateCategorie)
	http.HandleFunc("PUT /admin/categories/modify/{id}", admin.UpdateCategorie)
	http.HandleFunc("OPTIONS /admin/categories/modify/{id}", admin.UpdateCategorie)
	http.HandleFunc("DELETE /admin/categories/delete/{id}", admin.DeleteCategorie)
	http.HandleFunc("OPTIONS /admin/categories/delete/{id}", admin.DeleteCategorie)

	// Annonces
	http.HandleFunc("GET /admin/annonces", admin.GetAllAnnonces)
	http.HandleFunc("PUT /admin/annonces/validate/{id}", admin.ValidateAnnonce)
	http.HandleFunc("OPTIONS /admin/annonces/validate/{id}", admin.ValidateAnnonce)
	http.HandleFunc("PUT /admin/annonces/refuse/{id}", admin.RefuseAnnonce)
	http.HandleFunc("OPTIONS /admin/annonces/refuse/{id}", admin.RefuseAnnonce)
	http.HandleFunc("DELETE /admin/annonces/delete/{id}", admin.DeleteAnnonce)
	http.HandleFunc("OPTIONS /admin/annonces/delete/{id}", admin.DeleteAnnonce)

	// Evenements
	http.HandleFunc("GET /admin/evenements", admin.GetAllEvenements)
	http.HandleFunc("POST /admin/evenements/add", admin.CreateEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/add", admin.CreateEvenement)
	http.HandleFunc("PUT /admin/evenements/validate/{id}", admin.ValidateEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/validate/{id}", admin.ValidateEvenement)
	http.HandleFunc("PUT /admin/evenements/refuse/{id}", admin.RefuseEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/refuse/{id}", admin.RefuseEvenement)
	http.HandleFunc("DELETE /admin/evenements/delete/{id}", admin.DeleteEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/delete/{id}", admin.DeleteEvenement)

	// Conteneurs
	http.HandleFunc("GET /admin/conteneurs", admin.GetAllConteneurs)
	http.HandleFunc("POST /admin/conteneurs/add", admin.CreateConteneur)
	http.HandleFunc("OPTIONS /admin/conteneurs/add", admin.CreateConteneur)
	http.HandleFunc("PUT /admin/conteneurs/modify/{id}", admin.UpdateConteneur)
	http.HandleFunc("OPTIONS /admin/conteneurs/modify/{id}", admin.UpdateConteneur)
	http.HandleFunc("DELETE /admin/conteneurs/delete/{id}", admin.DeleteConteneur)
	http.HandleFunc("OPTIONS /admin/conteneurs/delete/{id}", admin.DeleteConteneur)

	// Depots
	http.HandleFunc("GET /admin/depots", admin.GetAllDepots)
	http.HandleFunc("PUT /admin/depots/validate/{id}", admin.ValidateDepot)
	http.HandleFunc("OPTIONS /admin/depots/validate/{id}", admin.ValidateDepot)

	// Commandes
	http.HandleFunc("GET /admin/commandes", admin.GetAllCommandes)

	// Abonnements
	http.HandleFunc("GET /admin/abonnements", admin.GetAllAbonnements)
	http.HandleFunc("PUT /admin/abonnements/statut/{id}", admin.UpdateAbonnementStatut)
	http.HandleFunc("OPTIONS /admin/abonnements/statut/{id}", admin.UpdateAbonnementStatut)
	http.HandleFunc("DELETE /admin/abonnements/delete/{id}", admin.DeleteAbonnement)
	http.HandleFunc("OPTIONS /admin/abonnements/delete/{id}", admin.DeleteAbonnement)

	// Stats financières
	http.HandleFunc("GET /admin/stats", admin.GetStats)

	// Plans d'abonnement
	http.HandleFunc("GET /admin/plans", admin.GetAllPlans)
	http.HandleFunc("POST /admin/plans/add", admin.CreatePlan)
	http.HandleFunc("OPTIONS /admin/plans/add", admin.CreatePlan)
	http.HandleFunc("PUT /admin/plans/modify/{id}", admin.UpdatePlan)
	http.HandleFunc("OPTIONS /admin/plans/modify/{id}", admin.UpdatePlan)
	http.HandleFunc("DELETE /admin/plans/delete/{id}", admin.DeletePlan)
	http.HandleFunc("OPTIONS /admin/plans/delete/{id}", admin.DeletePlan)

	// ──────────────────────────────────────────
	// PARTICULIER — Routes existantes (inchangées)
	// ──────────────────────────────────────────
	http.HandleFunc("POST /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("OPTIONS /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("POST /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("OPTIONS /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("POST /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("OPTIONS /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("GET /particulier/planning/{idUser}", admin.GetPlanning)
	http.HandleFunc("GET /particulier/depots/{idUser}", admin.GetDepotsUser)

	// ──────────────────────────────────────────
	// ESPACE PRO — Nouvelles routes (JWT requis)
	// ──────────────────────────────────────────


	http.HandleFunc("POST /api/auth/register", handlers.RegisterHandler)
	http.HandleFunc("OPTIONS /api/auth/register", func(w http.ResponseWriter, r *http.Request) {
	    w.Header().Set("Access-Control-Allow-Origin", "*")
	    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	    w.WriteHeader(http.StatusNoContent)
	})

	// Dashboard 
	http.HandleFunc("GET /api/pro/dashboard/kpis", proRoute(handlers.GetDashboardKPIsHandler))
	http.HandleFunc("GET /api/pro/dashboard/alerts", proRoute(handlers.GetDashboardAlertsHandler))
	http.HandleFunc("GET /api/pro/dashboard/activity", proRoute(handlers.GetDashboardActivityHandler))
	http.HandleFunc("PATCH /api/pro/dashboard/alerts/{id}/read", proRoute(handlers.MarkAlertReadHandler))

	// Notifications 
	http.HandleFunc("GET /api/pro/notifications", proRoute(handlers.GetNotificationsHandler))
	http.HandleFunc("PATCH /api/pro/notifications/{id}/read", proRoute(handlers.MarkNotificationReadHandler))
	http.HandleFunc("PATCH /api/pro/notifications/read-all", proRoute(handlers.MarkAllNotificationsReadHandler))

	// Abonnement 
	http.HandleFunc("GET /api/pro/subscription", proRoute(handlers.GetSubscriptionHandler))
	http.HandleFunc("POST /api/pro/subscription/upgrade", proRoute(handlers.UpgradeSubscriptionHandler))
	http.HandleFunc("POST /api/pro/subscription/cancel", proRoute(handlers.CancelSubscriptionHandler))

	// Facturation 
	http.HandleFunc("GET /api/pro/billing/invoices", proRoute(handlers.GetInvoicesHandler))
	http.HandleFunc("GET /api/pro/billing/invoices/{id}/pdf", proRoute(handlers.DownloadInvoicePDFHandler))

	// Marketplace 
	http.HandleFunc("GET /api/pro/marketplace/items", proRoute(handlers.GetMarketItemsHandler))
	http.HandleFunc("GET /api/pro/marketplace/items/{id}", proRoute(handlers.GetMarketItemHandler))
	http.HandleFunc("POST /api/pro/marketplace/checkout", proRoute(handlers.CreateCheckoutHandler))

	// Conteneurs / Carte 
	http.HandleFunc("GET /api/pro/containers", proRoute(handlers.GetContainersHandler))
	http.HandleFunc("GET /api/pro/containers/{id}", proRoute(handlers.GetContainerHandler))

	// Scanner QR 
	http.HandleFunc("POST /api/pro/scanner/validate", proRoute(handlers.ValidateQRHandler))
	http.HandleFunc("POST /api/pro/scanner/collect", proRoute(handlers.ConfirmCollectionHandler))

	// Projets Pro 
	http.HandleFunc("GET /api/pro/projects", proRoute(handlers.GetProjectsHandler))
	http.HandleFunc("POST /api/pro/projects", proRoute(handlers.CreateProjectHandler))
	http.HandleFunc("GET /api/pro/projects/{id}", proRoute(handlers.GetProjectHandler))
	http.HandleFunc("PUT /api/pro/projects/{id}", proRoute(handlers.UpdateProjectHandler))
	http.HandleFunc("PATCH /api/pro/projects/{id}/step", proRoute(handlers.UpdateProjectStepHandler))
	http.HandleFunc("DELETE /api/pro/projects/{id}", proRoute(handlers.DeleteProjectHandler))

	// Profil Pro 
	http.HandleFunc("GET /api/pro/profile", proRoute(handlers.GetProfileHandler))
	http.HandleFunc("PUT /api/pro/profile", proRoute(handlers.UpdateProfileHandler))
	http.HandleFunc("GET /api/pro/profile/documents", proRoute(handlers.GetDocumentsHandler))
	http.HandleFunc("POST /api/pro/profile/documents", proRoute(handlers.UploadDocumentHandler))

	// Impact CO2 
	http.HandleFunc("GET /api/pro/impact", proRoute(handlers.CalculateImpactHandler))

	// OPTIONS globales pour les routes Pro (CORS preflight)
	http.HandleFunc("OPTIONS /api/pro/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusNoContent)
	})

	
	http.HandleFunc("POST /api/webhook/stripe", handlers.StripeWebhookHandler)
	

	// Webhook Stripe — pas de JWT, pas de CORS

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == http.MethodOptions {
    	    w.WriteHeader(http.StatusNoContent)
    	    return
    	}


	// Webhook Stripe — pas de JWT, pas de CORS
    	// Toutes les autres méthodes → router normalement
    	http.DefaultServeMux.ServeHTTP(w, r)
	})

	fmt.Println("Serveur lancé sur : http://localhost:8080")
	http.ListenAndServe(":8080", handler)
}
