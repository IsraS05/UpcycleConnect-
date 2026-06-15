const Topbar = (() => {

  'use strict';

  const SEL_PAGE_TITLE    = '#topbar-page-title';
  const SEL_NOTIF_BELL    = '#topbar-notif-bell';
  const SEL_NOTIF_BADGE   = '#topbar-notif-badge';
  const SEL_USER_AVATAR   = '#topbar-user-avatar';
  const SEL_USER_DROPDOWN = '#topbar-user-dropdown';
  const SEL_LOGOUT_BTN    = '#topbar-logout-btn';

  let _unsubRoute  = null;
  let _unsubNotifs = null;

  const ROUTE_LABELS = {
    'dashboard':           'Tableau de bord',
    'dashboard/advanced':  'Tableau de bord avancé',
    'notifications':       'Notifications',
    'subscription':        'Mon abonnement',
    'billing':             'Factures',
    'marketplace':         'Marketplace',
    'map':                 'Carte & Collecte',
    'scanner':             'Scanner QR',
    'projects':            'Mes projets',
    'projects/new':        'Nouveau projet',
    'projects/edit':       'Modifier le projet',
    'profile':             'Mon profil Pro',
  };

  function setPageTitle(route) {
    const titleEl = document.querySelector(SEL_PAGE_TITLE);
    if (!titleEl) return;

    const label = ROUTE_LABELS[route]
      || ROUTE_LABELS[route.split('/')[0]]
      || 'Espace Pro';

    titleEl.textContent = label;
    document.title      = `${label} — UpcycleConnect Pro`;
  }

  function updateNotifBadge(count) {
    const badge = document.querySelector(SEL_NOTIF_BADGE);
    if (!badge) return;

    if (count > 0) {
      badge.textContent  = count > 99 ? '99+' : String(count);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderUserAvatar() {
    const user    = window.Auth?.getUser?.();
    const avatar  = document.querySelector(SEL_USER_AVATAR);
    if (!user || !avatar) return;

    if (user.avatar_url) {
      avatar.innerHTML = `<img src="${user.avatar_url}" alt="Avatar"
                               style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
      const initials = [
        (user.prenom || '').charAt(0),
        (user.nom    || '').charAt(0),
      ].filter(Boolean).join('').toUpperCase() || '?';

      avatar.textContent = initials;
    }

    avatar.title = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
  }

  function _handleLogout() {
    if (window.confirm('Se déconnecter de l\'Espace Pro ?')) {
      window.Auth?.logout?.();
    }
  }

  function _subscribeToStore() {
    if (!window.Store) return;

    _unsubRoute = Store.subscribe('currentRoute', (newRoute) => {
      if (newRoute) setPageTitle(newRoute);
    });

    _unsubNotifs = Store.subscribe('notifications', (notifs) => {
      updateNotifBadge(notifs?.unreadCount || 0);
    });
  }

  function _bindEvents() {
    const logoutBtn = document.querySelector(SEL_LOGOUT_BTN);
    if (logoutBtn) {
      logoutBtn.addEventListener('click', _handleLogout);
    }

    const bell = document.querySelector(SEL_NOTIF_BELL);
    if (bell) {
      bell.addEventListener('click', () => {
        window.location.hash = '#/notifications';
        Store?.actions?.clearUnread?.();
      });
    }
  }

  function init() {
    renderUserAvatar();
    _subscribeToStore();
    _bindEvents();

    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash) setPageTitle(hash);

    const notifs = window.Store ? Store.get('notifications') : null;
    if (notifs) updateNotifBadge(notifs.unreadCount || 0);

    console.info('[Topbar] Initialisé');
  }

  function destroy() {
    _unsubRoute?.();
    _unsubNotifs?.();
    console.info('[Topbar] Détruit');
  }

  return {
    init,
    destroy,
    setPageTitle,
    updateNotifBadge,
    renderUserAvatar,
  };

})();

window.Topbar = Topbar;
