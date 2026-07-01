/**
 * topbar.js — UpcycleConnect Espace Pro
 * Composant Topbar (barre supérieure de l'application)
 *
 * Responsabilités :
 *   1. Afficher le titre de la page active (mis à jour à chaque navigation)
 *   2. Gérer la cloche de notifications (badge + popover ou lien vers #/notifications)
 *   3. Afficher l'avatar / initiales de l'utilisateur connecté
 *   4. Exposer le bouton de déconnexion
 *
 * Ce composant est chargé une seule fois par index.html.
 * Il s'abonne au Store pour réagir aux changements de route et de
 * compteur de notifications.
 */

const Topbar = (() => {

  'use strict';

  // ─────────────────────────────────────────
  // SÉLECTEURS
  // ─────────────────────────────────────────

  const SEL_PAGE_TITLE    = '#topbar-page-title';
  const SEL_NOTIF_BELL    = '#topbar-notif-bell';
  const SEL_NOTIF_BADGE   = '#topbar-notif-badge';
  const SEL_USER_AVATAR   = '#topbar-user-avatar';
  const SEL_USER_DROPDOWN = '#topbar-user-dropdown';
  const SEL_LOGOUT_BTN    = '#topbar-logout-btn';

  // ─────────────────────────────────────────
  // ÉTAT LOCAL
  // ─────────────────────────────────────────

  let _unsubRoute  = null;
  let _unsubNotifs = null;

  // ─────────────────────────────────────────
  // TITRE DE PAGE
  // ─────────────────────────────────────────

  // Correspondance route → libellé affiché
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

  /**
   * Met à jour le titre affiché dans la topbar.
   * @param {string} route - Route courante (ex: 'projects/new')
   */
  function setPageTitle(route) {
    const titleEl = document.querySelector(SEL_PAGE_TITLE);
    if (!titleEl) return;

    // Cherche le label exact, puis le label de la route parente
    const label = ROUTE_LABELS[route]
      || ROUTE_LABELS[route.split('/')[0]]
      || 'Espace Pro';

    titleEl.textContent = label;
    document.title      = `${label} — UpcycleConnect Pro`;
  }

  // ─────────────────────────────────────────
  // BADGE NOTIFICATIONS
  // ─────────────────────────────────────────

  /**
   * Met à jour le badge de notifications sur la cloche.
   * @param {number} count - Nombre de notifications non lues
   */
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

  // ─────────────────────────────────────────
  // AVATAR UTILISATEUR
  // ─────────────────────────────────────────

  /**
   * Affiche les initiales de l'utilisateur dans le cercle avatar.
   * Si l'utilisateur a une photo de profil, elle est utilisée à la place.
   */
  function renderUserAvatar() {
    const user    = window.Auth?.getUser?.();
    const avatar  = document.querySelector(SEL_USER_AVATAR);
    if (!user || !avatar) return;

    if (user.avatar_url) {
      // Photo de profil
      avatar.innerHTML = `<img src="${user.avatar_url}" alt="Avatar"
                               style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
      // Initiales
      const initials = [
        (user.prenom || '').charAt(0),
        (user.nom    || '').charAt(0),
      ].filter(Boolean).join('').toUpperCase() || '?';

      avatar.textContent = initials;
    }

    // Tooltip avec le nom complet
    avatar.title = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
  }

  // ─────────────────────────────────────────
  // DÉCONNEXION
  // ─────────────────────────────────────────

  function _handleLogout() {
    // Confirmation avant déconnexion (UX)
    if (window.confirm('Se déconnecter de l\'Espace Pro ?')) {
      window.Auth?.logout?.();
    }
  }

  // ─────────────────────────────────────────
  // ABONNEMENTS STORE
  // ─────────────────────────────────────────

  function _subscribeToStore() {
    if (!window.Store) return;

    // Réagit aux changements de route → met à jour le titre
    _unsubRoute = Store.subscribe('currentRoute', (newRoute) => {
      if (newRoute) setPageTitle(newRoute);
    });

    // Réagit aux changements de notifications → met à jour le badge
    _unsubNotifs = Store.subscribe('notifications', (notifs) => {
      updateNotifBadge(notifs?.unreadCount || 0);
    });
  }

  // ─────────────────────────────────────────
  // LISTENERS DOM
  // ─────────────────────────────────────────

  function _bindEvents() {
    // Bouton déconnexion
    const logoutBtn = document.querySelector(SEL_LOGOUT_BTN);
    if (logoutBtn) {
      logoutBtn.addEventListener('click', _handleLogout);
    }

    // Cloche → navigue vers la page notifications
    const bell = document.querySelector(SEL_NOTIF_BELL);
    if (bell) {
      bell.addEventListener('click', () => {
        window.location.hash = '#/notifications';
        // Vide le badge lors de la navigation
        Store?.actions?.clearUnread?.();
      });
    }
  }

  // ─────────────────────────────────────────
  // INITIALISATION
  // ─────────────────────────────────────────

  /**
   * Point d'entrée — appelé par index.html au démarrage de l'app.
   * À appeler après que le DOM est prêt et que Auth + Store sont chargés.
   */
  function init() {
    renderUserAvatar();
    _subscribeToStore();
    _bindEvents();

    // Titre initial basé sur le hash courant
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hash) setPageTitle(hash);

    // Badge initial depuis le Store
    const notifs = window.Store ? Store.get('notifications') : null;
    if (notifs) updateNotifBadge(notifs.unreadCount || 0);

    console.info('[Topbar] Initialisé');
  }

  /**
   * Libère les abonnements Store.
   */
  function destroy() {
    _unsubRoute?.();
    _unsubNotifs?.();
    console.info('[Topbar] Détruit');
  }

  // ─────────────────────────────────────────
  // API PUBLIQUE
  // ─────────────────────────────────────────

  return {
    init,
    destroy,
    setPageTitle,
    updateNotifBadge,
    renderUserAvatar,
  };

})();

window.Topbar = Topbar;
