package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetConseils() ([]models.Conseil, error) {
	var conseils []models.Conseil

	rows, err := Db.Query(`
		SELECT c.id_conseil, c.titre, c.contenu, c.categorie, c.statut,
		       c.date_publication, c.id_salarie, u.nom, u.prenom
		FROM pa2026.conseil c
		INNER JOIN pa2026.utilisateur u ON u.id_user = c.id_salarie
		ORDER BY c.date_publication DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("GetConseils : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.Conseil
		err := rows.Scan(&c.Id, &c.Titre, &c.Contenu, &c.Categorie, &c.Statut, &c.DatePublication, &c.IdSalarie, &c.NomSalarie, &c.PrenomSalarie)
		if err != nil {
			return nil, fmt.Errorf("GetConseils scan : %v", err)
		}
		conseils = append(conseils, c)
	}
	return conseils, rows.Err()
}

func GetConseilsBySalarie(idSalarie int) ([]models.Conseil, error) {
	var conseils []models.Conseil

	rows, err := Db.Query(`
		SELECT c.id_conseil, c.titre, c.contenu, c.categorie, c.statut,
		       c.date_publication, c.id_salarie, u.nom, u.prenom
		FROM pa2026.conseil c
		INNER JOIN pa2026.utilisateur u ON u.id_user = c.id_salarie
		WHERE c.id_salarie = ?
		ORDER BY c.date_publication DESC
	`, idSalarie)
	if err != nil {
		return nil, fmt.Errorf("GetConseilsBySalarie : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.Conseil
		err := rows.Scan(&c.Id, &c.Titre, &c.Contenu, &c.Categorie, &c.Statut, &c.DatePublication, &c.IdSalarie, &c.NomSalarie, &c.PrenomSalarie)
		if err != nil {
			return nil, fmt.Errorf("GetConseilsBySalarie scan : %v", err)
		}
		conseils = append(conseils, c)
	}
	return conseils, rows.Err()
}

func CreateConseil(c models.Conseil) error {
	statut := c.Statut
	if statut == "" {
		statut = "Brouillon"
	}
	_, err := Db.Exec(
		"INSERT INTO pa2026.conseil (titre, contenu, categorie, statut, date_publication, id_salarie) VALUES (?, ?, ?, ?, ?, ?)",
		c.Titre, c.Contenu, c.Categorie, statut, c.DatePublication, c.IdSalarie,
	)
	if err != nil {
		return fmt.Errorf("CreateConseil : %v", err)
	}
	return nil
}

func UpdateConseil(c models.Conseil) error {
	result, err := Db.Exec(
		"UPDATE pa2026.conseil SET titre = ?, contenu = ?, categorie = ?, statut = ?, date_publication = ? WHERE id_conseil = ?",
		c.Titre, c.Contenu, c.Categorie, c.Statut, c.DatePublication, c.Id,
	)
	if err != nil {
		return fmt.Errorf("UpdateConseil : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun conseil trouvé avec l'id %d", c.Id)
	}
	return nil
}

func PublishConseil(id int) error {
	result, err := Db.Exec("UPDATE pa2026.conseil SET statut = 'Publie' WHERE id_conseil = ?", id)
	if err != nil {
		return fmt.Errorf("PublishConseil : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun conseil trouvé avec l'id %d", id)
	}
	return nil
}

func DeleteConseil(id int) error {
	result, err := Db.Exec("DELETE FROM pa2026.conseil WHERE id_conseil = ?", id)
	if err != nil {
		return fmt.Errorf("DeleteConseil : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun conseil trouvé avec l'id %d", id)
	}
	return nil
}
