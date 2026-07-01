// bdd/proReq.go — UpcycleConnect v2
// Requêtes BDD Espace Pro — MISE À JOUR après migration v2
//
// Changements vs v1 :
//   - projet_pro : utilise les vraies colonnes (material, step, weight_kg, condition_objet,
//                  estimated_price, progress, notes, id_box, created_at, icon)
//   - box_conteneur : utilise latitude, longitude, code_qr, capacite_max
//   - depot_box : utilise date_depot, date_recuperation, poids_kg, material, id_pro_recuperant
//   - upcycling_score : utilise co2_evite_kg, water_l_evite, nb_objets_mois, score_mois_prec
//   - annonce : utilise url_photo, poids_kg, date_creation
//   - notification : utilise niveau, date_creation, type_notif
//   - profil_pro_etendu : nouvelle table pour les champs étendus
//   - document : utilise filename, statut_verif, date_expiration

package bdd

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"
	"upcycleconnect/models"
)

// ═══════════════════════════════════════════
// ALGO IMPACT CARBONE (ADEME Base Carbone v22)
// Inchangé — coefficients de référence
// ═══════════════════════════════════════════

var co2Coefficients = map[string]float64{
	"bois":       0.42,
	"metal":      1.80,
	"plastique":  2.10,
	"textile":    5.50,
	"verre":      0.31,
	"papier":     0.90,
	"ceramique":  0.55,
	"cuir":       3.20,
	"caoutchouc": 1.40,
	"autre":      0.60,
}

func CalculateImpact(weightKg float64, material string) models.ImpactData {
	coeff       := co2Coefficients[strings.ToLower(material)]
	if coeff == 0 { coeff = co2Coefficients["autre"] }
	co2Kg       := math.Round(weightKg*coeff*100) / 100
	waterL      := int(math.Round(co2Kg * 4.3))
	scorePoints := int(math.Round(co2Kg*1.5 + weightKg*0.8))
	return models.ImpactData{Co2Kg: co2Kg, WaterL: waterL, ScorePoints: scorePoints, CoeffUsed: coeff}
}

// ─────────────────────────────────────────
// DASHBOARD KPIs — utilise les vraies colonnes v2
// ─────────────────────────────────────────

func GetProDashboardKPIs(idUser int) (models.ProDashboardKPIs, error) {
	var kpis models.ProDashboardKPIs

	// Upcycling score — colonnes co2_evite_kg et score_mois_prec maintenant disponibles
	err := Db.QueryRow(`
		SELECT
			COALESCE(points_totaux, 0),
			COALESCE(poids_evite_kg, 0),
			COALESCE(co2_evite_kg, 0),
			COALESCE(water_l_evite, 0),
			COALESCE(nb_objets_mois, 0),
			COALESCE(score_mois_prec, 0)
		FROM pa2026.upcycling_score
		WHERE id_user = ?
	`, idUser).Scan(
		&kpis.Score,
		&kpis.WasteKg,
		&kpis.Co2Kg,
		&kpis.WaterL,
		&kpis.ObjectsSaved,
		&kpis.ScoreDelta,
	)
	if err != nil {
		// Pas encore de score → zéros
		kpis.Score, kpis.Co2Kg, kpis.WaterL, kpis.ObjectsSaved = 0, 0, 0, 0
	}

	// Delta objets : objets récupérés ce mois vs mois précédent
	var objMoisPrec int
	_ = Db.QueryRow(`
		SELECT COUNT(*)
		FROM pa2026.depot_box
		WHERE id_pro_recuperant = ?
		  AND statut = 'Recupere'
		  AND MONTH(date_recuperation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
		  AND YEAR(date_recuperation)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
	`, idUser).Scan(&objMoisPrec)
	kpis.ObjectsDelta = kpis.ObjectsSaved - objMoisPrec

	// Projets actifs depuis projet_pro — step != 'TERMINE'
	_ = Db.QueryRow(`
		SELECT COUNT(*)
		FROM pa2026.projet_pro
		WHERE id_user = ? AND step != 'TERMINE'
	`, idUser).Scan(&kpis.ActiveProjects)

	// Projets en retard (progress < 80 et created_at > 30 jours)
	var lateProjects int
	_ = Db.QueryRow(`
		SELECT COUNT(*)
		FROM pa2026.projet_pro
		WHERE id_user = ?
		  AND step != 'TERMINE'
		  AND progress < 80
		  AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
	`, idUser).Scan(&lateProjects)
	// On stocke dans ObjectsDelta si positif pour info dashboard
	_ = lateProjects

	return kpis, nil
}

// GetProAlerts — utilise niveau et date_creation de la colonne migrée
func GetProAlerts(idUser int, limit int) ([]models.ProAlert, error) {
	var alerts []models.ProAlert

	rows, err := Db.Query(`
		SELECT id_notif, contenu, est_lu, niveau, COALESCE(type_notif, ''),
		       DATE_FORMAT(date_creation, '%d/%m %H:%i')
		FROM pa2026.notification
		WHERE id_user = ?
		ORDER BY date_creation DESC
		LIMIT ?
	`, idUser, limit)
	if err != nil {
		return nil, fmt.Errorf("GetProAlerts : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id       int
			contenu  string
			estLu    bool
			niveau   string
			typeNotif string
			dateStr  string
		)
		if err := rows.Scan(&id, &contenu, &estLu, &niveau, &typeNotif, &dateStr); err != nil {
			return nil, fmt.Errorf("GetProAlerts scan : %v", err)
		}
		alerts = append(alerts, models.ProAlert{
			Id:     id,
			Level:  niveau,
			Title:  contenu,
			Detail: typeNotif,
			Time:   dateStr,
			Read:   estLu,
		})
	}
	return alerts, rows.Err()
}

