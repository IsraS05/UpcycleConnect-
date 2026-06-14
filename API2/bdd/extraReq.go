package bdd

func MarkTutorielVu(id int) error {
	_, err := Db.Exec("UPDATE pa2026.utilisateur SET tutoriel_vu = true WHERE id_user = ?", id)
	return err
}

func GetDictionnaire(langue string) (map[string]string, error) {
	rows, err := Db.Query("SELECT cle, valeur FROM pa2026.dictionnaire WHERE langue = ?", langue)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dict := map[string]string{}
	for rows.Next() {
		var cle, valeur string
		if err := rows.Scan(&cle, &valeur); err != nil {
			return nil, err
		}
		dict[cle] = valeur
	}
	return dict, rows.Err()
}
