// middleware/jwt.go — UpcycleConnect
// Middleware JWT pour l'Espace Pro
//
// Responsabilités :
//   1. Générer un JWT signé HS256 après login
//   2. Valider le token dans chaque requête protégée
//   3. Extraire les claims (id_user, role, is_premium) et les injecter dans le contexte
//   4. Guard middleware : rejette si rôle != "Pro"
//
// Usage dans les routes :
//   router.Handle("/api/pro/...", middleware.RequirePro(handler))
//
// Dépendance : github.com/golang-jwt/jwt/v5
//   go get github.com/golang-jwt/jwt/v5

package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ─────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────

// jwtSecret est lu depuis la variable d'environnement JWT_SECRET.
// Si non défini, une valeur de développement est utilisée.
// En production, TOUJOURS définir JWT_SECRET dans l'environnement.
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		fmt.Println("[WARN] JWT_SECRET non défini — utilisation de la clé de développement")
		secret = "upcycleconnect_dev_secret_change_in_production_2026"
	}
	return []byte(secret)
}

const (
	TokenExpiry = 24 * time.Hour // Durée de validité du token
	ContextKey  = "jwtClaims"   // Clé de contexte pour les claims
)

// ─────────────────────────────────────────
// Claims — Payload du JWT
// ─────────────────────────────────────────

// ProClaims — payload JWT pour l'Espace Pro
// Cohérent avec ce que le front auth.js décode :
//   payload.role, payload.sub, payload.exp, payload.is_premium
type ProClaims struct {
	IdUser    int    `json:"sub"`          // id_user de la table utilisateur
	Role      string `json:"role"`         // "Pro" — correspond au ENUM SQL
	IsPremium bool   `json:"is_premium"`   // true si abonnement Premium actif
	Nom       string `json:"nom"`
	Prenom    string `json:"prenom"`
	Email     string `json:"email"`
	jwt.RegisteredClaims
}

// ─────────────────────────────────────────
// Génération du token
// ─────────────────────────────────────────

// GenerateProToken — crée un JWT signé pour un utilisateur Pro
// Appelé dans le handler de login après vérification des credentials
func GenerateProToken(idUser int, role string, isPremium bool, nom string, prenom string, email string) (string, error) {
	now := time.Now()

	claims := ProClaims{
		IdUser:    idUser,
		Role:      role,
		IsPremium: isPremium,
		Nom:       nom,
		Prenom:    prenom,
		Email:     email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", idUser),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenExpiry)),
			Issuer:    "upcycleconnect",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(getJWTSecret())
	if err != nil {
		return "", fmt.Errorf("GenerateProToken : %v", err)
	}
	return signed, nil
}

// ─────────────────────────────────────────
// Validation et parsing
// ─────────────────────────────────────────

// ParseProToken — valide le token et retourne les claims
// Retourne une erreur si :
//   - Token absent ou malformé
//   - Signature invalide
//   - Token expiré
func ParseProToken(tokenString string) (*ProClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&ProClaims{},
		func(token *jwt.Token) (interface{}, error) {
			// Vérifier que l'algorithme est bien HS256
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("algorithme de signature inattendu : %v", token.Header["alg"])
			}
			return getJWTSecret(), nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
	)

	if err != nil {
		return nil, fmt.Errorf("token invalide : %v", err)
	}

	claims, ok := token.Claims.(*ProClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("claims invalides")
	}

	return claims, nil
}

// extractTokenFromHeader — extrait le Bearer token du header Authorization
// Format attendu : "Authorization: Bearer <token>"
func extractTokenFromHeader(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("header Authorization absent")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", fmt.Errorf("format Authorization invalide (attendu : Bearer <token>)")
	}

	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", fmt.Errorf("token vide")
	}

	return token, nil
}

// ─────────────────────────────────────────
// Helpers contexte
// ─────────────────────────────────────────

