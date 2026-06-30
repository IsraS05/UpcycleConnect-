package main

import (
	"fmt"
	"net/http"
)

const swaggerYAML = `
openapi: 3.0.0
info:
  title: UpcycleConnect API
  version: 1.0.0
  description: API Go pour le back-office et l'espace particulier UpcycleConnect

servers:
  - url: http://localhost:8081

tags:
  - name: Auth
  - name: Utilisateurs
  - name: Categories
  - name: Annonces
  - name: Evenements
  - name: Conteneurs
  - name: Depots
  - name: Particulier
  - name: Commandes

paths:

  /login:
    post:
      tags: [Auth]
      summary: Connexion utilisateur
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  example: m.lambert@email.fr
                mot_de_passe:
                  type: string
                  example: test123
      responses:
        '200':
          description: Utilisateur connecte
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          description: Email ou mot de passe incorrect

  /admin/users:
    get:
      tags: [Utilisateurs]
      summary: Retourne tous les utilisateurs
      responses:
        '200':
          description: Liste des utilisateurs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

  /admin/users/add:
    post:
      tags: [Utilisateurs]
      summary: Creer un utilisateur
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserInput'
      responses:
        '201':
          description: Utilisateur cree
        '500':
          description: Erreur (ex email deja utilise)

  /admin/users/modify/{id}:
    put:
      tags: [Utilisateurs]
      summary: Modifier un utilisateur
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserInput'
      responses:
        '200':
          description: Utilisateur modifie

  /admin/users/delete/{id}:
    delete:
      tags: [Utilisateurs]
      summary: Supprimer un utilisateur
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Utilisateur supprime
        '404':
          description: Utilisateur non trouve

  /admin/users/role/{role}:
    get:
      tags: [Utilisateurs]
      summary: Filtrer par role
      parameters:
        - in: path
          name: role
          required: true
          schema:
            type: string
            enum: [Admin, Salarie, Pro, Particulier]
      responses:
        '200':
          description: Liste filtree

  /admin/users/search:
    get:
      tags: [Utilisateurs]
      summary: Rechercher par nom et role
      parameters:
        - in: query
          name: name
          schema:
            type: string
          example: Lambert
        - in: query
          name: role
          schema:
            type: string
          example: Particulier
      responses:
        '200':
          description: Resultats de recherche

  /admin/categories:
    get:
      tags: [Categories]
      summary: Retourne toutes les categories
      responses:
        '200':
          description: Liste des categories
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Categorie'

  /admin/categories/add:
    post:
      tags: [Categories]
      summary: Creer une categorie
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                libelle:
                  type: string
                  example: Mobilier
      responses:
        '201':
          description: Categorie creee

  /admin/categories/delete/{id}:
    delete:
      tags: [Categories]
      summary: Supprimer une categorie
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Categorie supprimee

  /admin/annonces:
    get:
      tags: [Annonces]
      summary: Retourne toutes les annonces
      responses:
        '200':
          description: Liste des annonces
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Annonce'

  /admin/annonces/validate/{id}:
    put:
      tags: [Annonces]
      summary: Valider une annonce
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Annonce validee

  /admin/annonces/refuse/{id}:
    put:
      tags: [Annonces]
      summary: Refuser une annonce
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Annonce refusee

  /admin/evenements:
    get:
      tags: [Evenements]
      summary: Retourne tous les evenements
      responses:
        '200':
          description: Liste des evenements
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Evenement'

  /admin/evenements/add:
    post:
      tags: [Evenements]
      summary: Creer un evenement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EvenementInput'
      responses:
        '201':
          description: Evenement cree

  /admin/evenements/validate/{id}:
    put:
      tags: [Evenements]
      summary: Valider un evenement
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Evenement valide

  /admin/evenements/refuse/{id}:
    put:
      tags: [Evenements]
      summary: Refuser un evenement
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Evenement refuse

  /admin/conteneurs:
    get:
      tags: [Conteneurs]
      summary: Retourne tous les conteneurs
      responses:
        '200':
          description: Liste des conteneurs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/BoxConteneur'

  /admin/conteneurs/add:
    post:
      tags: [Conteneurs]
      summary: Creer un conteneur
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                localisation:
                  type: string
                  example: Paris 10e - Rue Lafayette
                etat:
                  type: string
                  enum: [Disponible, Plein, Maintenance]
      responses:
        '201':
          description: Conteneur cree

  /admin/conteneurs/modify/{id}:
    put:
      tags: [Conteneurs]
      summary: Modifier un conteneur
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                localisation:
                  type: string
                etat:
                  type: string
                  enum: [Disponible, Plein, Maintenance]
      responses:
        '200':
          description: Conteneur modifie

  /admin/depots:
    get:
      tags: [Depots]
      summary: Retourne toutes les demandes de depot
      responses:
        '200':
          description: Liste des depots
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/DepotBox'

  /admin/depots/validate/{id}:
    put:
      tags: [Depots]
      summary: Valider une demande de depot
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Depot valide

  /admin/commandes:
    get:
      tags: [Commandes]
      summary: Retourne toutes les commandes
      responses:
        '200':
          description: Liste des commandes

  /admin/abonnements:
    get:
      tags: [Commandes]
      summary: Retourne tous les abonnements
      responses:
        '200':
          description: Liste des abonnements

  /particulier/annonces/add:
    post:
      tags: [Particulier]
      summary: Creer une annonce (espace particulier)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnnonceInput'
      responses:
        '201':
          description: Annonce creee

  /particulier/depot:
    post:
      tags: [Particulier]
      summary: Creer une demande de depot
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                code_ouverture:
                  type: string
                  example: K4TZ9X
                code_barres_pro:
                  type: string
                  example: X8K2T4Z9
                id_user:
                  type: integer
                  example: 2
                id_box:
                  type: integer
                  example: 1
      responses:
        '201':
          description: Demande creee

  /particulier/depots/{idUser}:
    get:
      tags: [Particulier]
      summary: Depots d un utilisateur
      parameters:
        - in: path
          name: idUser
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Liste des depots du user

  /particulier/inscription/{idEvent}:
    post:
      tags: [Particulier]
      summary: S inscrire a un evenement
      parameters:
        - in: path
          name: idEvent
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                id_user:
                  type: integer
                  example: 2
      responses:
        '201':
          description: Inscription enregistree
        '500':
          description: Deja inscrit

  /particulier/planning/{idUser}:
    get:
      tags: [Particulier]
      summary: Planning d un utilisateur
      parameters:
        - in: path
          name: idUser
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Liste des evenements du user

components:
  schemas:
    User:
      type: object
      properties:
        id_user:
          type: integer
        role:
          type: string
          enum: [Admin, Salarie, Pro, Particulier]
        nom:
          type: string
        prenom:
          type: string
        email:
          type: string
        tutoriel_vu:
          type: boolean
        type_statut:
          type: string
          nullable: true
        nom_entreprise:
          type: string
          nullable: true
        siret:
          type: string
          nullable: true

    UserInput:
      type: object
      required: [nom, prenom, email, mot_de_passe, role]
      properties:
        nom:
          type: string
          example: LAMBERT
        prenom:
          type: string
          example: Marie
        email:
          type: string
          example: m.lambert@email.fr
        mot_de_passe:
          type: string
          example: monmotdepasse
        role:
          type: string
          enum: [Admin, Salarie, Pro, Particulier]

    Categorie:
      type: object
      properties:
        id_categorie:
          type: integer
        libelle:
          type: string

    Annonce:
      type: object
      properties:
        id_annonce:
          type: integer
        titre:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [Don, Vente, Service]
        prix:
          type: number
        statut_validation:
          type: string
          enum: [En attente, Valide, Refuse]
        code_postal:
          type: string
          nullable: true
        ville:
          type: string
          nullable: true
        nom:
          type: string
        prenom:
          type: string
        categorie:
          type: string
        id_user:
          type: integer

    AnnonceInput:
      type: object
      required: [titre, type, id_user, id_categorie]
      properties:
        titre:
          type: string
          example: Chaise en bois
        description:
          type: string
          example: Tres bon etat
        type:
          type: string
          enum: [Don, Vente, Service]
        prix:
          type: number
          example: 0
        ville:
          type: string
          nullable: true
          example: Paris
        code_postal:
          type: string
          nullable: true
          example: "75010"
        id_user:
          type: integer
          example: 2
        id_categorie:
          type: integer
          example: 1

    Evenement:
      type: object
      properties:
        id_event:
          type: integer
        titre:
          type: string
        description:
          type: string
        date_debut:
          type: string
          format: date-time
        date_fin:
          type: string
          format: date-time
        nb_places:
          type: integer
        statut_validation:
          type: string
          enum: [En attente, Valide, Refuse]
        format:
          type: string
          enum: [En ligne, Presentiel]
        nom_salarie:
          type: string
        prenom_salarie:
          type: string

    EvenementInput:
      type: object
      required: [titre, date_debut, date_fin, nb_places, format]
      properties:
        titre:
          type: string
          example: Atelier upcycling
        description:
          type: string
        date_debut:
          type: string
          format: date-time
          example: "2026-04-01T14:00:00Z"
        date_fin:
          type: string
          format: date-time
          example: "2026-04-01T18:00:00Z"
        nb_places:
          type: integer
          example: 20
        format:
          type: string
          enum: [En ligne, Presentiel]

    BoxConteneur:
      type: object
      properties:
        id_box:
          type: integer
        localisation:
          type: string
        etat:
          type: string
          enum: [Disponible, Plein, Maintenance]

    DepotBox:
      type: object
      properties:
        id_depot:
          type: integer
        code_ouverture:
          type: string
        code_barres_pro:
          type: string
        id_box:
          type: integer
        nom:
          type: string
        prenom:
          type: string
`

const swaggerHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>UpcycleConnect API - Swagger</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/swagger/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      })
    }
  </script>
</body>
</html>`

func serveSwagger(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, swaggerHTML)
}

func serveOpenAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/yaml")
	fmt.Fprint(w, swaggerYAML)
}
