package models

type BoxConteneur struct {
	Id           int    `json:"id_box"`
	Localisation string `json:"localisation"`
	Etat         string `json:"etat"`
}

type DepotBox struct {
	Id                int    `json:"id_depot"`
	CodeOuverture     string `json:"code_ouverture"`
	CodeBarresPro     string `json:"code_barres_pro"`
	IdBox             int    `json:"id_box"`
	IdUser            int    `json:"id_user"`
	NomParticulier    string `json:"nom"`
	PrenomParticulier string `json:"prenom"`
}
