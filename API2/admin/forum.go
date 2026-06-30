package admin

import (
	"encoding/json"
	"net/http"
	"strconv"
  "fmt"
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

func GetAllForumSujets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	sujets, err := bdd.GetForumSujets()
	if err != nil {
		http.Error(w, "erreur de récupération des sujets", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(sujets)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func GetMessagesBySujet(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}

	messages, err := bdd.GetMessagesBySujet(id)
	if err != nil {
		http.Error(w, "erreur de récupération des messages", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(messages)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func GetMessagesSignales(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	messages, err := bdd.GetMessagesSignales()
	if err != nil {
		http.Error(w, "erreur de récupération des signalements", http.StatusInternalServerError)
		fmt.Println("erreur", err)
		return
	}

	response, err := json.Marshal(messages)
	if err != nil {
		http.Error(w, "erreur de conversion", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", response)
}

func HideMessage(w http.ResponseWriter, r *http.Request) {
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

	if err := bdd.HideMessage(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	fmt.Fprintln(w, "message masqué")
}

func DismissSignalement(w http.ResponseWriter, r *http.Request) {
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

	if err := bdd.DismissSignalement(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	fmt.Fprintln(w, "signalement rejeté")
}

func CloseSujet(w http.ResponseWriter, r *http.Request) {
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

	if err := bdd.CloseSujet(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	fmt.Fprintln(w, "sujet fermé")
}
