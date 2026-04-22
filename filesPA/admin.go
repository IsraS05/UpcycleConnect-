package main

import (
	"fmt"
	"net/http"
	"upcycleconnect/admin"
	"upcycleconnect/bdd"
)

func Health(w http.ResponseWriter, r *http.Request) {
	err := bdd.Db.Ping()
	if err != nil {
		panic(err)
	}
	fmt.Fprintln(w, "ping à la bdd")
}

func main() {
	bdd.Db = bdd.NewDB()
	http.HandleFunc("GET /{$}", Health)

	// Login
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

	// ── PARTICULIER ──
	http.HandleFunc("POST /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("OPTIONS /particulier/annonces/add", admin.CreateAnnonceParticulier)
	http.HandleFunc("POST /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("OPTIONS /particulier/depot", admin.CreateDepotParticulier)
	http.HandleFunc("POST /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("OPTIONS /particulier/inscription/{idEvent}", admin.CreateInscription)
	http.HandleFunc("GET /particulier/planning/{idUser}", admin.GetPlanning)
	http.HandleFunc("GET /particulier/depots/{idUser}", admin.GetDepotsUser)

	fmt.Println("Serveur lancé sur : http://localhost:8081")
	http.ListenAndServe(":8081", nil)
}
