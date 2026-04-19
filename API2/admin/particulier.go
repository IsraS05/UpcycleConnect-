package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
	"upcycleconnect/models"
)

// POST /particulier/annonces/add
func CreateAnnonceParticulier(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var a models.Annonce
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.CreateAnnonce(a); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("erreur CreateAnnonce:", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "annonce créée")
}

// POST /particulier/depot
func CreateDepotParticulier(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var d models.DepotBox
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.CreateDepot(d); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("erreur CreateDepot:", err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "dépôt créé")
}

// POST /particulier/inscription/{idEvent}
func CreateInscription(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	idEvent, err := strconv.Atoi(r.PathValue("idEvent"))
	if err != nil {
		http.Error(w, "id event invalide", http.StatusBadRequest)
		return
	}

	var body struct {
		IdUser int `json:"id_user"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.CreateInscription(body.IdUser, idEvent); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "inscription enregistrée")
}

// GET /particulier/planning/{idUser}
func GetPlanning(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	idUser, err := strconv.Atoi(r.PathValue("idUser"))
	if err != nil {
		http.Error(w, "id user invalide", http.StatusBadRequest)
		return
	}

	events, err := bdd.GetInscriptions(idUser)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GET /particulier/depots/{idUser}
func GetDepotsUser(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

    idUser, err := strconv.Atoi(r.PathValue("idUser"))
    if err != nil {
        http.Error(w, "id invalide", http.StatusBadRequest)
        return
    }

    depots, err := bdd.GetDepotsByUser(idUser)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(depots)
}