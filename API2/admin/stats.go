package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"upcycleconnect/bdd"
)

func GetStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	stats, err := bdd.GetStats()
	if err != nil {
		http.Error(w, "erreur de récupération des stats", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
