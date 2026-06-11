package admin

import (
    "encoding/json"
    "net/http"
    "upcycleconnect/bdd"
)

func Login(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }

    var body struct {
        Email      string `json:"email"`
        MotDePasse string `json:"mot_de_passe"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        http.Error(w, "JSON invalide", http.StatusBadRequest)
        return
    }

    user, err := bdd.Login(body.Email, body.MotDePasse)
    if err != nil {
        http.Error(w, err.Error(), http.StatusUnauthorized)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}