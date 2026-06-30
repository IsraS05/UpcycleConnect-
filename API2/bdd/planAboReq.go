package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetPlans() ([]models.PlanAbo, error) {
	var plans []models.PlanAbo

	rows, err := Db.Query("SELECT id_plan, nom, prix, duree_mois FROM pa2026.plan_abo")
	if err != nil {
		return nil, fmt.Errorf("GetPlans : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var p models.PlanAbo
		err := rows.Scan(&p.Id, &p.Nom, &p.Prix, &p.DureeMois)
		if err != nil {
			return nil, fmt.Errorf("GetPlans scan : %v", err)
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func CreatePlan(p models.PlanAbo) error {
	var count int
	err := Db.QueryRow("SELECT COUNT(*) FROM pa2026.plan_abo WHERE nom = ?", p.Nom).Scan(&count)
	if err != nil {
		return fmt.Errorf("vérification nom plan : %v", err)
	}
	if count > 0 {
		return fmt.Errorf("un plan avec le nom '%s' existe déjà", p.Nom)
	}

	_, err = Db.Exec(
		"INSERT INTO pa2026.plan_abo (nom, prix, duree_mois) VALUES (?, ?, ?)",
		p.Nom, p.Prix, p.DureeMois,
	)
	if err != nil {
		return fmt.Errorf("CreatePlan : %v", err)
	}
	return nil
}

func UpdatePlan(p models.PlanAbo) error {
	result, err := Db.Exec(
		"UPDATE pa2026.plan_abo SET nom = ?, prix = ?, duree_mois = ? WHERE id_plan = ?",
		p.Nom, p.Prix, p.DureeMois, p.Id,
	)
	if err != nil {
		return fmt.Errorf("UpdatePlan : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun plan trouvé avec l'id %d", p.Id)
	}
	return nil
}

func DeletePlan(id int) error {
	// verifier si abonnements actifs qui utilise ce plan
	var count int
	err := Db.QueryRow(
		"SELECT COUNT(*) FROM pa2026.abonnement WHERE id_plan = ? AND statut = 'Actif'", id,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("vérification abonnements actifs : %v", err)
	}
	if count > 0 {
		return fmt.Errorf("impossible de supprimer : %d abonnement(s) actif(s) utilisent ce plan", count)
	}

	result, err := Db.Exec("DELETE FROM pa2026.plan_abo WHERE id_plan = ?", id)
	if err != nil {
		return fmt.Errorf("DeletePlan : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun plan trouvé avec l'id %d", id)
	}
	return nil
}
