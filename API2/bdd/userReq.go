package bdd

import (
	"database/sql"
	"fmt"
	"strings"
	"upcycleconnect/models"
	"golang.org/x/crypto/bcrypt"
)

func Login(email string, mdp string) (*models.User, error) {
    var u models.User
    err := Db.QueryRow(
        "SELECT id_user, role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret FROM pa2026.utilisateur WHERE email = ?",
        email,
    ).Scan(&u.Id, &u.Role, &u.Nom, &u.Prenom, &u.Email, &u.MotDePasse, &u.TutorielVu, &u.TypeStatut, &u.NomEntreprise, &u.Siret)
    if err != nil {
        return nil, fmt.Errorf("utilisateur non trouvé")
    }

    // Vérifier le mot de passe
    err = bcrypt.CompareHashAndPassword([]byte(u.MotDePasse), []byte(mdp))
    if err != nil {
        return nil, fmt.Errorf("mot de passe incorrect")
    }

    u.MotDePasse = "" // ne pas renvoyer le hash
    return &u, nil
}

func GetUsers() ([]models.User, error) {
	var users []models.User

	rows, err := Db.Query("SELECT id_user, role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret FROM pa2026.utilisateur")
	if err != nil {
		return nil, fmt.Errorf("GetUsers : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.Id, &u.Role, &u.Nom, &u.Prenom, &u.Email, &u.MotDePasse, &u.TutorielVu, &u.TypeStatut, &u.NomEntreprise, &u.Siret)
		if err != nil {
			return nil, fmt.Errorf("GetUsers scan : %v", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

//import "golang.org/x/crypto/bcrypt"

func CreateUser(u models.User) error {
    var count int
    err := Db.QueryRow("SELECT COUNT(*) FROM pa2026.utilisateur WHERE email = ?", u.Email).Scan(&count)
    if err != nil {
        return fmt.Errorf("vérification email : %v", err)
    }
    if count > 0 {
        return fmt.Errorf("l'email %s est déjà utilisé", u.Email)
    }

    // Hash du mot de passe
    hash, err := bcrypt.GenerateFromPassword([]byte(u.MotDePasse), bcrypt.DefaultCost)
    if err != nil {
        return fmt.Errorf("hash mot de passe : %v", err)
    }

    _, err = Db.Exec(
        "INSERT INTO pa2026.utilisateur (role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret) VALUES (?, UPPER(?), UPPER(?), ?, ?, false, ?, ?, ?)",
        u.Role, u.Nom, u.Prenom, u.Email, string(hash), u.TypeStatut, u.NomEntreprise, u.Siret,
    )
    if err != nil {
        return fmt.Errorf("CreateUser : %v", err)
    }
    return nil
}

func DeleteUser(id int) error {
	result, err := Db.Exec("DELETE FROM pa2026.utilisateur WHERE id_user = ?", id)
	if err != nil {
		return fmt.Errorf("DeleteUser : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun utilisateur trouvé avec l'id %d", id)
	}
	return nil
}

func UpdateUserById(u models.User) error {
	result, err := Db.Exec(
		"UPDATE pa2026.utilisateur SET role = ?, nom = ?, prenom = ?, email = ?, mot_de_passe = ?, type_statut = ?, nom_entreprise = ?, siret = ? WHERE id_user = ?",
		u.Role, u.Nom, u.Prenom, u.Email, u.MotDePasse, u.TypeStatut, u.NomEntreprise, u.Siret, u.Id,
	)
	if err != nil {
		return fmt.Errorf("UpdateUser : %v", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("aucun utilisateur trouvé avec l'id %d", u.Id)
	}
	return nil
}

func GetUserByRole(role string) ([]models.User, error) {
	var users []models.User

	rows, err := Db.Query(
		"SELECT id_user, role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret FROM pa2026.utilisateur WHERE role = ?", role,
	)
	if err != nil {
		return nil, fmt.Errorf("GetUserByRole : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.Id, &u.Role, &u.Nom, &u.Prenom, &u.Email, &u.MotDePasse, &u.TutorielVu, &u.TypeStatut, &u.NomEntreprise, &u.Siret)
		if err != nil {
			return nil, fmt.Errorf("GetUserByRole scan : %v", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func GetUserByName(query string, role string) ([]models.User, error) {
	var users []models.User
	query = strings.ToUpper(query)
	search := "%" + query + "%"

	var rows *sql.Rows
	var err error

	if role != "" && role != "Tous les rôles" {
		rows, err = Db.Query(
			"SELECT id_user, role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret FROM pa2026.utilisateur WHERE (UPPER(nom) LIKE ? OR UPPER(prenom) LIKE ?) AND role = ?",
			search, search, role,
		)
	} else {
		rows, err = Db.Query(
			"SELECT id_user, role, nom, prenom, email, mot_de_passe, tutoriel_vu, type_statut, nom_entreprise, siret FROM pa2026.utilisateur WHERE (UPPER(nom) LIKE ? OR UPPER(prenom) LIKE ?)",
			search, search,
		)
	}

	if err != nil {
		return nil, fmt.Errorf("GetUserByName : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.Id, &u.Role, &u.Nom, &u.Prenom, &u.Email, &u.MotDePasse, &u.TutorielVu, &u.TypeStatut, &u.NomEntreprise, &u.Siret)
		if err != nil {
			return nil, fmt.Errorf("GetUserByName scan : %v", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
