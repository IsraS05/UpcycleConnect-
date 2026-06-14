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
