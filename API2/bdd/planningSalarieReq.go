package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

// Planning d'un salarié : ses formations / événements qu'il anime
func GetPlanningSalarie(idSalarie int) ([]models.Evenement, error) {
	var evenements []models.Evenement

	rows, err := Db.Query(`
		SELECT e.id_event, e.titre, e.description, e.date_debut, e.date_fin,
		       e.nb_places, e.statut_validation, e.format, u.nom, u.prenom
		FROM pa2026.evenement e
		INNER JOIN pa2026.utilisateur u ON u.id_user = e.id_salarie
		WHERE e.id_salarie = ?
		ORDER BY e.date_debut ASC
	`, idSalarie)
	if err != nil {
		return nil, fmt.Errorf("GetPlanningSalarie : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e models.Evenement
		err := rows.Scan(&e.Id, &e.Titre, &e.Description, &e.DateDebut, &e.DateFin, &e.NbPlaces, &e.StatutValidation, &e.Format, &e.NomSalarie, &e.PrenomSalarie)
		if err != nil {
			return nil, fmt.Errorf("GetPlanningSalarie scan : %v", err)
		}
		evenements = append(evenements, e)
	}
	return evenements, rows.Err()
}
