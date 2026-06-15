const Router = (() => {
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

  const _loadedModules = new Set();

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

  function updateUI(route, routeConfig) {
    document.title = `${routeConfig.title} — UpcycleConnect Pro`;

    document.querySelectorAll("[data-route]").forEach((el) => {
      el.classList.toggle(
        "active",
        el.dataset.route === route || el.dataset.route === route.split("/")[0],
      );
    });

    const breadcrumb = document.getElementById("pro-breadcrumb");
    if (breadcrumb) {
      breadcrumb.textContent = routeConfig.title;
    }

    window.Store?.actions.setRoute(route);
  }

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

  async function loadModule(moduleName) {
    if (_loadedModules.has(moduleName)) {
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

  async function navigate() {
    const { path, params } = parsePath();

    const routeConfig = ROUTES[path];

    if (!routeConfig) {
      show404(path);
      return;
    }

    if (routeConfig.redirect) {
      window.location.hash = `#/${routeConfig.redirect}`;
      return;
    }

    const session = window.Auth?.guard();
    if (!session) return;

    if (routeConfig.requiresPremium) {
      if (!window.Auth?.isPremium()) {
        console.info("[Router] Route premium — utilisateur non premium");
      }
    }

    showLoader();

    const html = await loadView(routeConfig.view);
    const proView = document.getElementById("pro-view");
    if (!proView) {
      console.error("[Router] #pro-view introuvable dans le DOM");
      return;
    }
    proView.innerHTML = html;

    await loadModule(routeConfig.module);

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

    updateUI(path, routeConfig);

    window.scrollTo(0, 0);
  }

  function init() {
    window.addEventListener("hashchange", navigate);

    navigate();
  }

  function go(path, params = {}) {
    const query = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    window.location.hash = `#/${path}${query}`;
  }

  function back() {
    window.history.back();
  }

  return { init, go, back, navigate };
})();

window.Router = Router;
