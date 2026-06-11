package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
	"upcycleconnect/models"
)

func setCORS(w http.ResponseWriter, method string) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", method+", OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func CreateAnnonceParticulier(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "POST")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	var a models.Annonce
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil { http.Error(w, "JSON invalide", 400); return }
	if err := bdd.CreateAnnonce(a); err != nil { http.Error(w, err.Error(), 500); return }
	w.WriteHeader(201)
	fmt.Fprint(w, "annonce creee")
}

func UpdateAnnonceParticulier(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "PUT")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil { http.Error(w, "id invalide", 400); return }
	var a models.Annonce
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil { http.Error(w, "JSON invalide", 400); return }
	if err := bdd.UpdateAnnonce(id, a); err != nil { http.Error(w, err.Error(), 500); return }
	w.WriteHeader(200)
}

func DeleteAnnonceParticulier(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "DELETE")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil { http.Error(w, "id invalide", 400); return }
	if err := bdd.DeleteAnnonce(id); err != nil { http.Error(w, err.Error(), 500); return }
	fmt.Fprint(w, "annonce supprimee")
}

func CreateDepotParticulier(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "POST")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	var d models.DepotBox
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil { http.Error(w, "JSON invalide", 400); return }
	if err := bdd.CreateDepot(d); err != nil { http.Error(w, err.Error(), 500); return }
	w.WriteHeader(201)
	fmt.Fprint(w, "depot cree")
}

func CreateInscription(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "POST")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	idEvent, err := strconv.Atoi(r.PathValue("idEvent"))
	if err != nil { http.Error(w, "id event invalide", 400); return }
	var body struct {
		IdUser int `json:"id_user"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "JSON invalide", 400); return }
	if err := bdd.CreateInscription(body.IdUser, idEvent); err != nil { http.Error(w, err.Error(), 500); return }
	w.WriteHeader(201)
	fmt.Fprint(w, "inscription enregistree")
}

func DeleteInscriptionHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "DELETE")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	idEvent, _ := strconv.Atoi(r.PathValue("idEvent"))
	idUser, _ := strconv.Atoi(r.PathValue("idUser"))
	if err := bdd.DeleteInscription(idUser, idEvent); err != nil { http.Error(w, err.Error(), 500); return }
	fmt.Fprint(w, "inscription annulee")
}

func GetPlanning(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	idUser, _ := strconv.Atoi(r.PathValue("idUser"))
	events, err := bdd.GetInscriptions(idUser)
	if err != nil { http.Error(w, err.Error(), 500); return }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func GetDepotsUser(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	idUser, _ := strconv.Atoi(r.PathValue("idUser"))
	depots, err := bdd.GetDepotsByUser(idUser)
	if err != nil { http.Error(w, err.Error(), 500); return }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(depots)
}

func ChangePasswordHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "PUT")
	if r.Method == "OPTIONS" { w.WriteHeader(200); return }
	idUser, _ := strconv.Atoi(r.PathValue("idUser"))
	var body struct {
		AncienMdp  string `json:"ancien_mdp"`
		NouveauMdp string `json:"nouveau_mdp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "JSON invalide", 400); return }
	if err := bdd.ChangePassword(idUser, body.AncienMdp, body.NouveauMdp); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	fmt.Fprint(w, "mot de passe modifie")
}

func GetArticlesHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	articles, err := bdd.GetArticles()
	if err != nil { http.Error(w, err.Error(), 500); return }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(articles)
}