// GetClaimsFromContext — récupère les claims depuis le contexte de la requête
// À utiliser dans les handlers après passage par RequirePro
func GetClaimsFromContext(r *http.Request) (*ProClaims, bool) {
	claims, ok := r.Context().Value(ContextKey).(*ProClaims)
	return claims, ok
}

// GetUserIdFromContext — raccourci pour récupérer l'id_user depuis le contexte
func GetUserIdFromContext(r *http.Request) (int, error) {
	claims, ok := GetClaimsFromContext(r)
	if !ok || claims == nil {
		return 0, fmt.Errorf("claims JWT absents du contexte")
	}
	return claims.IdUser, nil
}

// ─────────────────────────────────────────
// Helpers réponses HTTP
// ─────────────────────────────────────────

// sendJSONError — envoie une réponse d'erreur JSON standardisée
// Format cohérent avec ce que api.js côté front attend :
//   { "error": "message" }
func sendJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// ─────────────────────────────────────────
// CORS Helper — Headers CORS pour les requêtes cross-origin
// (front Vanilla JS servi depuis un domaine différent que l'API Go)
// ─────────────────────────────────────────

// setCORSHeaders — applique les headers CORS permissifs pour le développement
// En production, remplacer "*" par le domaine exact
func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		// Développement : autoriser tout
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else {
		// Production : vérifier l'origine
		for _, allowed := range strings.Split(allowedOrigins, ",") {
			if strings.TrimSpace(allowed) == origin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "86400")
}

// ─────────────────────────────────────────
// MIDDLEWARE — Chaîne de protection
// ─────────────────────────────────────────

// RequirePro — middleware principal pour l'Espace Pro
// Vérifie :
//   1. Présence et validité du Bearer token
//   2. Rôle == "Pro" (valeur SQL ENUM)
// Injecte les claims dans le contexte si valide.
// Retourne 401 si token absent/invalide, 403 si rôle insuffisant.
func RequirePro(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// CORS preflight
		setCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// 1. Extraire le token du header
		tokenString, err := extractTokenFromHeader(r)
		if err != nil {
			sendJSONError(w, http.StatusUnauthorized, "Authentification requise. "+err.Error())
			return
		}

		// 2. Valider et parser le token
		claims, err := ParseProToken(tokenString)
		if err != nil {
			sendJSONError(w, http.StatusUnauthorized, "Session expirée ou token invalide.")
			return
		}

		// 3. Vérifier le rôle
		// La valeur SQL ENUM est "Pro" (avec majuscule)
		if claims.Role != "Pro" {
			sendJSONError(w, http.StatusForbidden,
				fmt.Sprintf("Accès refusé. Rôle requis : Pro. Rôle actuel : %s", claims.Role))
			return
		}

		// 4. Injecter les claims dans le contexte
		ctx := context.WithValue(r.Context(), ContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePremium — middleware pour les routes réservées aux abonnés Premium
// À utiliser en plus de RequirePro (chaîner les deux)
// Retourne 403 avec un message d'upgrade si non Premium
func RequirePremium(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := GetClaimsFromContext(r)
		if !ok || claims == nil {
			sendJSONError(w, http.StatusUnauthorized, "Authentification requise.")
			return
		}

		if !claims.IsPremium {
			sendJSONError(w, http.StatusForbidden,
				"Cette fonctionnalité est réservée aux abonnés Pro Premium.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithCORS — middleware CORS standalone, à appliquer sur toutes les routes
// (y compris les routes publiques comme /api/auth/login)
func WithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RefreshToken — génère un nouveau token depuis des claims existants valides
// Appelé par POST /api/auth/refresh
func RefreshToken(oldClaims *ProClaims) (string, error) {
	return GenerateProToken(
		oldClaims.IdUser,
		oldClaims.Role,
		oldClaims.IsPremium,
		oldClaims.Nom,
		oldClaims.Prenom,
		oldClaims.Email,
	)
}
