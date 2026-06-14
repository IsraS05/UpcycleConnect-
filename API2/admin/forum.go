package admin

import (
	"encoding/json"
	"net/http"
	"strconv"
	"upcycleconnect/bdd"
)

func GetTopicsHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	topics, err := bdd.GetTopics()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topics)
}

func CreateTopicHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "POST")
	if r.Method == "OPTIONS" {
		w.WriteHeader(200)
		return
	}
	var body struct {
		Titre  string `json:"titre"`
		IdUser int    `json:"id_user"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "JSON invalide", 400)
		return
	}
	if err := bdd.CreateTopic(body.Titre, body.IdUser); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(201)
}

func GetMessagesHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "GET")
	idTopic, err := strconv.Atoi(r.PathValue("idTopic"))
	if err != nil {
		http.Error(w, "id invalide", 400)
		return
	}
	msgs, err := bdd.GetMessages(idTopic)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

func CreateMessageHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, "POST")
	if r.Method == "OPTIONS" {
		w.WriteHeader(200)
		return
	}
	idTopic, err := strconv.Atoi(r.PathValue("idTopic"))
	if err != nil {
		http.Error(w, "id invalide", 400)
		return
	}
	var body struct {
		Contenu string `json:"contenu"`
		IdUser  int    `json:"id_user"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "JSON invalide", 400)
		return
	}
	if err := bdd.CreateMessage(body.Contenu, body.IdUser, idTopic); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(201)
}
