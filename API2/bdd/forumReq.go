package bdd

import (
	"fmt"
	"upcycleconnect/models"
)

// Liste des sujets + auteur + nombre de messages
func GetTopics() ([]models.Topic, error) {
	rows, err := Db.Query(`
		SELECT t.id_topic, t.titre, t.id_user, u.nom, u.prenom,
		       (SELECT COUNT(*) FROM pa2026.message_forum m WHERE m.id_topic = t.id_topic) AS nb
		FROM pa2026.topic_forum t
		INNER JOIN pa2026.utilisateur u ON u.id_user = t.id_user
		ORDER BY t.id_topic DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("GetTopics : %v", err)
	}
	defer rows.Close()

	var topics []models.Topic
	for rows.Next() {
		var t models.Topic
		if err := rows.Scan(&t.Id, &t.Titre, &t.IdUser, &t.Nom, &t.Prenom, &t.NbMessages); err != nil {
			return nil, fmt.Errorf("GetTopics scan : %v", err)
		}
		topics = append(topics, t)
	}
	return topics, rows.Err()
}

func CreateTopic(titre string, idUser int) error {
	_, err := Db.Exec("INSERT INTO pa2026.topic_forum (titre, id_user) VALUES (?, ?)", titre, idUser)
	if err != nil {
		return fmt.Errorf("CreateTopic : %v", err)
	}
	return nil
}

// Messages d'un sujet + auteur
func GetMessages(idTopic int) ([]models.MessageForum, error) {
	rows, err := Db.Query(`
		SELECT m.id_message, m.contenu, m.id_user, m.id_topic, u.nom, u.prenom
		FROM pa2026.message_forum m
		INNER JOIN pa2026.utilisateur u ON u.id_user = m.id_user
		WHERE m.id_topic = ?
		ORDER BY m.id_message ASC
	`, idTopic)
	if err != nil {
		return nil, fmt.Errorf("GetMessages : %v", err)
	}
	defer rows.Close()

	var msgs []models.MessageForum
	for rows.Next() {
		var m models.MessageForum
		if err := rows.Scan(&m.Id, &m.Contenu, &m.IdUser, &m.IdTopic, &m.Nom, &m.Prenom); err != nil {
			return nil, fmt.Errorf("GetMessages scan : %v", err)
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func CreateMessage(contenu string, idUser, idTopic int) error {
	_, err := Db.Exec("INSERT INTO pa2026.message_forum (contenu, id_user, id_topic) VALUES (?, ?, ?)", contenu, idUser, idTopic)
	if err != nil {
		return fmt.Errorf("CreateMessage : %v", err)
	}
	return nil
}


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
