package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetCategories() ([]models.Categorie, error) {
	var categories []models.Categorie

	rows, err := Db.Query("SELECT id_categorie, libelle FROM pa2026.categorie")
	if err != nil {
		return nil, fmt.Errorf("GetCategories : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.Categorie
		err := rows.Scan(&c.Id, &c.Libelle)
		if err != nil {
			return nil, fmt.Errorf("GetCategories scan : %v", err)
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func CreateCategorie(c models.Categorie) error {
	var count int
	err := Db.QueryRow("SELECT COUNT(*) FROM pa2026.categorie WHERE libelle = ?", c.Libelle).Scan(&count)
	if err != nil {
		return fmt.Errorf("vérification libellé : %v", err)
	}
	if count > 0 {
		return fmt.Errorf("le libellé %s existe déjà", c.Libelle)
	}

	_, err = Db.Exec("INSERT INTO pa2026.categorie (libelle) VALUES (?)", c.Libelle)
	if err != nil {
		return fmt.Errorf("CreateCategorie : %v", err)
	}
	return nil
}

func DeleteCategorie(id int) error {
	result, err := Db.Exec("DELETE FROM pa2026.categorie WHERE id_categorie = ?", id)
	if err != nil {
		return fmt.Errorf("DeleteCategorie : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucune catégorie trouvée avec l'id %d", id)
	}
	return nil
}
