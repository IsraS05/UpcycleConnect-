package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

func GetForumSujets() ([]models.ForumSujet, error) {
	var sujets []models.ForumSujet

	rows, err := Db.Query(`
		SELECT s.id_sujet, s.titre, s.statut, s.date_creation, u.nom, u.prenom,
		       (SELECT COUNT(*) FROM pa2026.forum_message m WHERE m.id_sujet = s.id_sujet) AS nb_messages,
		       (SELECT COUNT(*) FROM pa2026.forum_message m WHERE m.id_sujet = s.id_sujet AND m.signale = true) AS nb_signalements
		FROM pa2026.forum_sujet s
		INNER JOIN pa2026.utilisateur u ON u.id_user = s.id_auteur
		ORDER BY s.date_creation DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("GetForumSujets : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.ForumSujet
		err := rows.Scan(&s.Id, &s.Titre, &s.Statut, &s.DateCreation, &s.NomAuteur, &s.PrenomAuteur, &s.NbMessages, &s.NbSignalements)
		if err != nil {
			return nil, fmt.Errorf("GetForumSujets scan : %v", err)
		}
		sujets = append(sujets, s)
	}
	return sujets, rows.Err()
}

func GetMessagesBySujet(idSujet int) ([]models.ForumMessage, error) {
	var messages []models.ForumMessage

	rows, err := Db.Query(`
		SELECT m.id_message, m.id_sujet, m.contenu, m.statut, m.date_creation,
		       m.signale, u.nom, u.prenom
		FROM pa2026.forum_message m
		INNER JOIN pa2026.utilisateur u ON u.id_user = m.id_auteur
		WHERE m.id_sujet = ?
		ORDER BY m.date_creation ASC
	`, idSujet)
	if err != nil {
		return nil, fmt.Errorf("GetMessagesBySujet : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var m models.ForumMessage
		err := rows.Scan(&m.Id, &m.IdSujet, &m.Contenu, &m.Statut, &m.DateCreation, &m.Signale, &m.NomAuteur, &m.PrenomAuteur)
		if err != nil {
			return nil, fmt.Errorf("GetMessagesBySujet scan : %v", err)
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

func GetMessagesSignales() ([]models.ForumMessage, error) {
	var messages []models.ForumMessage

	rows, err := Db.Query(`
		SELECT m.id_message, m.id_sujet, m.contenu, m.statut, m.date_creation,
		       m.signale, u.nom, u.prenom
		FROM pa2026.forum_message m
		INNER JOIN pa2026.utilisateur u ON u.id_user = m.id_auteur
		WHERE m.signale = true
		ORDER BY m.date_creation DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("GetMessagesSignales : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var m models.ForumMessage
		err := rows.Scan(&m.Id, &m.IdSujet, &m.Contenu, &m.Statut, &m.DateCreation, &m.Signale, &m.NomAuteur, &m.PrenomAuteur)
		if err != nil {
			return nil, fmt.Errorf("GetMessagesSignales scan : %v", err)
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// Masquer un message (modération)
func HideMessage(id int) error {
	result, err := Db.Exec("UPDATE pa2026.forum_message SET statut = 'Masque' WHERE id_message = ?", id)
	if err != nil {
		return fmt.Errorf("HideMessage : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun message trouvé avec l'id %d", id)
	}
	return nil
}

// Rejeter un signalement : remet le message visible et retire le drapeau
func DismissSignalement(id int) error {
	result, err := Db.Exec("UPDATE pa2026.forum_message SET signale = false, statut = 'Visible' WHERE id_message = ?", id)
	if err != nil {
		return fmt.Errorf("DismissSignalement : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun message trouvé avec l'id %d", id)
	}
	return nil
}

// Fermer ou masquer un sujet entier
func CloseSujet(id int) error {
	result, err := Db.Exec("UPDATE pa2026.forum_sujet SET statut = 'Ferme' WHERE id_sujet = ?", id)
	if err != nil {
		return fmt.Errorf("CloseSujet : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun sujet trouvé avec l'id %d", id)
	}
	return nil
}
