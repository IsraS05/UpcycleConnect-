package models

import "time"

type Conseil struct {
	Id            int       `json:"id_conseil"`
	Titre         string    `json:"titre"`
	Contenu       string    `json:"contenu"`
	Categorie     string    `json:"categorie"`
	Statut        string    `json:"statut"`         // Brouillon, Publie, Planifie
	DatePublication time.Time `json:"date_publication"`
	IdSalarie     int       `json:"id_salarie"`
	NomSalarie    string    `json:"nom_salarie"`
	PrenomSalarie string    `json:"prenom_salarie"`
}
