const Store = (() => {

  let _state = {
    user: null,
    session: null,

    currentRoute: null,

    sidebarOpen: true,
    notifications: {
      unreadCount: 0,
      items: [],
    },

    cache: {
      kpis:        { data: null, fetchedAt: null },
      alerts:      { data: null, fetchedAt: null },
      projects:    { data: null, fetchedAt: null },
      containers:  { data: null, fetchedAt: null },
    },

    loading: {
      dashboard:   false,
      marketplace: false,
      projects:    false,
      map:         false,
    },

    errors: {},
  };

  const _subscribers = {};

  function subscribe(key, callback) {
    if (!_subscribers[key]) _subscribers[key] = [];
    _subscribers[key].push(callback);

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

  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  function set(key, value) {
    const oldValue = _state[key];

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

  const actions = {

    initSession() {
      const user    = window.Auth?.getUser();
      const token   = window.Auth?.getToken();
      const session = token ? window.Auth?.decodeJwtPayload(token) : null;

      set('user', user);
      set('session', session);
    },

    setUnreadCount(count) {
      set('notifications', { unreadCount: count });
    },

    addNotification(notif) {
      const current = get('notifications');
      set('notifications', {
        items: [notif, ...current.items].slice(0, 50),
        unreadCount: current.unreadCount + 1,
      });
    },

    clearUnread() {
      set('notifications', { unreadCount: 0 });
    },

    setCache(module, data) {
      const cache = get('cache');
      set('cache', {
        ...cache,
        [module]: { data, fetchedAt: Date.now() },
      });
    },

    isCacheValid(module, maxAgeMs = 2 * 60 * 1000) {
      const cache = get('cache');
      const entry = cache[module];
      if (!entry?.fetchedAt) return false;
      return (Date.now() - entry.fetchedAt) < maxAgeMs;
    },

    setLoading(module, isLoading) {
      const loading = get('loading');
      set('loading', { ...loading, [module]: isLoading });
    },

    setError(module, errorMsg) {
      const errors = get('errors');
      set('errors', { ...errors, [module]: errorMsg });
    },

    clearError(module) {
      const errors = get('errors');
      const { [module]: _, ...rest } = errors;
      set('errors', rest);
    },

    setRoute(route) {
      set('currentRoute', route);
    },
  };

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
