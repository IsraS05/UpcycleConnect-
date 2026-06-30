package models

type ArticleNews struct {
	Id      int    `json:"id_article"`
	Titre   string `json:"titre"`
	Contenu string `json:"contenu"`
	Type    string `json:"type"`
	Nom     string `json:"nom"`
	Prenom  string `json:"prenom"`
}
