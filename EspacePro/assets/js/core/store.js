/**
 * store.js — UpcycleConnect Espace Pro
 * État global réactif minimal (sans framework)
 *
 * Pattern : Observable store avec subscribe/notify.
 * Chaque module peut lire l'état et s'abonner aux changements.
 */

const Store = (() => {

  // ─────────────────────────────────────────
  // État initial
  // ─────────────────────────────────────────
  let _state = {
    // Utilisateur connecté
    user: null,           // { id, nom, prenom, email, role, subscription, siret, ... }
    session: null,        // Payload JWT décodé { sub, role, exp, ... }

    // Navigation
    currentRoute: null,   // Route active : 'dashboard', 'projects', etc.

    // UI globale
    sidebarOpen: true,
    notifications: {
      unreadCount: 0,
      items: [],
    },

    // Cache données (évite re-fetch inutiles)
    cache: {
      kpis:        { data: null, fetchedAt: null },
      alerts:      { data: null, fetchedAt: null },
      projects:    { data: null, fetchedAt: null },
      containers:  { data: null, fetchedAt: null },
    },

    // État de chargement par module
    loading: {
      dashboard:   false,
      marketplace: false,
      projects:    false,
      map:         false,
    },

    // Erreurs actives
    errors: {},
  };

  // ─────────────────────────────────────────
  // Système d'abonnement (pub/sub simple)
  // ─────────────────────────────────────────
  const _subscribers = {};

  /**
   * S'abonner à un changement de clé d'état.
   * @param {string}   key      - Clé de l'état ('user', 'notifications', etc.)
   * @param {function} callback - Appelé avec (newValue, oldValue)
   * @returns {function} unsubscribe — appeler pour se désabonner
   */
  function subscribe(key, callback) {
    if (!_subscribers[key]) _subscribers[key] = [];
    _subscribers[key].push(callback);

    // Retourne une fonction de désinscription
    return () => {
      _subscribers[key] = _subscribers[key].filter(cb => cb !== callback);
    };
  }

  function _notify(key, newValue, oldValue) {
    (_subscribers[key] || []).forEach(cb => {
      try { cb(newValue, oldValue); }
      catch (e) { console.error(`[Store] Erreur dans subscriber '${key}':`, e); }
    });
  }

  // ─────────────────────────────────────────
  // Lecture / Écriture d'état
  // ─────────────────────────────────────────

  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  /**
   * Met à jour une clé de l'état et notifie les abonnés.
   * Supporte les mises à jour partielles d'objets imbriqués.
   */
  function set(key, value) {
    const oldValue = _state[key];

    // Merge si objet (pour éviter d'écraser une clé imbriquée)
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof oldValue === 'object' &&
      oldValue !== null
    ) {
      _state[key] = { ...oldValue, ...value };
    } else {
      _state[key] = value;
    }

    _notify(key, _state[key], oldValue);
  }

  // ─────────────────────────────────────────
  // Actions métier (mutations nommées)
  // ─────────────────────────────────────────

  const actions = {

    /** Initialise la session depuis le JWT/localStorage au démarrage */
    initSession() {
      const user    = window.Auth?.getUser();
      const token   = window.Auth?.getToken();
      const session = token ? window.Auth?.decodeJwtPayload(token) : null;

      set('user', user);
      set('session', session);
    },

    /** Met à jour le compteur de notifications non lues */
    setUnreadCount(count) {
      set('notifications', { unreadCount: count });
    },

    /** Ajoute une notification reçue en temps réel */
    addNotification(notif) {
      const current = get('notifications');
      set('notifications', {
        items: [notif, ...current.items].slice(0, 50), // max 50
        unreadCount: current.unreadCount + 1,
      });
    },

    /** Marque toutes les notifications comme lues */
    clearUnread() {
      set('notifications', { unreadCount: 0 });
    },

    /** Met en cache les données d'un module avec timestamp */
    setCache(module, data) {
      const cache = get('cache');
      set('cache', {
        ...cache,
        [module]: { data, fetchedAt: Date.now() },
      });
    },

    /**
     * Vérifie si le cache est encore valide.
     * @param {string} module    - Clé du cache
     * @param {number} maxAgeMs  - Durée de validité en ms (défaut: 2 minutes)
     */
    isCacheValid(module, maxAgeMs = 2 * 60 * 1000) {
      const cache = get('cache');
      const entry = cache[module];
      if (!entry?.fetchedAt) return false;
      return (Date.now() - entry.fetchedAt) < maxAgeMs;
    },

    /** Active/désactive l'indicateur de chargement d'un module */
    setLoading(module, isLoading) {
      const loading = get('loading');
      set('loading', { ...loading, [module]: isLoading });
    },

    /** Enregistre une erreur pour un module */
    setError(module, errorMsg) {
      const errors = get('errors');
      set('errors', { ...errors, [module]: errorMsg });
    },

    /** Efface l'erreur d'un module */
    clearError(module) {
      const errors = get('errors');
      const { [module]: _, ...rest } = errors;
      set('errors', rest);
    },

    /** Change la route active (utilisé par router.js) */
    setRoute(route) {
      set('currentRoute', route);
    },
  };

  // ─────────────────────────────────────────
  // Debug — affiche l'état en console
  // ─────────────────────────────────────────
  function debug() {
    console.group('[Store] État actuel');
    console.table({
      user:         _state.user?.email || '(non connecté)',
      role:         _state.session?.role || '-',
      subscription: _state.user?.subscription || '-',
      route:        _state.currentRoute || '-',
      notifications:_state.notifications.unreadCount,
    });
    console.groupEnd();
  }

  return { get, set, subscribe, actions, debug };

})();

window.Store = Store;
