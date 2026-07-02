package main

import (
	"fmt"
	"net/http"
	"upcycleconnect/admin"
	"upcycleconnect/bdd"
)

func Health(w http.ResponseWriter, r *http.Request) {
	if err := bdd.Db.Ping(); err != nil { panic(err) }
	fmt.Fprintln(w, "ok")
}

func main() {
	bdd.Db = bdd.NewDB()
	http.HandleFunc("GET /{$}", Health)

	// Swagger
	http.HandleFunc("GET /swagger", serveSwagger)
	http.HandleFunc("GET /swagger/", serveSwagger)
	http.HandleFunc("GET /swagger/openapi.yaml", serveOpenAPI)

	// Auth
	http.HandleFunc("POST /login", admin.Login)
	http.HandleFunc("OPTIONS /login", admin.Login)

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

	// Articles
	http.HandleFunc("GET /admin/articles", admin.GetArticlesHandler)

	//PARTICULIER
	http.HandleFunc("POST /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("OPTIONS /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("PUT /particulier/annonces/modify/{id}", admin.UpdateAnnonceParticulier)
	http.HandleFunc("OPTIONS /particulier/annonces/modify/{id}", admin.UpdateAnnonceParticulier)
	http.HandleFunc("DELETE /particulier/annonces/delete/{id}", admin.DeleteAnnonceParticulier)
	http.HandleFunc("OPTIONS /particulier/annonces/delete/{id}", admin.DeleteAnnonceParticulier)
	http.HandleFunc("POST /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("OPTIONS /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("GET /particulier/depots/{idUser}", admin.GetDepotsUser)
	http.HandleFunc("POST /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("OPTIONS /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("DELETE /particulier/inscription/{idEvent}/{idUser}", admin.DeleteInscriptionHandler)
	http.HandleFunc("OPTIONS /particulier/inscription/{idEvent}/{idUser}", admin.DeleteInscriptionHandler)
	http.HandleFunc("GET /particulier/planning/{idUser}", admin.GetPlanning)
	http.HandleFunc("PUT /particulier/password/{idUser}", admin.ChangePasswordHandler)
	http.HandleFunc("OPTIONS /particulier/password/{idUser}", admin.ChangePasswordHandler)

	// Tutoriel + multilingue
	http.HandleFunc("PUT /particulier/tutoriel/{idUser}", admin.MarkTutorielHandler)
	http.HandleFunc("OPTIONS /particulier/tutoriel/{idUser}", admin.MarkTutorielHandler)
	http.HandleFunc("GET /dictionnaire/{langue}", admin.GetDictionnaireHandler)

	// Forum
	http.HandleFunc("GET /forum/topics", admin.GetTopicsHandler)
	http.HandleFunc("POST /forum/topics", admin.CreateTopicHandler)
	http.HandleFunc("OPTIONS /forum/topics", admin.CreateTopicHandler)
	http.HandleFunc("GET /forum/topics/{idTopic}/messages", admin.GetMessagesHandler)
	http.HandleFunc("POST /forum/topics/{idTopic}/messages", admin.CreateMessageHandler)
	http.HandleFunc("OPTIONS /forum/topics/{idTopic}/messages", admin.CreateMessageHandler)

	// --- Conseils & News ---
	http.HandleFunc("GET /admin/conseils", admin.GetAllConseils)
	http.HandleFunc("GET /salarie/conseils/{id}", admin.GetConseilsBySalarie)
	http.HandleFunc("POST /salarie/conseils/add", admin.CreateConseil)
	http.HandleFunc("OPTIONS /salarie/conseils/add", admin.CreateConseil)
	http.HandleFunc("PUT /salarie/conseils/modify/{id}", admin.UpdateConseil)
	http.HandleFunc("OPTIONS /salarie/conseils/modify/{id}", admin.UpdateConseil)
	http.HandleFunc("PUT /salarie/conseils/publish/{id}", admin.PublishConseil)
	http.HandleFunc("OPTIONS /salarie/conseils/publish/{id}", admin.PublishConseil)
	http.HandleFunc("DELETE /salarie/conseils/delete/{id}", admin.DeleteConseil)
	http.HandleFunc("OPTIONS /salarie/conseils/delete/{id}", admin.DeleteConseil)

	// --- Forums (suivi & modération) ---
	http.HandleFunc("GET /salarie/forum/sujets", admin.GetAllForumSujets)
	http.HandleFunc("GET /salarie/forum/sujet/{id}/messages", admin.GetMessagesBySujet)
	http.HandleFunc("GET /salarie/forum/signalements", admin.GetMessagesSignales)
	http.HandleFunc("PUT /salarie/forum/message/hide/{id}", admin.HideMessage)
	http.HandleFunc("OPTIONS /salarie/forum/message/hide/{id}", admin.HideMessage)
	http.HandleFunc("PUT /salarie/forum/message/dismiss/{id}", admin.DismissSignalement)
	http.HandleFunc("OPTIONS /salarie/forum/message/dismiss/{id}", admin.DismissSignalement)
	http.HandleFunc("PUT /salarie/forum/sujet/close/{id}", admin.CloseSujet)
	http.HandleFunc("OPTIONS /salarie/forum/sujet/close/{id}", admin.CloseSujet)

	// --- Planning & Formations du salarié ---
	http.HandleFunc("GET /salarie/planning/{id}", admin.GetPlanningSalarie)
	http.HandleFunc("POST /salarie/formations/add", admin.CreateFormationSalarie)
	http.HandleFunc("OPTIONS /salarie/formations/add", admin.CreateFormationSalarie)


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


	

	fmt.Println("Serveur lancé sur : http://localhost:8081")
	fmt.Println("Swagger UI      : http://localhost:8081/swagger")
	http.ListenAndServe(":8081", nil)
}
