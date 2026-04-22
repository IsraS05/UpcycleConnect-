package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetEvenements() ([]models.Evenement, error) {
	var evenements []models.Evenement

	rows, err := Db.Query(`
		SELECT e.id_event, e.titre, e.description, e.date_debut, e.date_fin,
		       e.nb_places, e.statut_validation, e.format,
		       u.nom, u.prenom
		FROM pa2026.evenement e
		INNER JOIN pa2026.utilisateur u ON u.id_user = e.id_salarie
	`)
	if err != nil {
		return nil, fmt.Errorf("GetEvenements : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e models.Evenement
		err := rows.Scan(&e.Id, &e.Titre, &e.Description, &e.DateDebut, &e.DateFin,
			&e.NbPlaces, &e.StatutValidation, &e.Format, &e.NomSalarie, &e.PrenomSalarie)
		if err != nil {
			return nil, fmt.Errorf("GetEvenements scan : %v", err)
		}
		evenements = append(evenements, e)
	}
	return evenements, rows.Err()
}

func CreateEvenement(e models.Evenement) error {
	_, err := Db.Exec(
		"INSERT INTO pa2026.evenement (titre, description, date_debut, date_fin, nb_places, statut_validation, format) VALUES (?, ?, ?, ?, ?, 'En attente', ?)",
		e.Titre, e.Description, e.DateDebut, e.DateFin, e.NbPlaces, e.Format,
	)
	if err != nil {
		return fmt.Errorf("CreateEvenement : %v", err)
	}
	return nil
}

func ValidateEvenement(id int) error {
	result, err := Db.Exec("UPDATE pa2026.evenement SET statut_validation = 'Valide' WHERE id_event = ?", id)
	if err != nil {
		return fmt.Errorf("ValidateEvenement : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun événement trouvé avec l'id %d", id)
	}
	return nil
}

func RefuseEvenement(id int) error {
	result, err := Db.Exec("UPDATE pa2026.evenement SET statut_validation = 'Refuse' WHERE id_event = ?", id)
	if err != nil {
		return fmt.Errorf("RefuseEvenement : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun événement trouvé avec l'id %d", id)
	}
	return nil
}

func DeleteEvenement(id int) error {
	result, err := Db.Exec("DELETE FROM pa2026.evenement WHERE id_event = ?", id)
	if err != nil {
		return fmt.Errorf("DeleteEvenement : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun événement trouvé avec l'id %d", id)
	}
	return nil
}
