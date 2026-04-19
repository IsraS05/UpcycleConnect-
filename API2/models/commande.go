package models

import "time"

type Commande struct {
	Id            int       `json:"id_commande"`
	MontantTotal  float64   `json:"montant_total"`
	Commission    float64   `json:"commission"`
	DateCommande  time.Time `json:"date_commande"`
	NomUser       string    `json:"nom"`
	PrenomUser    string    `json:"prenom"`
}

type Paiement struct {
	Id        int    `json:"id_paiement"`
	StripeId  string `json:"stripe_id"`
	Statut    string `json:"statut"`
}
