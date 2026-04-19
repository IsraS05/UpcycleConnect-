package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
	"upcycleconnect/models"
)

func GetAllConteneurs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	conteneurs, err := bdd.GetConteneurs()
	if err != nil {
		http.Error(w, "erreur de récupération des conteneurs", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(conteneurs)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func CreateConteneur(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var c models.BoxConteneur
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.CreateConteneur(c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "conteneur créé")
}

func UpdateConteneur(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}

	var c models.BoxConteneur
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	c.Id = id
	if err := bdd.UpdateConteneur(c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "conteneur modifié")
}

func DeleteConteneur(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.DeleteConteneur(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	fmt.Fprintln(w, "conteneur supprimé")
}

func GetAllDepots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	depots, err := bdd.GetDepots()
	if err != nil {
		http.Error(w, "erreur de récupération des dépôts", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(depots)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func ValidateDepot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.ValidateDepot(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "dépôt validé avec succès")
}
