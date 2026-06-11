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
	http.HandleFunc("DELETE /admin/categories/delete/{id}", admin.DeleteCategorie)
	http.HandleFunc("OPTIONS /admin/categories/delete/{id}", admin.DeleteCategorie)

	// Annonces
	http.HandleFunc("GET /admin/annonces", admin.GetAllAnnonces)
	http.HandleFunc("PUT /admin/annonces/validate/{id}", admin.ValidateAnnonce)
	http.HandleFunc("OPTIONS /admin/annonces/validate/{id}", admin.ValidateAnnonce)
	http.HandleFunc("PUT /admin/annonces/refuse/{id}", admin.RefuseAnnonce)
	http.HandleFunc("OPTIONS /admin/annonces/refuse/{id}", admin.RefuseAnnonce)

	// Evenements
	http.HandleFunc("GET /admin/evenements", admin.GetAllEvenements)
	http.HandleFunc("POST /admin/evenements/add", admin.CreateEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/add", admin.CreateEvenement)
	http.HandleFunc("PUT /admin/evenements/validate/{id}", admin.ValidateEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/validate/{id}", admin.ValidateEvenement)
	http.HandleFunc("PUT /admin/evenements/refuse/{id}", admin.RefuseEvenement)
	http.HandleFunc("OPTIONS /admin/evenements/refuse/{id}", admin.RefuseEvenement)

	// Conteneurs
	http.HandleFunc("GET /admin/conteneurs", admin.GetAllConteneurs)
	http.HandleFunc("POST /admin/conteneurs/add", admin.CreateConteneur)
	http.HandleFunc("OPTIONS /admin/conteneurs/add", admin.CreateConteneur)
	http.HandleFunc("PUT /admin/conteneurs/modify/{id}", admin.UpdateConteneur)
	http.HandleFunc("OPTIONS /admin/conteneurs/modify/{id}", admin.UpdateConteneur)

	// Depots
	http.HandleFunc("GET /admin/depots", admin.GetAllDepots)
	http.HandleFunc("PUT /admin/depots/validate/{id}", admin.ValidateDepot)
	http.HandleFunc("OPTIONS /admin/depots/validate/{id}", admin.ValidateDepot)

	// Commandes
	http.HandleFunc("GET /admin/commandes", admin.GetAllCommandes)
	http.HandleFunc("GET /admin/abonnements", admin.GetAllAbonnements)

	// Articles
	http.HandleFunc("GET /admin/articles", admin.GetArticlesHandler)

	// Particulier
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

	fmt.Println("Serveur lancé sur : http://localhost:8081")
	fmt.Println("Swagger UI      : http://localhost:8081/swagger")
	http.ListenAndServe(":8081", nil)
}