func MarkAlertRead(idNotif int, idUser int) error {
	result, err := Db.Exec(
		"UPDATE pa2026.notification SET est_lu = TRUE WHERE id_notif = ? AND id_user = ?",
		idNotif, idUser,
	)
	if err != nil {
		return fmt.Errorf("MarkAlertRead : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("notification %d introuvable pour user %d", idNotif, idUser)
	}
	return nil
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

func GetProNotifications(idUser int) ([]models.ProNotification, error) {
	var notifs []models.ProNotification

	rows, err := Db.Query(`
		SELECT id_notif, contenu, est_lu, niveau,
		       COALESCE(type_notif, ''),
		       DATE_FORMAT(date_creation, '%d/%m/%Y %H:%i')
		FROM pa2026.notification
		WHERE id_user = ?
		ORDER BY date_creation DESC
	`, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetProNotifications : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var n models.ProNotification
		if err := rows.Scan(&n.Id, &n.Contenu, &n.EstLu, &n.Level, &n.Detail, &n.Time); err != nil {
			return nil, fmt.Errorf("GetProNotifications scan : %v", err)
		}
		n.IdUser = idUser
		n.Title  = n.Contenu
		notifs = append(notifs, n)
	}
	return notifs, rows.Err()
}

func MarkAllNotificationsRead(idUser int) error {
	_, err := Db.Exec("UPDATE pa2026.notification SET est_lu = TRUE WHERE id_user = ?", idUser)
	return err
}

// ─────────────────────────────────────────
// ABONNEMENT
// ─────────────────────────────────────────

func GetProSubscription(idUser int) (models.ProSubscription, error) {
	var sub models.ProSubscription

	err := Db.QueryRow(`
		SELECT a.id_abonnement, p.nom, a.statut, p.prix,
		       a.date_debut, a.date_fin,
		       COALESCE(u.nom_entreprise, CONCAT(u.prenom, ' ', u.nom)),
		       COALESCE(u.siret, '')
		FROM pa2026.abonnement a
		INNER JOIN pa2026.plan_abo p     ON p.id_plan  = a.id_plan
		INNER JOIN pa2026.utilisateur u  ON u.id_user  = a.id_user
		WHERE a.id_user = ? AND a.statut = 'Actif'
		ORDER BY a.id_abonnement DESC
		LIMIT 1
	`, idUser).Scan(
		&sub.Id, &sub.Plan, &sub.Status, &sub.PriceTTC,
		&sub.StartDate, &sub.RenewalDate,
		&sub.RaisonSociale, &sub.Siret,
	)
	if err != nil {
		return sub, fmt.Errorf("GetProSubscription : %v", err)
	}

	sub.TvaPct      = 20
	sub.PriceHT     = math.Round(sub.PriceTTC/1.20*100) / 100
	sub.Currency    = "EUR"
	sub.NextBilling = sub.RenewalDate

	switch sub.Status {
	case "Actif":   sub.Status = "active"
	default:        sub.Status = "cancelled"
	}

	if strings.Contains(strings.ToUpper(sub.Plan), "PREMIUM") {
		sub.Plan = "PREMIUM"
	} else {
		sub.Plan = "STANDARD"
	}

	return sub, nil
}

func UpgradeSubscription(idUser int, newPlan string) error {
	query := "SELECT id_plan FROM pa2026.plan_abo WHERE nom LIKE ? LIMIT 1"
	pattern := "%Premium%"
	if newPlan == "STANDARD" {
		pattern = "%Standard%"
	}

	var idPlan int
	if err := Db.QueryRow(query, pattern).Scan(&idPlan); err != nil {
		return fmt.Errorf("UpgradeSubscription plan '%s' introuvable: %v", newPlan, err)
	}

	_, err := Db.Exec(`
		UPDATE pa2026.abonnement
		SET id_plan = ?,
		    date_fin = DATE_ADD(date_debut,
		        INTERVAL (SELECT duree_mois FROM pa2026.plan_abo WHERE id_plan = ?) MONTH)
		WHERE id_user = ? AND statut = 'Actif'
	`, idPlan, idPlan, idUser)
	return err
}

func CancelSubscription(idUser int) error {
	result, err := Db.Exec(
		"UPDATE pa2026.abonnement SET statut = 'Annule' WHERE id_user = ? AND statut = 'Actif'",
		idUser,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("aucun abonnement actif pour user %d", idUser)
	}
	return nil
}

// ─────────────────────────────────────────
// FACTURES — utilise date_paiement et montant migrés
// ─────────────────────────────────────────

func GetProInvoices(idUser int) ([]models.ProInvoice, error) {
	var invoices []models.ProInvoice

	rows, err := Db.Query(`
		SELECT c.id_commande, c.montant_total, c.commission, c.date_commande,
		       COALESCE(p.statut, 'En attente'),
		       COALESCE(p.stripe_id, ''),
		       COALESCE(u.nom_entreprise, CONCAT(u.prenom, ' ', u.nom)),
		       COALESCE(u.siret, '')
		FROM pa2026.commande c
		LEFT JOIN pa2026.paiement p     ON p.id_commande = c.id_commande
		INNER JOIN pa2026.utilisateur u ON u.id_user     = c.id_user
		WHERE c.id_user = ?
		ORDER BY c.date_commande DESC
	`, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetProInvoices : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        int
			montant   float64
			commission float64
			dateCmd   time.Time
			statut    string
			stripeId  string
			raisonSoc string
			siret     string
		)
		if err := rows.Scan(&id, &montant, &commission, &dateCmd, &statut, &stripeId, &raisonSoc, &siret); err != nil {
			return nil, fmt.Errorf("GetProInvoices scan : %v", err)
		}

		ttc     := montant
		ht      := math.Round(ttc/1.20*100) / 100
		tvaAmt  := math.Round((ttc-ht)*100) / 100

		frontStatus := map[string]string{
			"Paye": "paid", "Echoue": "failed",
		}[statut]
		if frontStatus == "" { frontStatus = "pending" }

		invoices = append(invoices, models.ProInvoice{
			Id:            fmt.Sprintf("INV-%d-%03d", dateCmd.Year(), id),
			Date:          dateCmd,
			Year:          dateCmd.Year(),
			Description:   fmt.Sprintf("Abonnement UpcycleConnect — %s", dateCmd.Format("January 2006")),
			Plan:          "Pro Premium",
			Qty:           1,
			PriceHT:       ht,
			TvaPct:        20,
			TvaAmount:     tvaAmt,
			PriceTTC:      ttc,
			Currency:      "EUR",
			Status:        frontStatus,
			StripeId:      stripeId,
			RaisonSociale: raisonSoc,
			Siret:         siret,
			SourceId:      id,
			SourceType:    "commande",
		})
	}
	return invoices, rows.Err()
}

// ─────────────────────────────────────────
// MARKETPLACE — utilise url_photo, poids_kg, date_creation
// ─────────────────────────────────────────

func GetProMarketItems(material string, condition string) ([]models.MarketItem, error) {
	var items []models.MarketItem

	query := `
		SELECT a.id_annonce, a.titre, a.description, a.type, a.prix,
		       a.code_postal, a.ville,
		       COALESCE(a.url_photo, ''),
		       COALESCE(a.poids_kg, 0),
		       DATE_FORMAT(a.date_creation, '%Y-%m-%d'),
		       u.nom, u.prenom, u.role,
		       c.libelle, a.id_user, a.id_categorie
		FROM pa2026.annonce a
		INNER JOIN pa2026.utilisateur u ON u.id_user      = a.id_user
		INNER JOIN pa2026.categorie c   ON c.id_categorie = a.id_categorie
		WHERE a.statut_validation = 'Valide'`

	args := []interface{}{}
	if material != "" && material != "tous" {
		query += " AND LOWER(c.libelle) LIKE ?"
		args = append(args, "%"+strings.ToLower(material)+"%")
	}
	query += " ORDER BY a.date_creation DESC"

	rows, err := Db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("GetProMarketItems : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id, idUser, idCat int
			titre, desc, typeA, codePostal, ville sql.NullString
			urlPhoto, postedAt, libelle           string
			prixF, poidsKg                        float64
			nomUser, prenomUser, roleUser          string
		)
		if err := rows.Scan(
			&id, &titre, &desc, &typeA, &prixF,
			&codePostal, &ville, &urlPhoto, &poidsKg, &postedAt,
			&nomUser, &prenomUser, &roleUser,
			&libelle, &idUser, &idCat,
		); err != nil {
			return nil, fmt.Errorf("GetProMarketItems scan : %v", err)
		}

		seller := fmt.Sprintf("Particulier · %s %s", prenomUser, nomUser)
		if roleUser == "Pro" { seller = fmt.Sprintf("Artisan · %s %s", prenomUser, nomUser) }
		
		items = append(items, models.MarketItem{
			Id:          id,
   			Material:    mapCategorieToMaterial(libelle),
   			Name:        titre.String,        
   			Description: desc.String,         
   			WeightKg:    poidsKg,
   			Condition:   condition,
   			IsFree:      typeA.String == "Don", 
   			Price:       prixF,
   			Location:    ville.String,        
   			PostedAt:    postedAt,
   			ObjectsCount: 1,
   			Validated:   true,
   			Seller:      seller,
   			IdAnnonce:   id,
   			IdUser:      idUser,
   			IdCategorie: idCat,
		})
	}
	return items, rows.Err()
}

