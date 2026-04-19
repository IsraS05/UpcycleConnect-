package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
	"upcycleconnect/models"
)

func GetAllUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	users, err := bdd.GetUsers()
	if err != nil {
		http.Error(w, "erreur de récupération des utilisateurs", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(users)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func CreateUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var u models.User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	if err := bdd.CreateUser(u); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "utilisateur créé")
}

func DeleteUser(w http.ResponseWriter, r *http.Request) {
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

	if err := bdd.DeleteUser(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	fmt.Fprintln(w, "utilisateur supprimé")
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
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

	var u models.User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	u.Id = id
	if err := bdd.UpdateUserById(u); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetUserByRole(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	role := r.PathValue("role")
	users, err := bdd.GetUserByRole(role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func GetUserByName(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	name := r.URL.Query().Get("name")
	role := r.URL.Query().Get("role")

	users, err := bdd.GetUserByName(name, role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
