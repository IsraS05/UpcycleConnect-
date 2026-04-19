package models

type Stats struct {
	TotalRevenus            float64 `json:"total_revenus"`
	TotalCommissions        float64 `json:"total_commissions"`
	NbCommandes             int     `json:"nb_commandes"`
	RevenusduMois           float64 `json:"revenus_du_mois"`
	NbAbonnementsActifs     int     `json:"nb_abonnements_actifs"`
	RevenusAbonnementsMois  float64 `json:"revenus_abonnements_mois"`
}
