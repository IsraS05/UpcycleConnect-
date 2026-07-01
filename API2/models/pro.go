// models/pro.go — UpcycleConnect
// Structs Go pour l'Espace Pro/Artisan
// Basé sur le schéma pa2026.sql et les fichiers bdd/*.go existants
//
// Convention adoptée (cohérente avec les modèles existants) :
//   - Champs JSON en snake_case pour correspondre aux noms SQL
//   - sql.NullString / sql.NullFloat64 pour les colonnes NULLables
//   - omitempty sur les champs optionnels

package models

import (
	"time"
)

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

// LoginRequest — corps du POST /api/auth/login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse — réponse du POST /api/auth/login
// Le token JWT est signé avec HS256, payload : { sub, role, exp }
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// ─────────────────────────────────────────
// DASHBOARD PRO (Tasks 38-40)
// ─────────────────────────────────────────

// ProDashboardKPIs — données KPI retournées par GET /api/pro/dashboard/kpis
type ProDashboardKPIs struct {
	// Upcycling score calculé depuis upcycling_score
	Score       int     `json:"score"`
	ScoreDelta  int     `json:"score_delta"`  // variation vs mois précédent
	// Objets récupérés (depots_box avec statut Récupéré)
	ObjectsSaved int    `json:"objects_saved"`
	ObjectsDelta int    `json:"objects_delta"`
	// Projets Pro actifs
	ActiveProjects int  `json:"active_projects"`
	// CO2/eau calculés côté Go : poids_evite_kg × coefficients
	Co2Kg   float64 `json:"co2_kg"`
	WaterL  int     `json:"water_l"`
	WasteKg float64 `json:"waste_kg"`
}

// ProAlert — une alerte dans le dashboard
type ProAlert struct {
	Id     int    `json:"id"`
	Level  string `json:"level"`  // "urgente" | "warn" | "info"
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Time   string `json:"time"`
	Read   bool   `json:"read"`
}

// ProActivityItem — activité récente du dashboard
type ProActivityItem struct {
	Icon   string `json:"icon"`
	Bg     string `json:"bg"`
	Label  string `json:"label"`
	Detail string `json:"detail"`
	Time   string `json:"time"`
}

// ─────────────────────────────────────────
// ABONNEMENT (Tasks 42-44)
// Étendu par rapport au modèle Abonnement existant
// ─────────────────────────────────────────

// ProSubscription — vue complète pour l'Espace Pro
// Jointure abonnement + plan_abo + utilisateur
type ProSubscription struct {
	Id             int       `json:"id"`
	Plan           string    `json:"plan"`         // "STANDARD" | "PREMIUM"
	Status         string    `json:"status"`       // "active" | "cancelled" | "past_due"
	PriceHT        float64   `json:"price_ht"`
	PriceTTC       float64   `json:"price_ttc"`
	TvaPct         int       `json:"tva_pct"`
	Currency       string    `json:"currency"`
	StartDate      time.Time `json:"start_date"`
	RenewalDate    time.Time `json:"renewal_date"`
	NextBilling    time.Time `json:"next_billing"`
	PaymentMethod  string    `json:"payment_method"`
	StripeCustomer string    `json:"stripe_customer"`
	// Infos entreprise depuis utilisateur
	Siret         string `json:"siret"`
	RaisonSociale string `json:"raison_sociale"`
}

// UpgradeRequest — corps du POST /api/pro/subscription/upgrade
type UpgradeRequest struct {
	Plan string `json:"plan"` // "STANDARD" | "PREMIUM"
}

// ─────────────────────────────────────────
// FACTURATION (Tasks 43-44)
// Basé sur tables commande + paiement + abonnement
// ─────────────────────────────────────────

// ProInvoice — une facture pour l'Espace Pro
// Générée depuis les commandes et abonnements
type ProInvoice struct {
	Id          string    `json:"id"`           // ex : "INV-2026-001"
	Date        time.Time `json:"date"`
	Year        int       `json:"year"`
	Description string    `json:"description"`
	Plan        string    `json:"plan"`
	Qty         int       `json:"qty"`
	PriceHT     float64   `json:"price_ht"`
	TvaPct      int       `json:"tva_pct"`
	TvaAmount   float64   `json:"tva_amount"`
	PriceTTC    float64   `json:"price_ttc"`
	Currency    string    `json:"currency"`
	Status      string    `json:"status"`       // "paid" | "pending" | "failed"
	StripeId    string    `json:"stripe_id"`
	// Infos entreprise
	RaisonSociale string `json:"raison_sociale"`
	Siret         string `json:"siret"`
	Address       string `json:"address"`
	// ID BDD source (commande ou abonnement)
	SourceId   int    `json:"source_id"`
	SourceType string `json:"source_type"` // "commande" | "abonnement"
}

// ─────────────────────────────────────────
// MARKETPLACE (Tasks 46-47)
// Basé sur tables annonce + utilisateur + categorie
// ─────────────────────────────────────────

