/**
 * sidebar.js — UpcycleConnect Espace Pro
 * Composant Sidebar (navigation latérale)
 *
 * Responsabilités :
 *   1. Mettre en surbrillance le lien actif selon la route courante
 *   2. Gérer l'ouverture / fermeture (mode mobile collapsed)
 *   3. Afficher le compteur de notifications non lues
 *   4. Afficher les infos utilisateur dans le bas de la sidebar
 *
 * Ce composant est chargé une seule fois par index.html.
 * Il s'abonne au Store pour réagir aux changements de route et
 * de compteur de notifications.
 */

const Sidebar = (() => {

  'use strict';

  // ─────────────────────────────────────────
  // SÉLECTEURS
  // ─────────────────────────────────────────

  const SEL_SIDEBAR   = '#pro-sidebar';
  const SEL_LINKS     = '.sidebar-link[data-route]';
  const SEL_NOTIF_DOT = '#sidebar-notif-dot';
  const SEL_USER_NAME = '#sidebar-user-name';
  const SEL_USER_PLAN = '#sidebar-user-plan';
  const SEL_TOGGLE    = '#sidebar-toggle';

  // ─────────────────────────────────────────
  // ÉTAT LOCAL
  // ─────────────────────────────────────────

  let _activeRoute    = null;
  let _unsubRoute     = null;
  let _unsubNotifs    = null;

  // ─────────────────────────────────────────
  // GESTION DE LA ROUTE ACTIVE
  // ─────────────────────────────────────────

  /**
   * Met en surbrillance le lien de navigation correspondant à la route.
   * @param {string} route - Ex: 'dashboard', 'projects', 'map'
   */
  function setActiveLink(route) {
    if (!route || route === _activeRoute) return;
    _activeRoute = route;

    const links = document.querySelectorAll(SEL_LINKS);
    links.forEach(link => {
      const linkRoute = link.getAttribute('data-route');
      // Gère les sous-routes : 'projects/new' → actif sur 'projects'
      const isActive  = route === linkRoute || route.startsWith(linkRoute + '/');
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  // ─────────────────────────────────────────
  // COMPTEUR NOTIFICATIONS
  // ─────────────────────────────────────────

  /**
   * Affiche / masque le point rouge de notifications non lues.
   * @param {number} count
   */
  function updateNotifBadge(count) {
    const dot = document.querySelector(SEL_NOTIF_DOT);
    if (!dot) return;
    dot.style.display = count > 0 ? '' : 'none';
    dot.title = count > 0
      ? `${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`
      : '';
  }

  // ─────────────────────────────────────────
  // INFOS UTILISATEUR
  // ─────────────────────────────────────────

  /**
   * Injecte le nom et le plan de l'utilisateur connecté dans la sidebar.
   * Appelé une fois lors de l'init.
   */
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

  // ─────────────────────────────────────────
  // TOGGLE MOBILE
  // ─────────────────────────────────────────

  /**
   * Ouvre ou ferme la sidebar (utile sur petits écrans).
   * Synchronise aussi l'état dans le Store.
   */
  function toggle() {
    const sidebar = document.querySelector(SEL_SIDEBAR);
    if (!sidebar) return;

    const isOpen = !sidebar.classList.contains('collapsed');
    sidebar.classList.toggle('collapsed', isOpen);

    // Persistance dans le Store
    if (window.Store) {
      Store.set('sidebarOpen', !isOpen);
    }
  }

  /**
   * Applique l'état initial du Store (utile si l'utilisateur a fermé la
   * sidebar dans une session précédente).
   */
  function applyStoredState() {
    const sidebarOpen = window.Store ? Store.get('sidebarOpen') : true;
    const sidebar     = document.querySelector(SEL_SIDEBAR);
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
  }

  // ─────────────────────────────────────────
  // ABONNEMENTS STORE
  // ─────────────────────────────────────────

  function _subscribeToStore() {
    if (!window.Store) return;

    // Réagit aux changements de route
    _unsubRoute = Store.subscribe('currentRoute', (newRoute) => {
      setActiveLink(newRoute);
    });

    // Réagit aux changements de notifications
    _unsubNotifs = Store.subscribe('notifications', (notifs) => {
      updateNotifBadge(notifs?.unreadCount || 0);
    });
  }

  // ─────────────────────────────────────────
  // LISTENERS DOM
  // ─────────────────────────────────────────

  function _bindEvents() {
    // Bouton burger (toggle mobile)
    const toggleBtn = document.querySelector(SEL_TOGGLE);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Ferme la sidebar au clic sur un lien (mode mobile)
    document.querySelectorAll(SEL_LINKS).forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          const sidebar = document.querySelector(SEL_SIDEBAR);
          if (sidebar) sidebar.classList.add('collapsed');
        }
      });
    });
  }

  // ─────────────────────────────────────────
  // INITIALISATION
  // ─────────────────────────────────────────

  /**
   * Point d'entrée — appelé par index.html au démarrage de l'app.
   * À appeler après que le DOM est prêt.
   */
  function init() {
    applyStoredState();
    renderUserInfo();
    _subscribeToStore();
    _bindEvents();

    // Applique la route active initiale si déjà connue
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash) setActiveLink(hash);

    console.info('[Sidebar] Initialisé');
  }

  /**
   * Libère les abonnements Store (utile si le composant est détruit).
   * Dans une SPA sans rechargement de page, ce n'est généralement pas
   * nécessaire, mais exposé pour la complétude.
   */
  function destroy() {
    _unsubRoute?.();
    _unsubNotifs?.();
    _activeRoute = null;
    console.info('[Sidebar] Détruit');
  }

  // ─────────────────────────────────────────
  // API PUBLIQUE
  // ─────────────────────────────────────────

  return {
    init,
    destroy,
    setActiveLink,
    updateNotifBadge,
    toggle,
  };

})();

window.Sidebar = Sidebar;
