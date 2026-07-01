/**
 * auth.js — UpcycleConnect Espace Pro
 * Gestion de session JWT + protection de route (AuthGuard)
 *
 * Responsabilités :
 *   1. Stocker / récupérer le JWT (localStorage)
 *   2. Décoder le payload sans librairie externe
 *   3. Vérifier : token présent + non expiré + role === 'PRO'
 *   4. Exposer les helpers utilisés par router.js et api.js
 */

const AUTH_TOKEN_KEY = "uc_pro_token";
const AUTH_USER_KEY = "uc_pro_user";
const LOGIN_URL = "/UpcycleConnect-/EspacePro/login.html";

// ─────────────────────────────────────────
// Décodage JWT (payload Base64URL → objet)
// ─────────────────────────────────────────
function decodeJwtPayload(token) {
  try {
    // Un JWT est formé de 3 parties séparées par des points
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Le payload est en Base64URL (pas Base64 standard)
    // On remplace les caractères non-standard avant d'atob()
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");

    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[Auth] Erreur décodage JWT:", e);
    return null;
  }
}

// ─────────────────────────────────────────
// Vérifications de validité
// ─────────────────────────────────────────

/**
 * Retourne true si le token est présent, non expiré, et appartient à un PRO.
 * C'est LA fonction appelée par le router avant chaque rendu de vue.
 */
function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  // Vérification expiration (exp est un timestamp Unix en secondes)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    console.warn("[Auth] Token expiré — déconnexion");
    logout(false); // silent: pas de redirect ici, le router gère
    return false;
  }

  // Vérification du rôle
  if (payload.role !== "Pro") {
    console.warn("[Auth] Rôle insuffisant:", payload.role);
    return false;
  }

  return true;
}

/**
 * Retourne true si l'utilisateur a l'abonnement Premium.
 * Utilisé pour l'accès conditionnel au "Tableau de bord avancé" (Task 38).
 */
function isPremium() {
  const user = getUser();
  return user?.subscription === "PREMIUM";
}

// ─────────────────────────────────────────
// Gestion du storage
// ─────────────────────────────────────────

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Appelé après un login réussi (réponse de l'API Go).
 * @param {string} token   - JWT renvoyé par POST /api/auth/login
 * @param {object} user    - Objet utilisateur renvoyé par l'API
 */
function saveSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

async function initOneSignal(userId) {
  if (!window.OneSignal) return;

  await OneSignal.Notifications.requestPermission();

  const playerId = await OneSignal.User.PushSubscription.id;
  if (playerId) {
    await API.notifications.subscribe(playerId);
    console.log("[OneSignal] Enregistré :", playerId);
  }
}

/**
 * Efface la session et redirige vers login.
 * @param {boolean} redirect - Si false, efface seulement le storage
 */
function logout(redirect = true) {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (redirect) {
    window.location.href = LOGIN_URL;
  }
}

// ─────────────────────────────────────────
// AuthGuard — à appeler en tête de chaque module
// ─────────────────────────────────────────

/**
 * Point d'entrée principal.
 * Si non authentifié → redirige vers login.html avec l'URL de retour.
 * Si authentifié → retourne le payload décodé pour usage immédiat.
 *
 * Usage dans chaque module :
 *   const session = Auth.guard();
 *   if (!session) return; // guard a déjà redirigé
 */
function guard() {
  if (!isAuthenticated()) {
    const returnUrl = encodeURIComponent(window.location.hash || "#/dashboard");
    window.location.href = `${LOGIN_URL}?returnTo=${returnUrl}`;
    return null;
  }
  return decodeJwtPayload(getToken());
}

/**
 * Guard premium : vérifie auth + abonnement.
 * Si non premium → affiche un message upgrade plutôt que de rediriger.
 * @param {HTMLElement} container - Où afficher le message d'upgrade
 */
function guardPremium(container) {
  const session = guard();
  if (!session) return null;

  if (!isPremium()) {
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center gap-3 rounded-3 p-4">
          <span style="font-size:2rem">⭐</span>
          <div>
            <strong>Fonctionnalité réservée au plan Premium</strong><br>
            <small class="text-muted">
              Passez au plan Pro Premium (29€/mois) pour accéder au tableau de bord avancé,
              aux statistiques détaillées et aux exports.
            </small>
            <div class="mt-2">
              <a href="#/subscription" class="btn btn-sm btn-warning">
                Voir les offres
              </a>
            </div>
          </div>
        </div>`;
    }
    return null;
  }
  return session;
}

// ─────────────────────────────────────────
// Refresh token (pour les longues sessions)
// ─────────────────────────────────────────

/**
 * Tente de rafraîchir le token avant expiration.
 * À appeler au démarrage de l'app si le token expire dans < 5 min.
 */
async function tryRefreshToken() {
  const token = getToken();
  if (!token) return;

  const payload = decodeJwtPayload(token);
  if (!payload) return;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = (payload.exp || 0) - now;

  // Refresh si moins de 5 minutes restantes
  if (expiresIn > 0 && expiresIn < 300) {
    try {
      const response = await fetch("http://localhost:8080/api/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // On conserve l'objet user existant, on renouvelle seulement le token
        const user = getUser();
        saveSession(data.token, user);
        console.info("[Auth] Token rafraîchi avec succès");
      } else {
        console.warn("[Auth] Refresh échoué — token invalide côté serveur");
        logout(true);
      }
    } catch (e) {
      console.error("[Auth] Erreur réseau lors du refresh:", e);
    }
  }
}

// ─────────────────────────────────────────
// Export de l'API publique du module
// ─────────────────────────────────────────

const Auth = {
  guard,
  guardPremium,
  isAuthenticated,
  isPremium,
  getToken,
  getUser,
  saveSession,
  logout,
  tryRefreshToken,
  decodeJwtPayload,
};

// Exposé globalement pour usage dans les autres modules Vanilla JS
window.Auth = Auth;
