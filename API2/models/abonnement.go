package models

import "time"

type PlanAbo struct {
	Id         int     `json:"id_plan"`
	Nom        string  `json:"nom"`
	Prix       float64 `json:"prix"`
	DureeMois  int     `json:"duree_mois"`
}

type Abonnement struct {
	Id         int       `json:"id_abonnement"`
	DateDebut  time.Time `json:"date_debut"`
	DateFin    time.Time `json:"date_fin"`
	Statut     string    `json:"statut"`
	NomUser    string    `json:"nom"`
	PrenomUser string    `json:"prenom"`
	NomPlan    string    `json:"nom_plan"`
}