func mapCategorieToMaterial(libelle string) string {
	l := strings.ToLower(libelle)
	switch {
	case strings.Contains(l, "bois") || strings.Contains(l, "palette") || strings.Contains(l, "mobilier"):
		return "bois"
	case strings.Contains(l, "métal") || strings.Contains(l, "metal") || strings.Contains(l, "outil") || strings.Contains(l, "ferronner"):
		return "metal"
	case strings.Contains(l, "textile") || strings.Contains(l, "cuir"):
		return "textile"
	case strings.Contains(l, "verre") || strings.Contains(l, "céramique") || strings.Contains(l, "ceramique"):
		return "verre"
	case strings.Contains(l, "plastique") || strings.Contains(l, "caoutchouc"):
		return "plastique"
	case strings.Contains(l, "papier") || strings.Contains(l, "carton") || strings.Contains(l, "livre"):
		return "papier"
	default:
		return "autre"
	}
}

func CreateCheckoutRecord(idUser int, idAnnonce int, montant float64) (int, error) {
	commission := math.Round(montant*0.05*100) / 100

	result, err := Db.Exec(
		"INSERT INTO pa2026.commande (montant_total, commission, id_user) VALUES (?, ?, ?)",
		montant, commission, idUser,
	)
	if err != nil {
		return 0, fmt.Errorf("CreateCheckoutRecord commande : %v", err)
	}
	id64, _ := result.LastInsertId()
	commandeId := int(id64)

	// Colonnes réelles : stripe_id, statut, id_commande
	_, err = Db.Exec(
    "INSERT INTO pa2026.paiement (stripe_id, statut, montant, type_paiement, id_commande) VALUES (?, 'En attente', ?, 'Marketplace', ?)",
	    fmt.Sprintf("pending_%d", commandeId), montant, commandeId,
	)
	if err != nil {
		return 0, fmt.Errorf("CreateCheckoutRecord paiement : %v", err)
	}
	return commandeId, nil
}

