package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

// Création d'une formation/atelier par un salarié.
// Le statut part toujours en 'En attente' : un responsable doit valider.
func CreateFormationSalarie(e models.Evenement) error {
	_, err := Db.Exec(
		`INSERT INTO pa2026.evenement
		 (titre, description, date_debut, date_fin, nb_places, statut_validation, format, id_salarie)
		 VALUES (?, ?, ?, ?, ?, 'En attente', ?, ?)`,
		e.Titre, e.Description, e.DateDebut, e.DateFin, e.NbPlaces, e.Format, e.IdSalarie,
	)
	if err != nil {
		return fmt.Errorf("CreateFormationSalarie : %v", err)
	}
	return nil
}
