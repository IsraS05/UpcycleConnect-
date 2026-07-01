/**
 * api.js — UpcycleConnect Espace Pro
 * Wrapper centralisé pour tous les appels à l'API Go
 */

const API_BASE_URL = window.UC_API_URL || "http://localhost:8080";

async function request(endpoint, options = {}) {
  const token = window.Auth?.getToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const config = { ...options, headers };
  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (response.status === 401) {
      console.warn("[API] 401 reçu — session invalide, déconnexion");
      window.Auth?.logout(true);
      return { data: null, error: "Session expirée. Reconnectez-vous." };
    }
    if (response.status === 403) {
      return { data: null, error: "Accès refusé. Droits insuffisants." };
    }
    if (response.status === 204) {
      return { data: null, error: null };
    }
    const data = await response.json();
    if (!response.ok) {
      const errorMsg =
        data?.error || data?.message || `Erreur ${response.status}`;
      console.error(`[API] ${response.status} sur ${endpoint}:`, errorMsg);
      return { data: null, error: errorMsg };
    }
    return { data, error: null };
  } catch (networkError) {
    console.error("[API] Erreur réseau:", networkError);
    return {
      data: null,
      error: "Serveur injoignable. Vérifiez votre connexion.",
    };
  }
}

const get = (endpoint, opts = {}) =>
  request(endpoint, { method: "GET", ...opts });
const post = (endpoint, body, opts = {}) =>
  request(endpoint, { method: "POST", body, ...opts });
const put = (endpoint, body, opts = {}) =>
  request(endpoint, { method: "PUT", body, ...opts });
const patch = (endpoint, body, opts = {}) =>
  request(endpoint, { method: "PATCH", body, ...opts });
const del = (endpoint, opts = {}) =>
  request(endpoint, { method: "DELETE", ...opts });

async function upload(endpoint, formData) {
  const token = window.Auth?.getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (response.status === 401) {
      window.Auth?.logout(true);
      return { data: null, error: "Session expirée." };
    }
    const data = await response.json();
    if (!response.ok) {
      return { data: null, error: data?.error || `Erreur ${response.status}` };
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: "Erreur réseau lors de l'upload." };
  }
}

const ProAPI = {
  auth: {
    login: (email, password) => post("/api/auth/login", { email, password }),
    register: (data) => post("/api/auth/register", data),
    refresh: () => post("/api/auth/refresh"),
    logout: () => post("/api/auth/logout"),
  },

  dashboard: {
    getKPIs: () => get("/api/pro/dashboard/kpis"),
    getAlerts: (limit = 10) => get(`/api/pro/dashboard/alerts?limit=${limit}`),
    getRecentActivity: (limit = 5) =>
      get(`/api/pro/dashboard/activity?limit=${limit}`),
    markAlertRead: (alertId) =>
      patch(`/api/pro/dashboard/alerts/${alertId}/read`),
  },

  notifications: {
    subscribe: (playerId) =>
      post("/api/pro/notifications/subscribe", {
        onesignal_player_id: playerId,
      }),
    getAll: () => get("/api/pro/notifications"),
    markRead: (id) => patch(`/api/pro/notifications/${id}/read`),
    markAllRead: () => patch("/api/pro/notifications/read-all"),
  },

  subscription: {
    getCurrent: () => get("/api/pro/subscription"),
    upgrade: (plan) => post("/api/pro/subscription/upgrade", { plan }),
    cancel: () => post("/api/pro/subscription/cancel"),
  },

  billing: {
    getInvoices: () => get("/api/pro/billing/invoices"),
    downloadInvoicePdf: async (invoiceId) => {
      const token = window.Auth?.getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/pro/billing/invoices/${invoiceId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) return { data: null, error: "PDF introuvable." };
      const blob = await response.blob();
      return { data: blob, error: null };
    },
  },

  marketplace: {
    getItems: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return get(`/api/pro/marketplace/items?${params}`);
    },
    getItem: (id) => get(`/api/pro/marketplace/items/${id}`),
    createCheckout: (itemId, qty = 1) =>
      post("/api/pro/marketplace/checkout", { item_id: itemId, quantity: qty }),
  },

  containers: {
    getNearby: (lat, lng, radius = 2000) =>
      get(`/api/pro/containers?lat=${lat}&lng=${lng}&radius=${radius}`),
    getById: (id) => get(`/api/pro/containers/${id}`),
  },

  scanner: {
    validateQR: (code) => post("/api/pro/scanner/validate", { qr_code: code }),
    confirmCollection: (objectId, containerId) =>
      post("/api/pro/scanner/collect", {
        object_id: objectId,
        container_id: containerId,
      }),
  },

  projects: {
    getAll: () => get("/api/pro/projects"),
    getById: (id) => get(`/api/pro/projects/${id}`),
    create: (data) => post("/api/pro/projects", data),
    update: (id, data) => put(`/api/pro/projects/${id}`, data),
    updateStep: (id, step) => patch(`/api/pro/projects/${id}/step`, { step }),
    delete: (id) => del(`/api/pro/projects/${id}`),
    calculateImpact: (weightKg, material) => {
      const CO2_COEFFICIENTS = {
        bois: 0.42,
        metal: 1.8,
        plastique: 2.1,
        textile: 5.5,
        verre: 0.31,
        papier: 0.9,
        default: 0.6,
      };
      const coeff =
        CO2_COEFFICIENTS[material?.toLowerCase()] ?? CO2_COEFFICIENTS.default;
      const co2Kg = Math.round(weightKg * coeff * 100) / 100;
      const waterL = Math.round(co2Kg * 4.3);
      return {
        co2_kg: co2Kg,
        water_l: waterL,
        score_points: Math.round(co2Kg * 1.5 + weightKg * 0.8),
      };
    },
  },

  profile: {
    get: () => get("/api/pro/profile"),
    update: (data) => put("/api/pro/profile", data),
    uploadDocument: (formData) =>
      upload("/api/pro/profile/documents", formData),
    getDocuments: () => get("/api/pro/profile/documents"),
  },
};

window.API = ProAPI;
window.ApiRequest = { get, post, put, patch, del, upload };
