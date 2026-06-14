package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

// Créer une annonce
func CreateAnnonce(a models.Annonce) error {
	_, err := Db.Exec(
		`INSERT INTO pa2026.annonce (titre, description, type, prix, statut_validation, code_postal, ville, projet_potentiel, id_user, id_categorie)
		 VALUES (?, ?, ?, ?, 'En attente', ?, ?, ?, ?, ?)`,
		a.Titre, a.Description, a.Type, a.Prix, a.CodePostal, a.Ville, a.ProjetPotentiel, a.IdUser, a.IdCategorie,
	)
	if err != nil {
		return fmt.Errorf("CreateAnnonce : %v", err)
	}
	return nil
}

// Créer un dépôt en conteneur → table depot_box
func CreateDepot(d models.DepotBox) error {
	_, err := Db.Exec(
		`INSERT INTO pa2026.depot_box (code_ouverture, code_barres_pro, statut, id_user, id_box)
		 VALUES (?, ?, 'En attente', ?, ?)`,
		d.CodeOuverture, d.CodeBarresPro, d.IdUser, d.IdBox,
	)
	if err != nil {
		return fmt.Errorf("CreateDepot : %v", err)
	}
	return nil
}

func GetDepotsByUser(idUser int) ([]models.DepotBox, error) {
	var depots []models.DepotBox

	rows, err := Db.Query(`
        SELECT d.id_depot, d.code_ouverture, d.code_barres_pro, d.statut, d.id_box,
               u.nom, u.prenom
        FROM pa2026.depot_box d
        INNER JOIN pa2026.utilisateur u ON u.id_user = d.id_user
        WHERE d.id_user = ?
    `, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetDepotsByUser : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var d models.DepotBox
		err := rows.Scan(&d.Id, &d.CodeOuverture, &d.CodeBarresPro, &d.Statut, &d.IdBox, &d.NomParticulier, &d.PrenomParticulier)
		if err != nil {
			return nil, fmt.Errorf("GetDepotsByUser scan : %v", err)
		}
		depots = append(depots, d)
	}
	return depots, rows.Err()
}

// Inscription à un événement → table inscription
func CreateInscription(idUser int, idEvent int) error {
	// Vérifier si déjà inscrit
	var count int
	err := Db.QueryRow(
		"SELECT COUNT(*) FROM pa2026.inscription WHERE id_user = ? AND id_event = ?",
		idUser, idEvent,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("vérification inscription : %v", err)
	}
	if count > 0 {
		return fmt.Errorf("vous êtes déjà inscrit à cet événement")
	}

	_, err = Db.Exec(
		"INSERT INTO pa2026.inscription (id_user, id_event) VALUES (?, ?)",
		idUser, idEvent,
	)
	if err != nil {
		return fmt.Errorf("CreateInscription : %v", err)
	}
	return nil
}

// Récupérer les inscriptions d'un user
func GetInscriptions(idUser int) ([]models.Evenement, error) {
	var events []models.Evenement

	rows, err := Db.Query(`
		SELECT e.id_event, e.titre, e.description, e.date_debut, e.date_fin,
		       e.nb_places, e.statut_validation, e.format,
		       u.nom, u.prenom
		FROM pa2026.inscription i
		INNER JOIN pa2026.evenement e ON e.id_event = i.id_event
		INNER JOIN pa2026.utilisateur u ON u.id_user = e.id_salarie
		WHERE i.id_user = ?
	`, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetInscriptions : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var e models.Evenement
		err := rows.Scan(&e.Id, &e.Titre, &e.Description, &e.DateDebut, &e.DateFin,
			&e.NbPlaces, &e.StatutValidation, &e.Format, &e.NomSalarie, &e.PrenomSalarie)
		if err != nil {
			return nil, fmt.Errorf("GetInscriptions scan : %v", err)
		}
		events = append(events, e)
	}
	return events, rows.Err()
}
