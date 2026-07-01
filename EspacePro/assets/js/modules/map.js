/**
 * map.js — UpcycleConnect Espace Pro
 * Module C — Tasks 48-49
 *
 * Responsabilités :
 *   Task 48 : Carte Leaflet avec marqueurs colorés par statut (libre/partiel/plein)
 *   Task 49 : Liste conteneurs + panel détail offcanvas + centrage sur position utilisateur
 *
 * Dépendance : Leaflet.js (chargé dynamiquement depuis CDN si absent)
 * Stratégie : géolocalisation HTML5 → fallback Paris 11e si refusée
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────

  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  // Position par défaut : Paris 11e (fallback si géoloc refusée)
  const DEFAULT_POSITION = { lat: 48.8566, lng: 2.3799 };

  const STATUS_COLORS = {
    libre: { hex: "#4D9E6A", label: "Libre" },
    partiel: { hex: "#F59E0B", label: "Partiel" },
    plein: { hex: "#C4623A", label: "Plein" },
  };

  // ─────────────────────────────────────────
  // DONNÉES SIMULÉES
  // ─────────────────────────────────────────

  const MOCK_CONTAINERS = [];

  // ─────────────────────────────────────────
  // ÉTAT LOCAL
  // ─────────────────────────────────────────

  let _state = {
    map: null, // Instance Leaflet
    userMarker: null,
    markers: [], // { container, leafletMarker }
    containers: [], // Tous les conteneurs
    filtered: [], // Après filtre statut
    activeStatus: "all",
    userPosition: null,
    radius: 2000, // Mètres
    selectedId: null,
  };

  // ─────────────────────────────────────────
  // CHARGEMENT LEAFLET (dynamique)
  // ─────────────────────────────────────────

  function loadLeaflet() {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve();
        return;
      }

      // CSS
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = LEAFLET_CSS;
        document.head.appendChild(link);
      }

      // JS
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Leaflet non chargeable"));
      document.head.appendChild(script);
    });
  }

  // ─────────────────────────────────────────
  // GÉOLOCALISATION
  // ─────────────────────────────────────────

  function getUserPosition() {
    return new Promise((resolve) => {
      const statusDot = document.getElementById("cam-status-dot");
      const statusLabel = document.getElementById("cam-status-label");

      if (!navigator.geolocation) {
        resolve(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Géoloc refusée ou timeout → Paris 11e par défaut
          console.info("[Map] Géolocalisation refusée → position par défaut");
          resolve(DEFAULT_POSITION);
        },
        { timeout: 5000, maximumAge: 60000 },
      );
    });
  }

  // ─────────────────────────────────────────
  // INIT CARTE LEAFLET
  // ─────────────────────────────────────────

  function initMap(position) {
    const L = window.L;
    if (!L) return;

    // Créer la carte
    _state.map = L.map("leaflet-map", {
      center: [position.lat, position.lng],
      zoom: 15,
      zoomControl: false,
    });

    // Tuiles OpenStreetMap (libre, pas de clé API requise)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(_state.map);

    // Contrôle zoom en bas à droite
    L.control.zoom({ position: "bottomright" }).addTo(_state.map);

    // Marqueur position utilisateur
    const userIcon = L.divIcon({
      html: `<div class="uc-marker user">📍</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    _state.userMarker = L.marker([position.lat, position.lng], {
      icon: userIcon,
    })
      .addTo(_state.map)
      .bindPopup("<strong>Vous êtes ici</strong>");

    // Cercle de rayon
    _state.radiusCircle = L.circle([position.lat, position.lng], {
      radius: _state.radius,
      color: "#1C3D2B",
      fillColor: "#1C3D2B",
      fillOpacity: 0.04,
      weight: 1,
      dashArray: "5, 5",
    }).addTo(_state.map);
  }

  // ─────────────────────────────────────────
  // MARQUEURS CONTENEURS
  // ─────────────────────────────────────────

  function addMarkers(containers) {
    const L = window.L;
    if (!L || !_state.map) return;

    // Nettoyage marqueurs existants
    _state.markers.forEach(({ leafletMarker }) => {
      _state.map.removeLayer(leafletMarker);
    });
    _state.markers = [];

    containers.forEach((c) => {
      const color = STATUS_COLORS[c.status]?.hex || "#7A7A72";
      const icon = L.divIcon({
        html: `
          <div style="width:36px;height:36px;border-radius:50%;
                      background:${color};border:2.5px solid #fff;
                      box-shadow:0 2px 8px rgba(0,0,0,.25);
                      display:flex;align-items:center;justify-content:center;
                      font-size:.85rem;cursor:pointer">
            📦
          </div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const marker = L.marker([c.lat, c.lng], { icon })
        .addTo(_state.map)
        .bindTooltip(
          `<strong>${c.name}</strong><br>${STATUS_COLORS[c.status]?.label} · ${c.objects_count} obj.`,
          {
            direction: "top",
            offset: [0, -36],
          },
        )
        .on("click", () => openContainerDetail(c.id));

      _state.markers.push({ container: c, leafletMarker: marker });
    });
  }

  // ─────────────────────────────────────────
  // RENDERERS — Liste conteneurs
  // ─────────────────────────────────────────

  function renderContainerList(containers) {
    const listEl = document.getElementById("containers-list");
    if (!listEl) return;

    const countEl = document.getElementById("map-count-label");
    if (countEl)
      countEl.textContent = `${containers.length} conteneur${containers.length > 1 ? "s" : ""}`;

    if (containers.length === 0) {
      listEl.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
          <i class="bi bi-box" style="font-size:2rem;color:var(--uc-gl)"></i>
          <div class="mt-2 small">Aucun conteneur dans ce rayon</div>
        </div>`;
      return;
    }

    // Tri : pleins en premier, puis partiels, puis libres
    const sortedByUrgency = [...containers].sort((a, b) => {
      const order = { plein: 0, partiel: 1, libre: 2 };
      return order[a.status] - order[b.status];
    });

    listEl.innerHTML = sortedByUrgency
      .map((c) => {
        const statusColor = STATUS_COLORS[c.status]?.hex || "#7A7A72";
        const statusLabel = STATUS_COLORS[c.status]?.label || c.status;
        const matLabels = c.materials
          .map((m) => {
            const labels = {
              bois: "Bois",
              metal: "Métal",
              plastique: "Plastique",
              textile: "Textile",
              verre: "Verre",
              papier: "Papier",
            };
            return labels[m] || m;
          })
          .join(", ");

        return `
        <div class="col-12 col-sm-6 col-xl-4">
          <div class="container-card ${c.status} ${_state.selectedId === c.id ? "selected" : ""}"
               id="card-${c.id}"
               onclick="ProModules.map.openContainerDetail('${c.id}')">

            <div class="d-flex align-items-center justify-content-between mb-1">
              <div style="font-size:.82rem;font-weight:700;color:var(--uc-gc)">
                ${escHtml(c.name)}
              </div>
              <span style="font-size:.6rem;font-family:var(--uc-mono);font-weight:700;
                           padding:.15rem .45rem;border-radius:5px;text-transform:uppercase;
                           background:${statusColor}20;color:${statusColor}">
                ${statusLabel}
              </span>
            </div>

            <div style="font-size:.7rem;color:var(--uc-gm);margin-bottom:.5rem">
              <i class="bi bi-geo-alt me-1"></i>${escHtml(c.address)}
            </div>

            <div class="fill-bar-sm">
              <div class="fill-bar-sm-inner"
                   style="width:${c.fill_pct}%;background:${statusColor}"></div>
            </div>

            <div class="d-flex justify-content-between mt-1">
              <span style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                ${c.fill_pct}% · ${c.objects_count} obj.
              </span>
              <span style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                ${
                  c.distance_m < 1000
                    ? `${c.distance_m} m`
                    : `${(c.distance_m / 1000).toFixed(1)} km`
                }
              </span>
            </div>

            <div class="mt-1" style="font-size:.62rem;color:var(--uc-gm)">
              <i class="bi bi-layers me-1"></i>${escHtml(matLabels)}
            </div>

          </div>
        </div>`;
      })
      .join("");
  }

  // ─────────────────────────────────────────
  // OFFCANVAS DÉTAIL CONTENEUR
  // ─────────────────────────────────────────

  function openContainerDetail(containerId) {
    const c = _state.containers.find(
      (x) => String(x.id) === String(containerId),
    );
    if (!c) return;

    _state.selectedId = containerId;

    // Sélection visuelle dans la liste
    document
      .querySelectorAll(".container-card")
      .forEach((el) => el.classList.remove("selected"));
    document.getElementById(`card-${containerId}`)?.classList.add("selected");

    // Centrer la carte sur ce conteneur
    _state.map?.panTo([c.lat, c.lng], { animate: true });

    // Titre offcanvas
    const titleEl = document.getElementById("oc-title");
    if (titleEl) titleEl.textContent = c.name;

    // Corps offcanvas
    const body = document.getElementById("oc-body");
    if (!body) return;

    const statusColor = STATUS_COLORS[c.status]?.hex || "#7A7A72";
    const statusLabel = STATUS_COLORS[c.status]?.label || c.status;
    const timeAgo = new Date(c.last_updated).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    body.innerHTML = `
      <!-- Statut & remplissage -->
      <div class="oc-section">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span style="font-size:.72rem;font-family:var(--uc-mono);color:var(--uc-gm)">
            Remplissage
          </span>
          <span style="font-size:.7rem;font-weight:700;color:${statusColor};
                       background:${statusColor}15;padding:.15rem .5rem;border-radius:6px;
                       font-family:var(--uc-mono)">${statusLabel} · ${c.fill_pct}%</span>
        </div>
        <div style="height:10px;background:var(--uc-gxl);border-radius:5px;overflow:hidden">
          <div style="width:${c.fill_pct}%;height:100%;background:${statusColor};border-radius:5px;
                      transition:width .5s ease"></div>
        </div>
        <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm);margin-top:.3rem">
          Mis à jour le ${timeAgo}
        </div>
      </div>

      <!-- Adresse -->
      <div class="oc-section">
        <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm);
                    text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem">
          Adresse
        </div>
        <div style="font-size:.82rem;font-weight:600;color:var(--uc-gc)">
          ${escHtml(c.address)}
        </div>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}"
           target="_blank" rel="noopener"
           class="btn btn-sm btn-outline-success rounded-pill mt-2"
           style="font-size:.7rem">
          <i class="bi bi-map me-1"></i>Itinéraire Google Maps
        </a>
      </div>

      <!-- Objets disponibles -->
      <div class="oc-section">
        <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm);
                    text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">
          ${c.objects_count} objet${c.objects_count > 1 ? "s" : ""} disponible${c.objects_count > 1 ? "s" : ""}
        </div>
        ${c.materials
          .map((m) => {
            const labels = {
              bois: "🪵 Bois",
              metal: "⚙️ Métal",
              plastique: "♳ Plastique",
              textile: "🧵 Textile",
              verre: "🫙 Verre",
              papier: "📦 Papier",
            };
            return `
            <div class="oc-item-row">
              <span style="font-size:.78rem;color:var(--uc-gc)">${labels[m] || m}</span>
              <span style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                Disponible
              </span>
            </div>`;
          })
          .join("")}
      </div>

      <!-- Actions -->
      <div class="oc-section">
        <button class="btn w-100 rounded-3 fw-bold mb-2"
                style="background:var(--uc-vf);color:#fff"
                onclick="ProModules.map.openScanner()">
          <i class="bi bi-qr-code-scan me-2"></i>Scanner ce conteneur
        </button>
        <button class="btn w-100 btn-outline-secondary rounded-3"
                style="font-size:.8rem"
                data-bs-dismiss="offcanvas"
                onclick="ProModules.map.flyTo(${c.lat}, ${c.lng})">
          <i class="bi bi-eye me-2"></i>Voir sur la carte
        </button>
      </div>`;

    new bootstrap.Offcanvas(
      document.getElementById("offcanvas-container"),
    ).show();
  }

  // ─────────────────────────────────────────
  // ACTIONS PUBLIQUES
  // ─────────────────────────────────────────

  function filterStatus(status, btn) {
    _state.activeStatus = status;

    document
      .querySelectorAll(".map-status-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    _state.filtered =
      status === "all"
        ? _state.containers
        : _state.containers.filter((c) => c.status === status);

    addMarkers(_state.filtered);
    renderContainerList(_state.filtered);
  }

  function setRadius(radiusStr) {
    _state.radius = parseInt(radiusStr);

    // Mettre à jour le cercle de rayon
    if (_state.radiusCircle && _state.userPosition) {
      _state.radiusCircle.setRadius(_state.radius);
    }
  }

  function centerOnUser() {
    if (_state.userPosition && _state.map) {
      _state.map.flyTo([_state.userPosition.lat, _state.userPosition.lng], 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }

  function flyTo(lat, lng) {
    _state.map?.flyTo([lat, lng], 17, { animate: true, duration: 0.6 });
  }

  function openScanner() {
    // Redirection vers le module Scanner
    window.Router?.go("scanner");
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  function escHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchOrMock(apiFn, mockData) {
    try {
      const { data, error } = await apiFn();
      if (error || !data) return mockData;
      return data;
    } catch {
      return mockData;
    }
  }

  // ─────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────

  async function loadData(position) {
    const containers = await fetchOrMock(
      () => API.containers.getNearby(position.lat, position.lng, _state.radius),
      MOCK_CONTAINERS,
    );

    _state.containers = containers;
    _state.filtered = containers;

    addMarkers(containers);
    renderContainerList(containers);
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────

  async function init(ctx) {
    Store.actions.setLoading("map", true);

    try {
      // 1. Charger Leaflet dynamiquement
      await loadLeaflet();

      // 2. Obtenir la position utilisateur
      const position = await getUserPosition();
      _state.userPosition = position;

      // 3. Initialiser la carte
      initMap(position);

      // 4. Charger les conteneurs
      await loadData(position);
    } catch (e) {
      console.error("[Map] Erreur initialisation:", e);
      document.getElementById("leaflet-map").innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted">
          <div class="text-center">
            <i class="bi bi-exclamation-triangle" style="font-size:2rem"></i>
            <div class="mt-2 small">Impossible de charger la carte</div>
          </div>
        </div>`;
    } finally {
      Store.actions.setLoading("map", false);
    }
  }

  // Nettoyage quand on quitte la vue (évite les fuites mémoire Leaflet)
  function destroy() {
    if (_state.map) {
      _state.map.remove();
      _state.map = null;
    }
  }

  // ─────────────────────────────────────────
  // ENREGISTREMENT
  // ─────────────────────────────────────────

  window.ProModules = window.ProModules || {};
  window.ProModules.map = {
    init,
    destroy,
    filterStatus,
    setRadius,
    centerOnUser,
    flyTo,
    openContainerDetail,
    openScanner,
  };
})();
