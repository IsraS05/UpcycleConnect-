package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
	"upcycleconnect/models"
)

func GetAllPlans(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	plans, err := bdd.GetPlans()
	if err != nil {
		http.Error(w, "erreur de récupération des plans", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(plans)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func CreatePlan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var p models.PlanAbo
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if p.Nom == "" || p.Prix <= 0 || p.DureeMois <= 0 {
		http.Error(w, "nom, prix et durée sont obligatoires", http.StatusBadRequest)
		return
	}

	if err := bdd.CreatePlan(p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "plan créé")
}

func UpdatePlan(w http.ResponseWriter, r *http.Request) {
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

	var p models.PlanAbo
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	p.Id = id
	if err := bdd.UpdatePlan(p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "plan modifié")
}

func DeletePlan(w http.ResponseWriter, r *http.Request) {
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

	if err := bdd.DeletePlan(id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fmt.Fprintln(w, "plan supprimé")
}
