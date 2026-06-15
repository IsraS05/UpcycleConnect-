package models

import "time"

type Evenement struct {
	Id               int       `json:"id_event"`
	Titre            string    `json:"titre"`
	Description      string    `json:"description"`
	DateDebut        time.Time `json:"date_debut"`
	DateFin          time.Time `json:"date_fin"`
	NbPlaces         int       `json:"nb_places"`
	StatutValidation string    `json:"statut_validation"`
	Format           string    `json:"format"`
	IdSalarie        int       `json:"id_salarie"`
	NomSalarie       string    `json:"nom_salarie"`
	PrenomSalarie    string    `json:"prenom_salarie"`
}
