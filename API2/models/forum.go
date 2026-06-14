package models

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