// MarketItem — un objet dans la marketplace Pro
// Vue enrichie d'une annonce
type MarketItem struct {
	Id          int     `json:"id"`
	Material    string  `json:"material"`       // mappé depuis id_categorie
	Name        string  `json:"name"`
	Description string  `json:"description"`
	WeightKg    float64 `json:"weight_kg"`
	Condition   string  `json:"condition"`      // "bon" | "moyen"
	IsFree      bool    `json:"is_free"`
	Price       float64 `json:"price"`
	Location    string  `json:"location"`       // ville
	DistanceKm  float64 `json:"distance_km"`    // calculé côté client ou param lat/lng
	Arrond      string  `json:"arrondissement"`
	PostedAt    string  `json:"posted_at"`
	ObjectsCount int    `json:"objects_count"`
	Validated   bool    `json:"validated"`
	Seller      string  `json:"seller"`         // "Particulier · NOM"
	// IDs sources
	IdAnnonce   int    `json:"id_annonce"`
	IdUser      int    `json:"id_user"`
	IdCategorie int    `json:"id_categorie"`
}

// MarketItemFilters — filtres GET /api/pro/marketplace/items
type MarketItemFilters struct {
	Material  string  `json:"material"`
	Condition string  `json:"condition"`
	MaxPrice  float64 `json:"max_price"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Page      int     `json:"page"`
}

// CheckoutRequest — POST /api/pro/marketplace/checkout
type CheckoutRequest struct {
	ItemId   int `json:"item_id"`
	Quantity int `json:"quantity"`
}

// CheckoutResponse — réponse du checkout Stripe
type CheckoutResponse struct {
	StripeSessionUrl string `json:"stripe_session_url"`
}

// ─────────────────────────────────────────
// CONTENEURS (Tasks 48-49)
// Étendu depuis BoxConteneur existant
// ─────────────────────────────────────────

// ProContainer — vue enrichie d'un box_conteneur pour la carte Pro
type ProContainer struct {
	Id          int     `json:"id"`
	Name        string  `json:"name"`       // "Bastille — C-047"
	Status      string  `json:"status"`     // "libre" | "partiel" | "plein"
	Address     string  `json:"address"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	FillPct     int     `json:"fill_pct"`
	ObjectsCount int    `json:"objects_count"`
	Materials   []string `json:"materials"`
	LastUpdated string  `json:"last_updated"`
	DistanceM   int     `json:"distance_m"`
}

// ─────────────────────────────────────────
// SCANNER QR (Tasks 50-51)
// Basé sur depot_box
// ─────────────────────────────────────────

// ScanValidateRequest — POST /api/pro/scanner/validate
type ScanValidateRequest struct {
	QrCode string `json:"qr_code"` // Format : UC-C<id_box>-OBJ-<id_depot>
}

// ScanValidateResponse — réponse validation QR
type ScanValidateResponse struct {
	Container ProContainerMini `json:"container"`
	Object    ProScannedObject `json:"object"`
}

// ProContainerMini — version allégée pour le scanner
type ProContainerMini struct {
	Id      string `json:"id"`
	Name    string `json:"name"`
	Address string `json:"address"`
}

// ProScannedObject — objet trouvé après scan QR
type ProScannedObject struct {
	Id        string  `json:"id"`
	Name      string  `json:"name"`
	Material  string  `json:"material"`
	WeightKg  float64 `json:"weight_kg"`
	Condition string  `json:"condition"`
}

// CollectRequest — POST /api/pro/scanner/collect
type CollectRequest struct {
	ObjectId    string `json:"object_id"`
	ContainerId string `json:"container_id"`
}

// ─────────────────────────────────────────
// PROJETS PRO (Tasks 52-55)
// Basé sur projet_pro + depot_box + upcycling_score
// ─────────────────────────────────────────

// ProProject — un projet upcycling
// Enrichissement de projet_pro avec les données d'impact calculées
type ProProject struct {
	Id             int     `json:"id"`
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Material       string  `json:"material"`
	Icon           string  `json:"icon"`
	WeightKg       float64 `json:"weight_kg"`
	Step           string  `json:"step"`       // "COLLECTE" | "TRANSFORMATION" | "VENTE" | "TERMINE"
	Progress       int     `json:"progress"`   // 0-100
	CreatedAt      string  `json:"created_at"`
	EstimatedPrice float64 `json:"estimated_price"`
	Notes          string  `json:"notes"`
	ContainerId    string  `json:"container_id"`
	IsLate         bool    `json:"is_late"`
	LateDays       int     `json:"late_days"`
	Condition      string  `json:"condition"`
	// Photos (depuis projet_pro)
	UrlPhotoAvant string `json:"url_photo_avant,omitempty"`
	UrlPhotoApres string `json:"url_photo_apres,omitempty"`
	// Impact calculé (non stocké en BDD, calculé à la volée)
	ImpactCo2Kg    float64 `json:"impact_co2_kg"`
	ImpactWaterL   int     `json:"impact_water_l"`
	ImpactScore    int     `json:"impact_score"`
	IdUser         int     `json:"id_user"`
}

