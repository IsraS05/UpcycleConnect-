package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetCommandes() ([]models.Commande, error) {
	var commandes []models.Commande

	rows, err := Db.Query(`
		SELECT c.id_commande, c.montant_total, c.commission, c.date_commande,
		       u.nom, u.prenom
		FROM pa2026.commande c
		INNER JOIN pa2026.utilisateur u ON u.id_user = c.id_user
	`)
	if err != nil {
		return nil, fmt.Errorf("GetCommandes : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.Commande
		err := rows.Scan(&c.Id, &c.MontantTotal, &c.Commission, &c.DateCommande, &c.NomUser, &c.PrenomUser)
		if err != nil {
			return nil, fmt.Errorf("GetCommandes scan : %v", err)
		}
		commandes = append(commandes, c)
	}
	return commandes, rows.Err()
}

func GetAbonnements() ([]models.Abonnement, error) {
	var abonnements []models.Abonnement

	rows, err := Db.Query(`
		SELECT a.id_abonnement, a.date_debut, a.date_fin, a.statut,
		       u.nom, u.prenom, p.nom
		FROM pa2026.abonnement a
		INNER JOIN pa2026.utilisateur u ON u.id_user = a.id_user
		INNER JOIN pa2026.plan_abo p ON p.id_plan = a.id_plan
	`)
	if err != nil {
		return nil, fmt.Errorf("GetAbonnements : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var a models.Abonnement
		err := rows.Scan(&a.Id, &a.DateDebut, &a.DateFin, &a.Statut, &a.NomUser, &a.PrenomUser, &a.NomPlan)
		if err != nil {
			return nil, fmt.Errorf("GetAbonnements scan : %v", err)
		}
		abonnements = append(abonnements, a)
	}
	return abonnements, rows.Err()
}
