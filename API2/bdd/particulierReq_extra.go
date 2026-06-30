package bdd

import (
	"fmt"
	"upcycleconnect/models"
	"golang.org/x/crypto/bcrypt"
)

func UpdateAnnonce(id int, a models.Annonce) error {
	result, err := Db.Exec(
		"UPDATE pa2026.annonce SET titre=?, description=?, type=?, prix=? WHERE id_annonce=?",
		a.Titre, a.Description, a.Type, a.Prix, id,
	)
	if err != nil { return fmt.Errorf("UpdateAnnonce : %v", err) }
	rows, _ := result.RowsAffected()
	if rows == 0 { return fmt.Errorf("annonce non trouvée") }
	return nil
}

func DeleteAnnonce(id int) error {
	_, err := Db.Exec("DELETE FROM pa2026.annonce WHERE id_annonce=?", id)
	return err
}

func DeleteInscription(idUser int, idEvent int) error {
	result, err := Db.Exec("DELETE FROM pa2026.inscription WHERE id_user=? AND id_event=?", idUser, idEvent)
	if err != nil { return fmt.Errorf("DeleteInscription : %v", err) }
	rows, _ := result.RowsAffected()
	if rows == 0 { return fmt.Errorf("inscription non trouvée") }
	return nil
}

func ChangePassword(idUser int, ancienMdp string, nouveauMdp string) error {
	var hash string
	err := Db.QueryRow("SELECT mot_de_passe FROM pa2026.utilisateur WHERE id_user=?", idUser).Scan(&hash)
	if err != nil { return fmt.Errorf("utilisateur non trouvé") }
	if err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(ancienMdp)); err != nil {
		return fmt.Errorf("ancien mot de passe incorrect")
	}
	newHash, _ := bcrypt.GenerateFromPassword([]byte(nouveauMdp), bcrypt.DefaultCost)
	_, err = Db.Exec("UPDATE pa2026.utilisateur SET mot_de_passe=? WHERE id_user=?", string(newHash), idUser)
	return err
}

func GetArticles() ([]models.ArticleNews, error) {
	var articles []models.ArticleNews
	rows, err := Db.Query("SELECT a.id_article, a.titre, a.contenu, a.type, u.nom, u.prenom FROM pa2026.article_news a INNER JOIN pa2026.utilisateur u ON u.id_user = a.id_salarie ORDER BY a.id_article DESC")
	if err != nil { return nil, fmt.Errorf("GetArticles : %v", err) }
	defer rows.Close()
	for rows.Next() {
		var a models.ArticleNews
		if err := rows.Scan(&a.Id, &a.Titre, &a.Contenu, &a.Type, &a.Nom, &a.Prenom); err != nil {
			return nil, fmt.Errorf("GetArticles scan : %v", err)
		}
		articles = append(articles, a)
	}
	return articles, rows.Err()
}