// Utilisée par le webhook pour confirmer le paiement
func UpdatePaiementByCommande(commandeId int, stripeSessionId string, statut string) error {
    result, err := Db.Exec(`
        UPDATE pa2026.paiement p
        JOIN pa2026.commande c ON c.id_commande = p.id_commande
        SET p.stripe_id = ?, p.statut = ?, p.montant = c.montant_total
        WHERE p.id_commande = ?`,
        stripeSessionId, statut, commandeId,
    )
	if err != nil {
		return fmt.Errorf("UpdatePaiementByCommande : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("aucun paiement trouvé pour commande %d", commandeId)
	}
	return nil
}

// ─────────────────────────────────────────
// CONTENEURS — utilise latitude, longitude, code_qr, capacite_max
// ─────────────────────────────────────────

func GetProContainers() ([]models.ProContainer, error) {
	var containers []models.ProContainer

	rows, err := Db.Query(`
		SELECT b.id_box, b.localisation, b.etat,
		       COALESCE(b.latitude, 0),
		       COALESCE(b.longitude, 0),
		       COALESCE(b.code_qr, CONCAT('UC-C', LPAD(b.id_box, 3, '0'))),
		       b.capacite_max,
		       COUNT(d.id_depot) AS nb_depots,
		       DATE_FORMAT(b.updated_at, '%Y-%m-%dT%H:%i:%sZ')
		FROM pa2026.box_conteneur b
		LEFT JOIN pa2026.depot_box d
		       ON d.id_box = b.id_box AND d.statut = 'En attente'
		GROUP BY b.id_box, b.localisation, b.etat,
		         b.latitude, b.longitude, b.code_qr, b.capacite_max, b.updated_at
		ORDER BY b.id_box
	`)
	if err != nil {
		return nil, fmt.Errorf("GetProContainers : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id           int
			localisation string
			etat         string
			lat, lng     float64
			codeQR       string
			capacite     int
			nbDepots     int
			updatedAt    string
		)
		if err := rows.Scan(&id, &localisation, &etat, &lat, &lng, &codeQR, &capacite, &nbDepots, &updatedAt); err != nil {
			return nil, fmt.Errorf("GetProContainers scan : %v", err)
		}

		fillPct := 0
		if capacite > 0 {
			fillPct = int(math.Min(100, float64(nbDepots)/float64(capacite)*100))
		}
		if etat == "Plein" { fillPct = 100 }

		status := map[string]string{
			"Plein":       "plein",
			"Maintenance": "partiel",
			"Disponible":  "libre",
		}[etat]

		containers = append(containers, models.ProContainer{
			Id:           id,
			Name:         fmt.Sprintf("%s — %s", extractVille(localisation), codeQR),
			Status:       status,
			Address:      localisation,
			Lat:          lat,
			Lng:          lng,
			FillPct:      fillPct,
			ObjectsCount: nbDepots,
			Materials:    []string{"bois", "metal"},
			LastUpdated:  updatedAt,
		})
	}
	return containers, rows.Err()
}

func GetProContainerById(id int) (models.ProContainer, error) {
	var c models.ProContainer
	var etat string
	var nbDepots int
	var lat, lng float64
	var codeQR string
	var capacite int

	err := Db.QueryRow(`
		SELECT b.id_box, b.localisation, b.etat,
		       COALESCE(b.latitude, 0), COALESCE(b.longitude, 0),
		       COALESCE(b.code_qr, CONCAT('UC-C', LPAD(b.id_box, 3, '0'))),
		       b.capacite_max,
		       COUNT(d.id_depot)
		FROM pa2026.box_conteneur b
		LEFT JOIN pa2026.depot_box d ON d.id_box = b.id_box AND d.statut = 'En attente'
		WHERE b.id_box = ?
		GROUP BY b.id_box, b.localisation, b.etat, b.latitude, b.longitude, b.code_qr, b.capacite_max
	`, id).Scan(&c.Id, &c.Address, &etat, &lat, &lng, &codeQR, &capacite, &nbDepots)
	if err != nil {
		return c, fmt.Errorf("GetProContainerById %d : %v", id, err)
	}

	c.Lat    = lat
	c.Lng    = lng
	c.Name   = fmt.Sprintf("%s — %s", extractVille(c.Address), codeQR)
	c.Status = map[string]string{"Plein":"plein","Maintenance":"partiel","Disponible":"libre"}[etat]
	c.ObjectsCount = nbDepots
	c.Materials    = []string{"bois", "metal"}
	if capacite > 0 {
		c.FillPct = int(math.Min(100, float64(nbDepots)/float64(capacite)*100))
	}
	if etat == "Plein" { c.FillPct = 100 }
	return c, nil
}

func extractVille(localisation string) string {
	if p := strings.SplitN(localisation, " - ", 2); len(p) > 0 {
		return strings.TrimSpace(p[0])
	}
	return localisation
}

// ─────────────────────────────────────────
// SCANNER QR — utilise code_qr et les nouvelles colonnes depot_box
// ─────────────────────────────────────────

func ValidateQRCode(qrCode string) (models.ScanValidateResponse, error) {
	var result models.ScanValidateResponse
	upper := strings.ToUpper(strings.TrimSpace(qrCode))

	// 1. Chercher directement par code_qr dans box_conteneur
	var (
		idBox        int
		localisation string
		etat         string
	)
	err := Db.QueryRow(`
		SELECT id_box, localisation, etat
		FROM pa2026.box_conteneur
		WHERE code_qr = ?
	`, upper).Scan(&idBox, &localisation, &etat)

	if err != nil {
		// 2. Fallback : parser le format UC-C<id>-OBJ-<id>
		var idDepot int
		_, parseErr := fmt.Sscanf(upper, "UC-C%d-OBJ-%d", &idBox, &idDepot)
		if parseErr != nil {
			return result, fmt.Errorf("QR Code non reconnu : %s", qrCode)
		}

		// Chercher le conteneur par ID
		err2 := Db.QueryRow(
			"SELECT localisation, etat FROM pa2026.box_conteneur WHERE id_box = ?",
			idBox,
		).Scan(&localisation, &etat)
		if err2 != nil {
			return result, fmt.Errorf("conteneur C-%03d introuvable", idBox)
		}

		// Chercher le dépôt
		var depot struct {
			codeOuv  string
			statut   string
			poids    float64
			material string
			desc     string
		}
		err3 := Db.QueryRow(`
			SELECT code_ouverture, statut,
			       COALESCE(poids_kg, 0),
			       COALESCE(material, 'autre'),
			       COALESCE(description_objet, 'Objet à récupérer')
			FROM pa2026.depot_box
			WHERE id_depot = ? AND id_box = ?
		`, idDepot, idBox).Scan(
			&depot.codeOuv, &depot.statut,
			&depot.poids, &depot.material, &depot.desc,
		)
		if err3 != nil {
			return result, fmt.Errorf("objet OBJ-%04d introuvable dans C-%03d", idDepot, idBox)
		}
		if depot.statut == "Recupere" {
			return result, fmt.Errorf("cet objet a déjà été récupéré")
		}

		result.Object = models.ProScannedObject{
			Id:        fmt.Sprintf("OBJ-%04d", idDepot),
			Name:      depot.desc,
			Material:  depot.material,
			WeightKg:  depot.poids,
			Condition: "bon",
		}
	} else {
		// QR du conteneur scanné directement — retourner le 1er dépôt disponible
		var depot struct {
			id       int
			poids    float64
			material string
			desc     string
		}
		err2 := Db.QueryRow(`
			SELECT id_depot,
			       COALESCE(poids_kg, 0),
			       COALESCE(material, 'autre'),
			       COALESCE(description_objet, 'Objet disponible')
			FROM pa2026.depot_box
			WHERE id_box = ? AND statut = 'En attente'
			ORDER BY date_depot ASC
			LIMIT 1
		`, idBox).Scan(&depot.id, &depot.poids, &depot.material, &depot.desc)
		if err2 != nil {
			return result, fmt.Errorf("aucun objet disponible dans ce conteneur")
		}

		result.Object = models.ProScannedObject{
			Id:        fmt.Sprintf("OBJ-%04d", depot.id),
			Name:      depot.desc,
			Material:  depot.material,
			WeightKg:  depot.poids,
			Condition: "bon",
		}
	}

	result.Container = models.ProContainerMini{
		Id:      fmt.Sprintf("C-%03d", idBox),
		Name:    fmt.Sprintf("%s — C-%03d", extractVille(localisation), idBox),
		Address: localisation,
	}
	return result, nil
}

func ConfirmCollection(idUser int, objectId string, containerId string) error {
	var idDepot, idBox int
	fmt.Sscanf(objectId, "OBJ-%d", &idDepot)
	fmt.Sscanf(containerId, "C-%d", &idBox)

	// Marquer le dépôt Recupere + enregistrer qui l'a pris et quand
	result, err := Db.Exec(`
		UPDATE pa2026.depot_box
		SET statut             = 'Recupere',
		    id_pro_recuperant  = ?,
		    date_recuperation  = NOW()
		WHERE id_depot = ? AND id_box = ? AND statut != 'Recupere'
	`, idUser, idDepot, idBox)
	if err != nil {
		return fmt.Errorf("ConfirmCollection depot_box : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("OBJ-%04d non trouvé ou déjà récupéré", idDepot)
	}

	// Récupérer poids et matière pour le calcul CO2
	var poids float64
	var material string
	_ = Db.QueryRow(
		"SELECT COALESCE(poids_kg,0), COALESCE(material,'autre') FROM pa2026.depot_box WHERE id_depot = ?",
		idDepot,
	).Scan(&poids, &material)

	impact := CalculateImpact(poids, material)

	// UPSERT upcycling_score avec les vraies colonnes v2
	_, err = Db.Exec(`
		INSERT INTO pa2026.upcycling_score
		    (id_user, points_totaux, poids_evite_kg, co2_evite_kg, water_l_evite, nb_objets_mois)
		VALUES (?, ?, ?, ?, ?, 1)
		ON DUPLICATE KEY UPDATE
		    points_totaux   = points_totaux   + VALUES(points_totaux),
		    poids_evite_kg  = poids_evite_kg  + VALUES(poids_evite_kg),
		    co2_evite_kg    = co2_evite_kg    + VALUES(co2_evite_kg),
		    water_l_evite   = water_l_evite   + VALUES(water_l_evite),
		    nb_objets_mois  = nb_objets_mois  + 1
	`, idUser, impact.ScorePoints, poids, impact.Co2Kg, impact.WaterL)
	if err != nil {
		fmt.Printf("[WARN] ConfirmCollection score : %v\n", err)
	}

	// Créer une notification pour l'utilisateur
	_, _ = Db.Exec(`
		INSERT INTO pa2026.notification (contenu, est_lu, niveau, type_notif, id_user)
		VALUES (?, FALSE, 'info', 'collecte_confirmee', ?)
	`, fmt.Sprintf("Collecte confirmée : +%d pts Upcycling (+%.1f kg CO₂ évité)", impact.ScorePoints, impact.Co2Kg), idUser)

	return nil
}

// ─────────────────────────────────────────
// PROJETS PRO — utilise TOUTES les colonnes v2
// ─────────────────────────────────────────

func GetProProjects(idUser int) ([]models.ProProject, error) {
	var projects []models.ProProject

	rows, err := Db.Query(`
		SELECT p.id_projet, p.titre, COALESCE(p.description, ''),
		       p.material, p.step, p.weight_kg, p.condition_objet,
		       p.estimated_price, p.progress,
		       COALESCE(p.notes, ''), p.icon,
		       COALESCE(p.id_box, 0),
		       DATE_FORMAT(p.created_at, '%Y-%m-%d'),
		       COALESCE(p.url_photo_avant, ''),
		       COALESCE(p.url_photo_apres, ''),
		       -- is_late : progress < 80 et créé > 30 jours et pas terminé
		       (p.step != 'TERMINE' AND p.progress < 80
		        AND p.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS is_late,
		       GREATEST(0, DATEDIFF(CURDATE(),
		           DATE_ADD(p.created_at, INTERVAL 30 DAY))) AS late_days
		FROM pa2026.projet_pro p
		WHERE p.id_user = ?
		ORDER BY p.created_at DESC
	`, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetProProjects : %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var p models.ProProject
		var idBox int
		var isLate bool

		if err := rows.Scan(
			&p.Id, &p.Name, &p.Description,
			&p.Material, &p.Step, &p.WeightKg, &p.Condition,
			&p.EstimatedPrice, &p.Progress,
			&p.Notes, &p.Icon,
			&idBox, &p.CreatedAt,
			&p.UrlPhotoAvant, &p.UrlPhotoApres,
			&isLate, &p.LateDays,
		); err != nil {
			return nil, fmt.Errorf("GetProProjects scan : %v", err)
		}

		p.IdUser = idUser
		p.IsLate = isLate
		if idBox > 0 {
			p.ContainerId = fmt.Sprintf("C-%03d", idBox)
		}

		// Calcul d'impact à la volée
		impact      := CalculateImpact(p.WeightKg, p.Material)
		p.ImpactCo2Kg  = impact.Co2Kg
		p.ImpactWaterL = impact.WaterL
		p.ImpactScore  = impact.ScorePoints

		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func GetProProjectById(id int, idUser int) (models.ProProject, error) {
	var p models.ProProject
	var idBox int
	var isLate bool

	err := Db.QueryRow(`
		SELECT p.id_projet, p.titre, COALESCE(p.description, ''),
		       p.material, p.step, p.weight_kg, p.condition_objet,
		       p.estimated_price, p.progress,
		       COALESCE(p.notes, ''), p.icon,
		       COALESCE(p.id_box, 0),
		       DATE_FORMAT(p.created_at, '%Y-%m-%d'),
		       COALESCE(p.url_photo_avant, ''),
		       COALESCE(p.url_photo_apres, ''),
		       (p.step != 'TERMINE' AND p.progress < 80
		        AND p.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS is_late,
		       GREATEST(0, DATEDIFF(CURDATE(),
		           DATE_ADD(p.created_at, INTERVAL 30 DAY))) AS late_days
		FROM pa2026.projet_pro p
		WHERE p.id_projet = ? AND p.id_user = ?
	`, id, idUser).Scan(
		&p.Id, &p.Name, &p.Description,
		&p.Material, &p.Step, &p.WeightKg, &p.Condition,
		&p.EstimatedPrice, &p.Progress,
		&p.Notes, &p.Icon,
		&idBox, &p.CreatedAt,
		&p.UrlPhotoAvant, &p.UrlPhotoApres,
		&isLate, &p.LateDays,
	)
	if err != nil {
		return p, fmt.Errorf("GetProProjectById %d : %v", id, err)
	}

	p.IdUser = idUser
	p.IsLate = isLate
	if idBox > 0 { p.ContainerId = fmt.Sprintf("C-%03d", idBox) }

	impact := CalculateImpact(p.WeightKg, p.Material)
	p.ImpactCo2Kg  = impact.Co2Kg
	p.ImpactWaterL = impact.WaterL
	p.ImpactScore  = impact.ScorePoints
	return p, nil
}

func CreateProProject(idUser int, dto models.ProjectCreateDTO) (int, error) {
	// Parser l'id_box depuis container_id (ex: "C-047" → 47)
	var idBox *int
	if dto.ContainerId != "" {
		var n int
		if _, err := fmt.Sscanf(dto.ContainerId, "C-%d", &n); err == nil && n > 0 {
			idBox = &n
		}
	}

	result, err := Db.Exec(`
		INSERT INTO pa2026.projet_pro
		    (titre, description, material, step, weight_kg, condition_objet,
		     estimated_price, progress, notes, icon, id_box, id_user)
		VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, '♻️', ?, ?)
	`,
		dto.Name, dto.Description, dto.Material, dto.Step, dto.WeightKg,
		dto.Condition, dto.EstimatedPrice, dto.Notes, idBox, idUser,
	)
	if err != nil {
		return 0, fmt.Errorf("CreateProProject : %v", err)
	}
	id64, _ := result.LastInsertId()
	return int(id64), nil
}

func UpdateProProject(id int, idUser int, dto models.ProjectCreateDTO) error {
	result, err := Db.Exec(`
		UPDATE pa2026.projet_pro
		SET titre           = ?,
		    description     = ?,
		    material        = ?,
		    step            = ?,
		    weight_kg       = ?,
		    condition_objet = ?,
		    estimated_price = ?,
		    notes           = ?
		WHERE id_projet = ? AND id_user = ?
	`,
		dto.Name, dto.Description, dto.Material, dto.Step, dto.WeightKg,
		dto.Condition, dto.EstimatedPrice, dto.Notes,
		id, idUser,
	)
	if err != nil {
		return fmt.Errorf("UpdateProProject : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("projet %d introuvable pour user %d", id, idUser)
	}
	return nil
}

func UpdateProProjectStep(id int, idUser int, step string) error {
	progress := map[string]int{
		"COLLECTE": 10, "TRANSFORMATION": 45, "VENTE": 80, "TERMINE": 100,
	}[step]

	result, err := Db.Exec(`
		UPDATE pa2026.projet_pro
		SET step = ?, progress = ?
		WHERE id_projet = ? AND id_user = ?
	`, step, progress, id, idUser)
	if err != nil {
		return fmt.Errorf("UpdateProProjectStep : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("projet %d introuvable pour user %d", id, idUser)
	}
	return nil
}

func DeleteProProject(id int, idUser int) error {
	result, err := Db.Exec(
		"DELETE FROM pa2026.projet_pro WHERE id_projet = ? AND id_user = ?",
		id, idUser,
	)
	if err != nil {
		return fmt.Errorf("DeleteProProject : %v", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("projet %d introuvable pour user %d", id, idUser)
	}
	return nil
}

// ─────────────────────────────────────────
// PROFIL PRO — utilise profil_pro_etendu (nouvelle table v2)
// ─────────────────────────────────────────

func GetProProfile(idUser int) (models.ProProfile, error) {
	var p models.ProProfile

	// Jointure utilisateur + profil_pro_etendu (LEFT JOIN car le profil étendu peut ne pas exister)
	err := Db.QueryRow(`
		SELECT u.id_user, u.nom, u.prenom, u.email,
		       COALESCE(u.type_statut, ''),
		       COALESCE(u.nom_entreprise, ''),
		       COALESCE(u.siret, ''),
		       COALESCE(e.secteur_activite, ''),
		       COALESCE(e.site_web, ''),
		       COALESCE(e.description_activite, ''),
		       COALESCE(e.adresse_pro, ''),
		       COALESCE(e.code_postal, ''),
		       COALESCE(e.ville_pro, ''),
		       COALESCE(e.pays, 'FR'),
		       COALESCE(e.telephone_pro, ''),
		       COALESCE(e.email_pro, u.email),
		       COALESCE(e.notif_conteneur, TRUE),
		       COALESCE(e.notif_annonce, TRUE),
		       COALESCE(e.notif_projet, TRUE),
		       COALESCE(e.notif_recap, FALSE),
		       COALESCE(e.siret_verifie, FALSE)
		FROM pa2026.utilisateur u
		LEFT JOIN pa2026.profil_pro_etendu e ON e.id_user = u.id_user
		WHERE u.id_user = ? AND u.role = 'Pro'
	`, idUser).Scan(
		&p.Id, &p.Nom, &p.Prenom, &p.Email,
		&p.TypeStatut, &p.NomEntreprise, &p.Siret,
		&p.SecteurActivite, &p.SiteWeb, &p.Description,
		&p.Adresse, &p.CodePostal, &p.Ville, &p.Pays,
		&p.Telephone, &p.EmailPro,
		&p.NotifConteneur, &p.NotifAnnonce, &p.NotifProjet, &p.NotifRecap,
		&p.Verified,
	)
	if err != nil {
		return p, fmt.Errorf("GetProProfile %d : %v", idUser, err)
	}

	// Is Premium ?
	var countPremium int
	_ = Db.QueryRow(`
		SELECT COUNT(*) FROM pa2026.abonnement a
		INNER JOIN pa2026.plan_abo p ON p.id_plan = a.id_plan
		WHERE a.id_user = ? AND a.statut = 'Actif'
		  AND (p.nom LIKE '%Premium%' OR p.nom LIKE '%Pro%')
	`, idUser).Scan(&countPremium)
	p.Premium = countPremium > 0

	return p, nil
}

func UpdateProProfile(idUser int, dto models.ProfileUpdateDTO) error {
	// 1. Mettre à jour utilisateur (champs existants)
	_, err := Db.Exec(`
		UPDATE pa2026.utilisateur
		SET type_statut    = ?,
		    nom_entreprise = ?,
		    siret          = ?
		WHERE id_user = ? AND role = 'Pro'
	`, dto.TypeStatut, dto.NomEntreprise, dto.Siret, idUser)
	if err != nil {
		return fmt.Errorf("UpdateProProfile utilisateur : %v", err)
	}

	// 2. UPSERT profil_pro_etendu (champs étendus)
	_, err = Db.Exec(`
		INSERT INTO pa2026.profil_pro_etendu
		    (id_user, secteur_activite, site_web, description_activite,
		     adresse_pro, code_postal, ville_pro, pays,
		     telephone_pro, email_pro,
		     notif_conteneur, notif_annonce, notif_projet, notif_recap)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		    secteur_activite    = VALUES(secteur_activite),
		    site_web            = VALUES(site_web),
		    description_activite= VALUES(description_activite),
		    adresse_pro         = VALUES(adresse_pro),
		    code_postal         = VALUES(code_postal),
		    ville_pro           = VALUES(ville_pro),
		    pays               = VALUES(pays),
		    telephone_pro       = VALUES(telephone_pro),
		    email_pro           = VALUES(email_pro),
		    notif_conteneur     = VALUES(notif_conteneur),
		    notif_annonce       = VALUES(notif_annonce),
		    notif_projet        = VALUES(notif_projet),
		    notif_recap         = VALUES(notif_recap)
	`,
		idUser, dto.SecteurActivite, dto.SiteWeb, dto.Description,
		dto.Adresse, dto.CodePostal, dto.Ville, dto.Pays,
		dto.Telephone, dto.EmailPro,
		dto.NotifConteneur, dto.NotifAnnonce, dto.NotifProjet, dto.NotifRecap,
	)
	return err
}

func GetProDocuments(idUser int) ([]models.ProDocument, error) {
	var docs []models.ProDocument

	rows, err := Db.Query(`
		SELECT id_document, type_doc, url_pdf,
		       COALESCE(filename, ''),
		       statut_verif,
		       DATE_FORMAT(date_upload, '%Y-%m-%d'),
		       COALESCE(DATE_FORMAT(date_expiration, '%Y-%m-%d'), '')
		FROM pa2026.document
		WHERE id_user = ?
		ORDER BY date_upload DESC
	`, idUser)
	if err != nil {
		return nil, fmt.Errorf("GetProDocuments : %v", err)
	}
	defer rows.Close()

	typeLabels := map[string]string{
		"KBIS":         "Extrait KBIS",
		"Assurance":    "Attestation assurance RC Pro",
		"Carte_Artisan":"Carte d'artisan",
		"RIB":          "RIB bancaire",
		"Contrat":      "Contrat",
		"Facture":      "Facture",
		"Devis":        "Devis",
		"Autre":        "Autre document",
	}

	for rows.Next() {
		var d models.ProDocument
		var typeDoc, statutVerif string
		if err := rows.Scan(
			&d.Id, &typeDoc, &d.UrlPdf,
			&d.Filename, &statutVerif,
			&d.UploadedAt, &d.ExpiresAt,
		); err != nil {
			return nil, fmt.Errorf("GetProDocuments scan : %v", err)
		}
		d.IdUser = idUser
		d.Type   = strings.ToLower(typeDoc)
		d.Label  = typeLabels[typeDoc]
		if d.Label == "" { d.Label = typeDoc }
		d.Status = statutVerif
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

func SaveProDocument(idUser int, docType string, urlPdf string, filename string) (int, error) {
	sqlType := map[string]string{
		"kbis":          "KBIS",
		"assurance":     "Assurance",
		"carte_artisan": "Carte_Artisan",
		"rib":           "RIB",
		"facture":       "Facture",
		"contrat":       "Contrat",
	}[strings.ToLower(docType)]
	if sqlType == "" { sqlType = "Autre" }

	result, err := Db.Exec(`
		INSERT INTO pa2026.document (type_doc, url_pdf, filename, statut_verif, id_user)
		VALUES (?, ?, ?, 'pending', ?)
	`, sqlType, urlPdf, filename, idUser)
	if err != nil {
		return 0, fmt.Errorf("SaveProDocument : %v", err)
	}
	id64, _ := result.LastInsertId()
	return int(id64), nil
}

func CreateAnnonceFromProject(idUser int, projet models.ProProject) (int, error) {
    // Mapper matériau → id_categorie
    categorieMap := map[string]int{
        "bois":       1, // Mobilier
        "textile":    2, // Textile
        "metal":      4, // Outillage
        "plastique":  4,
        "ceramique":  1,
        "verre":      1,
        "papier":     1,
        "cuir":       2,
        "caoutchouc": 4,
        "autre":      1,
    }
    idCategorie, ok := categorieMap[projet.Material]
    if !ok {
        idCategorie = 1
    }

    result, err := Db.Exec(`
        INSERT INTO pa2026.annonce
            (titre, description, type, prix, statut_validation,
             ville, poids_kg, id_user, id_categorie)
        VALUES (?, ?, 'Vente', ?, 'En attente', 'Paris', ?, ?, ?)`,
        projet.Name,
        projet.Description,
        projet.EstimatedPrice,
        projet.WeightKg,
        idUser,
        idCategorie,
    )
    if err != nil {
        return 0, fmt.Errorf("CreateAnnonceFromProject : %v", err)
    }
    id64, _ := result.LastInsertId()
    return int(id64), nil
}