// ProjectCreateDTO — corps du POST /api/pro/projects
type ProjectCreateDTO struct {
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Material       string  `json:"material"`
	WeightKg       float64 `json:"weight_kg"`
	Step           string  `json:"step"`
	Condition      string  `json:"condition"`
	EstimatedPrice float64 `json:"estimated_price"`
	ContainerId    string  `json:"container_id"`
	Notes          string  `json:"notes"`
}

// ProjectUpdateStepDTO — corps du PATCH /api/pro/projects/:id/step
type ProjectUpdateStepDTO struct {
	Step string `json:"step"`
}

// ImpactData — résultat du calcul d'impact carbone
// Retourné par CalculateImpact() dans le service
type ImpactData struct {
	Co2Kg      float64 `json:"co2_kg"`
	WaterL     int     `json:"water_l"`
	ScorePoints int    `json:"score_points"`
	CoeffUsed  float64 `json:"coeff_used"`
}

// ─────────────────────────────────────────
// PROFIL PRO (Tasks 56-58)
// Étendu depuis utilisateur
// ─────────────────────────────────────────

// ProProfile — profil entreprise complet
type ProProfile struct {
	// Champs depuis utilisateur
	Id          int    `json:"id"`
	Nom         string `json:"nom"`
	Prenom      string `json:"prenom"`
	Email       string `json:"email"`
	// Champs entreprise depuis utilisateur
	TypeStatut    string `json:"type_statut"`    // "Artisan" | "Entreprise"
	NomEntreprise string `json:"raison_sociale"`
	Siret         string `json:"siret"`
	// Champs étendus (stockés ailleurs ou calculés)
	SecteurActivite string `json:"secteur_activite"`
	SiteWeb         string `json:"site_web"`
	Description     string `json:"description"`
	Adresse         string `json:"adresse"`
	CodePostal      string `json:"code_postal"`
	Ville           string `json:"ville"`
	Pays            string `json:"pays"`
	Telephone       string `json:"telephone"`
	EmailPro        string `json:"email_pro"`
	// Préférences notifications
	NotifConteneur bool `json:"notif_conteneur"`
	NotifAnnonce   bool `json:"notif_annonce"`
	NotifProjet    bool `json:"notif_projet"`
	NotifRecap     bool `json:"notif_recap"`
	// Statut vérification
	Verified   bool   `json:"verified"`
	VerifiedAt string `json:"verified_at,omitempty"`
	Premium    bool   `json:"premium"`
}

// ProDocument — un document légal uploadé
// Stocké dans la table document existante
type ProDocument struct {
	Id         int    `json:"id"`
	Type       string `json:"type"`        // "kbis" | "assurance" | "carte_artisan" | "rib" | "autre"
	Label      string `json:"label"`
	Filename   string `json:"filename"`
	Status     string `json:"status"`      // "ok" | "pending" | "missing"
	UploadedAt string `json:"uploaded_at"`
	ExpiresAt  string `json:"expires_at,omitempty"`
	UrlPdf     string `json:"url_pdf,omitempty"`
	IdUser     int    `json:"id_user"`
}

// ProVerification — statut de vérification du compte Pro
type ProVerification struct {
	EmailVerified  bool `json:"email_verified"`
	SiretVerified  bool `json:"siret_verified"`
	DocsVerified   bool `json:"docs_verified"`
	IdentityScore  int  `json:"identity_score"`
}

// ProfileUpdateDTO — corps du PUT /api/pro/profile
type ProfileUpdateDTO struct {
	TypeStatut      string `json:"type_statut"`
	NomEntreprise   string `json:"raison_sociale"`
	Siret           string `json:"siret"`
	SecteurActivite string `json:"secteur_activite"`
	SiteWeb         string `json:"site_web"`
	Description     string `json:"description"`
	Adresse         string `json:"adresse"`
	CodePostal      string `json:"code_postal"`
	Ville           string `json:"ville"`
	Pays            string `json:"pays"`
	Telephone       string `json:"telephone"`
	EmailPro        string `json:"email_pro"`
	NotifConteneur  bool   `json:"notif_conteneur"`
	NotifAnnonce    bool   `json:"notif_annonce"`
	NotifProjet     bool   `json:"notif_projet"`
	NotifRecap      bool   `json:"notif_recap"`
}

// ─────────────────────────────────────────
// NOTIFICATIONS (Task 41)
// Basé sur table notification existante
// ─────────────────────────────────────────

// ProNotification — notification push/email
type ProNotification struct {
	Id      int    `json:"id"`
	Contenu string `json:"contenu"`
	EstLu   bool   `json:"read"`
	IdUser  int    `json:"id_user"`
	// Champs déduits du contenu pour l'affichage
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Level  string `json:"level"` // "urgente" | "info" | "warn"
	Time   string `json:"time"`
}

// OneSignalSubscribeRequest — POST /api/pro/notifications/subscribe
type OneSignalSubscribeRequest struct {
	OnesignalPlayerId string `json:"onesignal_player_id"`
}
