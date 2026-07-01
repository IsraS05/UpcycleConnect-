// handlers/authHandler.go — UpcycleConnect
// Handlers HTTP pour l'authentification Pro
//
// Routes :
//   POST /api/auth/login    → LoginHandler
//   POST /api/auth/refresh  → RefreshHandler
//   POST /api/auth/logout   → LogoutHandler (stateless JWT → no-op côté serveur)
//
// Ce fichier s'appuie sur :
//   - bdd.Login()       depuis userReq.go existant (hash bcrypt)
//   - middleware.GenerateProToken() depuis middleware/jwt.go
//   - bdd.GetProSubscription() pour déterminer is_premium
//
// Réponse login attendue par auth.js (front) :
//   { "token": "...", "user": { "id_user", "role", "nom", "prenom", "email", "subscription" } }

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"upcycleconnect/bdd"
	"upcycleconnect/middleware"
	"upcycleconnect/models"
)

// ─────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────

// sendJSON — envoie une réponse JSON avec status code
func sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		fmt.Printf("[ERROR] sendJSON encode : %v\n", err)
	}
}

// sendError — envoie une erreur JSON
// Format : { "error": "message" } — cohérent avec api.js côté front
func sendError(w http.ResponseWriter, status int, message string) {
	sendJSON(w, status, map[string]string{"error": message})
}

// decodeBody — décode le body JSON dans la valeur cible
func decodeBody(r *http.Request, target interface{}) error {
	if r.Body == nil {
		return fmt.Errorf("corps de la requête vide")
	}
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}


// RegisterHandler — POST /api/auth/register
// Crée un compte Pro et retourne un JWT
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Prenom     string `json:"prenom"`
		Nom        string `json:"nom"`
		Email      string `json:"email"`
		Password   string `json:"password"`
		Siret      string `json:"siret"`
		Entreprise string `json:"entreprise"`
		Role       string `json:"role"`
	}

	if err := decodeBody(r, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide.")
		return
	}

	// Validations
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
		sendError(w, http.StatusBadRequest, "Email et mot de passe requis.")
		return
	}
	if len(req.Password) < 8 {
		sendError(w, http.StatusBadRequest, "Le mot de passe doit contenir au moins 8 caractères.")
		return
	}

	// Créer l'utilisateur en BDD
	user := models.User{
		Prenom:     strings.ToUpper(req.Prenom),
		Nom:        strings.ToUpper(req.Nom),
		Email:      strings.ToLower(strings.TrimSpace(req.Email)),
		MotDePasse: req.Password,
		Role:       "Pro",
	}

	// Stocker nom entreprise et SIRET
	if req.Entreprise != "" {
		user.NomEntreprise = &req.Entreprise
	}
	if req.Siret != "" {
		user.Siret = &req.Siret
	}

	if err := bdd.CreateUser(user); err != nil {
		sendError(w, http.StatusConflict, err.Error())
		return
	}

	// Récupérer l'utilisateur créé pour avoir son ID
	createdUser, err := bdd.Login(user.Email, req.Password)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Erreur lors de la connexion post-inscription.")
		return
	}

	// Générer le JWT
	token, err := middleware.GenerateProToken(
		createdUser.Id,
		createdUser.Role,
		false,
		createdUser.Nom,
		createdUser.Prenom,
		createdUser.Email,
	)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Erreur génération token.")
		return
	}

	sendJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id_user":      createdUser.Id,
			"role":         createdUser.Role,
			"nom":          createdUser.Nom,
			"prenom":       createdUser.Prenom,
			"email":        createdUser.Email,
			"subscription": "STANDARD",
			"is_premium":   false,
		},
	})
}


// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────

