package models

type Annonce struct {
	Id               int     `json:"id_annonce"`
	Titre            string  `json:"titre"`
	Description      string  `json:"description"`
	Type             string  `json:"type"`
	Prix             float64 `json:"prix"`
	StatutValidation string  `json:"statut_validation"`
	CodePostal       *string `json:"code_postal"`
	Ville            *string `json:"ville"`
	ProjetPotentiel  *string `json:"projet_potentiel"`
	Nom              string  `json:"nom"`
	Prenom           string  `json:"prenom"`
	Categorie        string  `json:"categorie"`
	IdUser           int     `json:"id_user"`
	IdCategorie      int     `json:"id_categorie"`
}

type Categorie struct {
	Id      int    `json:"id_categorie"`
	Libelle string `json:"libelle"`
}
