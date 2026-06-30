const Sidebar = (() => {

  'use strict';

  const SEL_SIDEBAR   = '#pro-sidebar';
  const SEL_LINKS     = '.sidebar-link[data-route]';
  const SEL_NOTIF_DOT = '#sidebar-notif-dot';
  const SEL_USER_NAME = '#sidebar-user-name';
  const SEL_USER_PLAN = '#sidebar-user-plan';
  const SEL_TOGGLE    = '#sidebar-toggle';

  let _activeRoute    = null;
  let _unsubRoute     = null;
  let _unsubNotifs    = null;

  function setActiveLink(route) {
    if (!route || route === _activeRoute) return;
    _activeRoute = route;

    const links = document.querySelectorAll(SEL_LINKS);
    links.forEach(link => {
      const linkRoute = link.getAttribute('data-route');
      const isActive  = route === linkRoute || route.startsWith(linkRoute + '/');
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function updateNotifBadge(count) {
    const dot = document.querySelector(SEL_NOTIF_DOT);
    if (!dot) return;
    dot.style.display = count > 0 ? '' : 'none';
    dot.title = count > 0
      ? `${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`
      : '';
  }

  function renderUserInfo() {
    const user = window.Auth?.getUser?.();
    if (!user) return;

    const nameEl = document.querySelector(SEL_USER_NAME);
    const planEl = document.querySelector(SEL_USER_PLAN);

    if (nameEl) {
      nameEl.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
    }

    if (planEl) {
      const isPremium = user.subscription === 'PREMIUM';
      planEl.textContent = isPremium ? 'Pro Premium' : 'Pro Standard';
      planEl.className   = isPremium
        ? 'sidebar-user-plan premium'
        : 'sidebar-user-plan';
    }
  }

  function toggle() {
    const sidebar = document.querySelector(SEL_SIDEBAR);
    if (!sidebar) return;

    const isOpen = !sidebar.classList.contains('collapsed');
    sidebar.classList.toggle('collapsed', isOpen);

    if (window.Store) {
      Store.set('sidebarOpen', !isOpen);
    }
  }

  function applyStoredState() {
    const sidebarOpen = window.Store ? Store.get('sidebarOpen') : true;
    const sidebar     = document.querySelector(SEL_SIDEBAR);
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
  }

  function _subscribeToStore() {
    if (!window.Store) return;

    _unsubRoute = Store.subscribe('currentRoute', (newRoute) => {
      setActiveLink(newRoute);
    });

    _unsubNotifs = Store.subscribe('notifications', (notifs) => {
      updateNotifBadge(notifs?.unreadCount || 0);
    });
  }

  function _bindEvents() {
    const toggleBtn = document.querySelector(SEL_TOGGLE);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    document.querySelectorAll(SEL_LINKS).forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          const sidebar = document.querySelector(SEL_SIDEBAR);
          if (sidebar) sidebar.classList.add('collapsed');
        }
      });
    });
  }

  function init() {
    applyStoredState();
    renderUserInfo();
    _subscribeToStore();
    _bindEvents();

    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash) setActiveLink(hash);

    console.info('[Sidebar] Initialisé');
  }

  function destroy() {
    _unsubRoute?.();
    _unsubNotifs?.();
    _activeRoute = null;
    console.info('[Sidebar] Détruit');
  }

  return {
    init,
    destroy,
    setActiveLink,
    updateNotifBadge,
    toggle,
  };

})();

window.Sidebar = Sidebar;