// LoginHandler — authentifie un utilisateur Pro et retourne un JWT
//
// Body JSON attendu :
//   { "email": "...", "password": "..." }
//
// Réponse 200 :
//   { "token": "eyJ...", "user": { ... } }
//
// Erreurs :
//   400 — body JSON invalide
//   401 — credentials incorrects
//   403 — utilisateur trouvé mais rôle != Pro
//   500 — erreur serveur
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Décoder le body
	var req models.LoginRequest
	if err := decodeBody(r, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Corps JSON invalide : "+err.Error())
		return
	}

	// 2. Validation basique
	req.Email    = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		sendError(w, http.StatusBadRequest, "Email et mot de passe requis.")
		return
	}

	// 3. Vérifier les credentials via la fonction existante bdd.Login()
	//    (elle gère le hash bcrypt et retourne l'utilisateur sans le mot de passe)
	user, err := bdd.Login(req.Email, req.Password)
	if err != nil {
		// Ne pas distinguer "email inconnu" de "mauvais mot de passe"
		// pour éviter l'énumération d'utilisateurs
		sendError(w, http.StatusUnauthorized, "Email ou mot de passe incorrect.")
		return
	}

	// 4. Vérifier que le rôle est bien "Pro"
	//    (valeur ENUM SQL : 'Admin', 'Salarie', 'Pro', 'Particulier')
	if user.Role != "Pro" {
		sendError(w, http.StatusForbidden,
			"Cet accès est réservé aux professionnels et artisans. "+
				"Votre compte a le rôle : "+user.Role)
		return
	}

	// 5. Déterminer si l'abonnement est Premium
	//    Tentative best-effort (non bloquante si pas d'abonnement)
	isPremium := false
	sub, err := bdd.GetProSubscription(user.Id)
	if err == nil {
		isPremium = sub.Plan == "PREMIUM" && sub.Status == "active"
	}

	// 6. Générer le JWT
	token, err := middleware.GenerateProToken(
		user.Id,
		user.Role,
		isPremium,
		user.Nom,
		user.Prenom,
		user.Email,
	)
	if err != nil {
		fmt.Printf("[ERROR] LoginHandler GenerateProToken : %v\n", err)
		sendError(w, http.StatusInternalServerError, "Erreur de génération du token.")
		return
	}

	// 7. Construire la réponse
	//    Le champ "subscription" est utilisé par auth.js pour isPremium()
	subscription := "STANDARD"
	if isPremium {
		subscription = "PREMIUM"
	}

	resp := models.LoginResponse{
		Token: token,
		User:  *user,
	}

	// Enrichir l'objet user avec les champs attendus par le front
	// (auth.js lit user.subscription et user.role)
	userJSON := map[string]interface{}{
		"id_user":      user.Id,
		"role":         user.Role,
		"nom":          user.Nom,
		"prenom":       user.Prenom,
		"email":        user.Email,
		"tutoriel_vu":  user.TutorielVu,
		"subscription": subscription,
		"is_premium":   isPremium,
	}

	// Ajouter les infos entreprise si présentes
	if user.TypeStatut != nil {
    userJSON["type_statut"] = *user.TypeStatut
	}
	if user.NomEntreprise != nil {
	   userJSON["nom_entreprise"] = *user.NomEntreprise
	}
	if user.Siret != nil {
	   userJSON["siret"] = *user.Siret
	}

	_ = resp // utilisé pour la cohérence de type, on envoie la map enrichie

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  userJSON,
	})
}

// ─────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────

// RefreshHandler — renouvelle le JWT si l'ancien est encore valide
// Appelé par auth.js -> tryRefreshToken() quand le token expire dans < 5 min
//
// Header requis : Authorization: Bearer <ancien_token>
// Réponse 200 : { "token": "nouveau_token" }
func RefreshHandler(w http.ResponseWriter, r *http.Request) {
	// Extraire l'ancien token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		sendError(w, http.StatusUnauthorized, "Token requis pour le refresh.")
		return
	}
	oldTokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Parser l'ancien token (doit être valide ou récemment expiré)
	oldClaims, err := middleware.ParseProToken(oldTokenString)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "Token invalide ou trop ancien pour être renouvelé.")
		return
	}

	// Vérifier que le rôle est toujours Pro (peut avoir changé en BDD)
	if oldClaims.Role != "Pro" {
		sendError(w, http.StatusForbidden, "Rôle Pro requis.")
		return
	}

	// Générer un nouveau token avec les mêmes claims + is_premium re-vérifié
	isPremium := false
	sub, err := bdd.GetProSubscription(oldClaims.IdUser)
	if err == nil {
		isPremium = sub.Plan == "PREMIUM" && sub.Status == "active"
	}

	newToken, err := middleware.RefreshToken(&middleware.ProClaims{
		IdUser:    oldClaims.IdUser,
		Role:      oldClaims.Role,
		IsPremium: isPremium,
		Nom:       oldClaims.Nom,
		Prenom:    oldClaims.Prenom,
		Email:     oldClaims.Email,
	})
	if err != nil {
		sendError(w, http.StatusInternalServerError, "Erreur de renouvellement du token.")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"token": newToken})
}

// ─────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────

// LogoutHandler — JWT est stateless côté serveur
// Le client supprime son token localStorage.
// Côté serveur : no-op, retourne 204 No Content.
// (Pour une révocation réelle, implémenter une blacklist Redis)
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

