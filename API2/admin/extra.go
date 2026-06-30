package admin

import (
	"encoding/json"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
)

func MarkTutorielHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "PUT")
	if r.Method == "OPTIONS" {
		w.WriteHeader(200)
		return
	}
	id, err := strconv.Atoi(r.PathValue("idUser"))
	if err != nil {
		http.Error(w, "id invalide", 400)
		return
	}
	if err := bdd.MarkTutorielVu(id); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(200)
}

func GetDictionnaireHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	langue := r.PathValue("langue")
	dict, err := bdd.GetDictionnaire(langue)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dict)
}
