/**
 * router.js — UpcycleConnect Espace Pro
 * Mini-router hash (#/dashboard, #/projets…)
 *
 * Fonctionnement :
 *   1. Écoute les changements de window.location.hash
 *   2. Vérifie l'auth via Auth.guard() avant tout rendu
 *   3. Charge le module JS correspondant à la route
 *   4. Injecte le fragment HTML dans #pro-view
 *   5. Appelle le init() du module chargé
 */

const Router = (() => {
  // ─────────────────────────────────────────
  // Table de routage
  // ─────────────────────────────────────────
  // Chaque route : { view, module, title, requiresPremium? }
  const ROUTES = {
    "": { redirect: "dashboard" },
    dashboard: { view: "dashboard", module: "dashboard", title: "Dashboard" },
    "dashboard/advanced": {
      view: "dashboard",
      module: "dashboard",
      title: "Dashboard Avancé",
      requiresPremium: true,
    },
    notifications: {
      view: "notifications",
      module: "notifications",
      title: "Notifications",
    },
    subscription: {
      view: "subscription",
      module: "subscription",
      title: "Mon Abonnement",
    },
    billing: { view: "billing", module: "billing", title: "Factures" },
    marketplace: {
      view: "marketplace",
      module: "marketplace",
      title: "Marketplace",
    },
    map: { view: "map", module: "map", title: "Carte & Collecte" },
    scanner: { view: "scanner", module: "scanner", title: "Scanner QR" },
    projects: { view: "projects", module: "projects", title: "Mes Projets" },
    "projects/new": {
      view: "project-editor",
      module: "projects",
      moduleKey: "projectEditor",
      title: "Nouveau Projet",
    },
    "projects/edit": {
      view: "project-editor",
      module: "projects",
      moduleKey: "projectEditor",
      title: "Modifier le Projet",
    },
    profile: { view: "profile", module: "profile", title: "Mon Profil Pro" },
  };

  // Modules JS déjà chargés (évite le double-import)
  const _loadedModules = new Set();

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  /** Extrait le chemin depuis le hash (ex: '#/projects/edit?id=5' → 'projects/edit') */
  function parsePath() {
    const hash = window.location.hash || "#/";
    const withoutHash = hash.replace(/^#\/?/, "");
    const [path, queryStr] = withoutHash.split("?");
    const params = {};
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => {
        params[k] = v;
      });
    }
    return { path: path || "", params };
  }

  /** Affiche un spinner dans la zone de contenu pendant le chargement */
  function showLoader() {
    const view = document.getElementById("pro-view");
    if (view) {
      view.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="min-height:300px;">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Chargement…</span>
          </div>
        </div>`;
    }
  }

  /** Affiche une erreur 404 dans la zone de contenu */
  function show404(path) {
    const view = document.getElementById("pro-view");
    if (view) {
      view.innerHTML = `
        <div class="text-center py-5">
          <div style="font-size:4rem">🌿</div>
          <h2 class="mt-3" style="color:var(--uc-vert-foret)">Page introuvable</h2>
          <p class="text-muted">La route <code>#/${path}</code> n'existe pas.</p>
          <a href="#/dashboard" class="btn btn-success mt-3">Retour au Dashboard</a>
        </div>`;
    }
  }

  /** Met à jour le titre de la page et l'état actif de la sidebar */
  function updateUI(route, routeConfig) {
    // Titre du navigateur
    document.title = `${routeConfig.title} — UpcycleConnect Pro`;

    // Sidebar : retire active de tous les liens, ajoute sur le bon
    document.querySelectorAll("[data-route]").forEach((el) => {
      el.classList.toggle(
        "active",
        el.dataset.route === route || el.dataset.route === route.split("/")[0],
      );
    });

    // Breadcrumb si présent
    const breadcrumb = document.getElementById("pro-breadcrumb");
    if (breadcrumb) {
      breadcrumb.textContent = routeConfig.title;
    }

    // Store
    window.Store?.actions.setRoute(route);
  }

  // ─────────────────────────────────────────
  // Chargement du fragment HTML
  // ─────────────────────────────────────────

  async function loadView(viewName) {
    const viewPath = `/UpcycleConnect-/EspacePro/views/${viewName}.html`;
    try {
      const response = await fetch(viewPath);
      if (!response.ok) throw new Error(`Vue introuvable: ${viewPath}`);
      return await response.text();
    } catch (e) {
      console.error("[Router] Erreur chargement vue:", e);
      return `<div class="alert alert-danger m-4">Impossible de charger la vue <strong>${viewName}</strong>.</div>`;
    }
  }

  // ─────────────────────────────────────────
  // Chargement du module JS
  // ─────────────────────────────────────────

  async function loadModule(moduleName) {
    if (_loadedModules.has(moduleName)) {
      // Module déjà dans le DOM — on appelle juste son init()
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = `/UpcycleConnect-/EspacePro/assets/js/modules/${moduleName}.js?v=${Date.now()}`;
      script.onload = () => {
        _loadedModules.add(moduleName);
        resolve(true);
      };
      script.onerror = () => {
        console.error(
          `[Router] Impossible de charger le module: ${moduleName}.js`,
        );
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  // ─────────────────────────────────────────
  // Gestionnaire de navigation principal
  // ─────────────────────────────────────────

  async function navigate() {
    const { path, params } = parsePath();

    // ── 1. Résolution de route ──
    const routeConfig = ROUTES[path];

    if (!routeConfig) {
      show404(path);
      return;
    }

    // Redirect
    if (routeConfig.redirect) {
      window.location.hash = `#/${routeConfig.redirect}`;
      return;
    }

    // ── 2. Auth Guard ──
    const session = window.Auth?.guard();
    if (!session) return; // Auth.guard() a déjà redirigé vers login

    // ── 3. Guard Premium (si la route le requiert) ──
    if (routeConfig.requiresPremium) {
      if (!window.Auth?.isPremium()) {
        // On charge quand même la vue mais on affichera le message upgrade dedans
        console.info("[Router] Route premium — utilisateur non premium");
      }
    }

    // ── 4. Afficher le loader ──
    showLoader();

    // ── 5. Charger le HTML de la vue ──
    const html = await loadView(routeConfig.view);
    const proView = document.getElementById("pro-view");
    if (!proView) {
      console.error("[Router] #pro-view introuvable dans le DOM");
      return;
    }
    proView.innerHTML = html;

    // ── 6. Charger et initialiser le module JS ──
    await loadModule(routeConfig.module);

    // Chaque module expose une fonction init() dans window.ProModules
    const moduleKey = routeConfig.moduleKey || routeConfig.module;
    const moduleInit = window.ProModules?.[moduleKey]?.init;

    if (typeof moduleInit === "function") {
      try {
        await moduleInit({
          path,
          params,
          session,
          isPremium: window.Auth?.isPremium(),
        });
      } catch (e) {
        console.error(
          `[Router] Erreur init module '${routeConfig.module}':`,
          e,
        );
      }
    } else {
      console.warn(
        `[Router] Le module '${routeConfig.module}' n'expose pas de ProModules.${routeConfig.module}.init()`,
      );
    }

    // ── 7. Mettre à jour la navigation UI ──
    updateUI(path, routeConfig);

    // ── 8. Scroll en haut ──
    window.scrollTo(0, 0);
  }

  // ─────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────

  function init() {
    // Écoute les changements de hash
    window.addEventListener("hashchange", navigate);

    // Navigation initiale
    navigate();
  }

  /** Navigation programmatique : Router.go('projects') */
  function go(path, params = {}) {
    const query = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    window.location.hash = `#/${path}${query}`;
  }

  /** Retour arrière */
  function back() {
    window.history.back();
  }

  return { init, go, back, navigate };
})();

window.Router = Router;
