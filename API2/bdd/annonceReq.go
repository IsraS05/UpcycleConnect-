package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetAnnonces() ([]models.Annonce, error) {
	var annonces []models.Annonce

	rows, err := Db.Query(`
    SELECT a.id_annonce, a.titre, a.description, a.type, a.prix, a.statut_validation,
           a.code_postal, a.ville, a.projet_potentiel,
           u.nom, u.prenom, c.libelle, a.id_user, a.id_categorie
    FROM pa2026.annonce a
    INNER JOIN pa2026.utilisateur u ON u.id_user = a.id_user
    INNER JOIN pa2026.categorie c ON c.id_categorie = a.id_categorie
`)
	if err != nil {
		return nil, fmt.Errorf("GetAnnonces : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var a models.Annonce
		err := rows.Scan(&a.Id, &a.Titre, &a.Description, &a.Type, &a.Prix, &a.StatutValidation,
    	&a.CodePostal, &a.Ville, &a.ProjetPotentiel, &a.Nom, &a.Prenom, &a.Categorie,
    	&a.IdUser, &a.IdCategorie)
		if err != nil {
			return nil, fmt.Errorf("GetAnnonces scan : %v", err)
		}
		annonces = append(annonces, a)
	}
	return annonces, rows.Err()
}

func ValidateAnnonce(id int) error {
	result, err := Db.Exec("UPDATE pa2026.annonce SET statut_validation = 'Valide' WHERE id_annonce = ?", id)
	if err != nil {
		return fmt.Errorf("ValidateAnnonce : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucune annonce trouvée avec l'id %d", id)
	}
	return nil
}

func RefuseAnnonce(id int) error {
	result, err := Db.Exec("UPDATE pa2026.annonce SET statut_validation = 'Refuse' WHERE id_annonce = ?", id)
	if err != nil {
		return fmt.Errorf("RefuseAnnonce : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucune annonce trouvée avec l'id %d", id)
	}
	return nil
}
