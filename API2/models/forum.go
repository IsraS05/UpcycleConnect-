package models

import "time"

type Topic struct {
	Id         int    `json:"id_topic"`
	Titre      string `json:"titre"`
	IdUser     int    `json:"id_user"`
	Nom        string `json:"nom"`
	Prenom     string `json:"prenom"`
	NbMessages int    `json:"nb_messages"`
}

type MessageForum struct {
	Id      int    `json:"id_message"`
	Contenu string `json:"contenu"`
	IdUser  int    `json:"id_user"`
	IdTopic int    `json:"id_topic"`
	Nom     string `json:"nom"`
	Prenom  string `json:"prenom"`
}

type ForumSujet struct {
	Id          int       `json:"id_sujet"`
	Titre       string    `json:"titre"`
	Statut      string    `json:"statut"` // Ouvert, Ferme, Masque
	DateCreation time.Time `json:"date_creation"`
	NomAuteur   string    `json:"nom_auteur"`
	PrenomAuteur string   `json:"prenom_auteur"`
	NbMessages  int       `json:"nb_messages"`
	NbSignalements int    `json:"nb_signalements"`
}

type ForumMessage struct {
	Id          int       `json:"id_message"`
	IdSujet     int       `json:"id_sujet"`
	Contenu     string    `json:"contenu"`
	Statut      string    `json:"statut"` // Visible, Masque
	DateCreation time.Time `json:"date_creation"`
	Signale     bool      `json:"signale"`
	NomAuteur   string    `json:"nom_auteur"`
	PrenomAuteur string   `json:"prenom_auteur"`
}
