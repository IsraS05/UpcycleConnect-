package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetConteneurs() ([]models.BoxConteneur, error) {
	var conteneurs []models.BoxConteneur

	rows, err := Db.Query("SELECT id_box, localisation, etat FROM pa2026.box_conteneur")
	if err != nil {
		return nil, fmt.Errorf("GetConteneurs : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.BoxConteneur
		err := rows.Scan(&c.Id, &c.Localisation, &c.Etat)
		if err != nil {
			return nil, fmt.Errorf("GetConteneurs scan : %v", err)
		}
		conteneurs = append(conteneurs, c)
	}
	return conteneurs, rows.Err()
}

func CreateConteneur(c models.BoxConteneur) error {
	_, err := Db.Exec(
		"INSERT INTO pa2026.box_conteneur (localisation, etat) VALUES (?, ?)",
		c.Localisation, c.Etat,
	)
	if err != nil {
		return fmt.Errorf("CreateConteneur : %v", err)
	}
	return nil
}

func UpdateConteneur(c models.BoxConteneur) error {
	result, err := Db.Exec(
		"UPDATE pa2026.box_conteneur SET localisation = ?, etat = ? WHERE id_box = ?",
		c.Localisation, c.Etat, c.Id,
	)
	if err != nil {
		return fmt.Errorf("UpdateConteneur : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun conteneur trouvé avec l'id %d", c.Id)
	}
	return nil
}

func DeleteConteneur(id int) error {
	result, err := Db.Exec("DELETE FROM pa2026.box_conteneur WHERE id_box = ?", id)
	if err != nil {
		return fmt.Errorf("DeleteConteneur : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun conteneur trouvé avec l'id %d", id)
	}
	return nil
}

func GetDepots() ([]models.DepotBox, error) {
	var depots []models.DepotBox

	rows, err := Db.Query(`
		SELECT d.id_depot, d.code_ouverture, d.code_barres_pro, d.id_box,
		       d.id_user, u.nom, u.prenom
		FROM pa2026.depot_box d
		INNER JOIN pa2026.utilisateur u ON u.id_user = d.id_user
	`)
	if err != nil {
		return nil, fmt.Errorf("GetDepots : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var d models.DepotBox
		err := rows.Scan(&d.Id, &d.CodeOuverture, &d.CodeBarresPro, &d.IdBox,
			&d.IdUser, &d.NomParticulier, &d.PrenomParticulier)
		if err != nil {
			return nil, fmt.Errorf("GetDepots scan : %v", err)
		}
		depots = append(depots, d)
	}
	return depots, rows.Err()
}

func ValidateDepot(id int) error {
	result, err := Db.Exec("UPDATE pa2026.depot_box SET statut = 'Valide' WHERE id_depot = ?", id)
	if err != nil {
		return fmt.Errorf("ValidateDepot : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun dépôt trouvé avec l'id %d", id)
	}
	return nil
}
