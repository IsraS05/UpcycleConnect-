package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetStats() (models.Stats, error) {
	var s models.Stats

	// Total revenus toutes commandes
	err := Db.QueryRow(`
		SELECT COALESCE(SUM(montant_total), 0), COALESCE(SUM(commission), 0), COUNT(*)
		FROM pa2026.commande
	`).Scan(&s.TotalRevenus, &s.TotalCommissions, &s.NbCommandes)
	if err != nil {
		return s, fmt.Errorf("GetStats revenus : %v", err)
	}

	// Revenus du mois en cours
	err = Db.QueryRow(`
		SELECT COALESCE(SUM(montant_total), 0)
		FROM pa2026.commande
		WHERE MONTH(date_commande) = MONTH(CURDATE())
		AND YEAR(date_commande) = YEAR(CURDATE())
	`).Scan(&s.RevenusduMois)
	if err != nil {
		return s, fmt.Errorf("GetStats revenus mois : %v", err)
	}

	// Nb abonnements actifs
	err = Db.QueryRow(`
		SELECT COUNT(*) FROM pa2026.abonnement WHERE statut = 'Actif'
	`).Scan(&s.NbAbonnementsActifs)
	if err != nil {
		return s, fmt.Errorf("GetStats abonnements : %v", err)
	}

	// Revenus abonnements du mois (basés sur les abonnements actifs démarrés ce mois)
	err = Db.QueryRow(`
		SELECT COALESCE(SUM(p.prix), 0)
		FROM pa2026.abonnement a
		INNER JOIN pa2026.plan_abo p ON p.id_plan = a.id_plan
		WHERE a.statut = 'Actif'
		AND MONTH(a.date_debut) = MONTH(CURDATE())
		AND YEAR(a.date_debut) = YEAR(CURDATE())
	`).Scan(&s.RevenusAbonnementsMois)
	if err != nil {
		return s, fmt.Errorf("GetStats revenus abonnements : %v", err)
	}

	return s, nil
}
