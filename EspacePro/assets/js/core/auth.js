const AUTH_TOKEN_KEY = "uc_pro_token";
const AUTH_USER_KEY = "uc_pro_user";
const LOGIN_URL = "/UpcycleConnect-/EspacePro/login.html";

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

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

function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    console.warn("[Auth] Token expiré — déconnexion");
    logout(false);
    return false;
  }

  if (payload.role !== "Pro") {
    console.warn("[Auth] Rôle insuffisant:", payload.role);
    return false;
  }

  return true;
}

function isPremium() {
  const user = getUser();
  return user?.subscription === "PREMIUM";
}

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

function logout(redirect = true) {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (redirect) {
    window.location.href = LOGIN_URL;
  }
}

function guard() {
  if (!isAuthenticated()) {
    const returnUrl = encodeURIComponent(window.location.hash || "#/dashboard");
    window.location.href = `${LOGIN_URL}?returnTo=${returnUrl}`;
    return null;
  }
  return decodeJwtPayload(getToken());
}

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

async function tryRefreshToken() {
  const token = getToken();
  if (!token) return;

  const payload = decodeJwtPayload(token);
  if (!payload) return;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = (payload.exp || 0) - now;

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

window.Auth = Auth;
