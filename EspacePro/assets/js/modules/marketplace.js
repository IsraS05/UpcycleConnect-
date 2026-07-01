/**
 * marketplace.js — UpcycleConnect Espace Pro
 * Module C — Tasks 46-47
 *
 * Responsabilités :
 *   Task 46 : Catalogue avec recherche fulltext + filtres (matériau, état, distance)
 *   Task 47 : Checkout Stripe — création session via API Go → redirect
 *
 * Architecture :
 *   - Filtrage + tri + pagination 100% côté client sur données chargées une fois
 *   - Debounce sur la recherche texte (évite les re-renders à chaque frappe)
 *   - Checkout : API Go crée la Stripe Session → on reçoit l'URL → redirect
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────
  // CATALOGUE DES MATÉRIAUX (référentiel)
  // ─────────────────────────────────────────

  const MATERIALS = [
    {
      id: "tous",
      label: "Tous",
      emoji: "",
      bg: "var(--uc-gxl)",
      color: "var(--uc-gc)",
    },
    { id: "bois", label: "Bois", emoji: "🪵", bg: "#FEF3E2", color: "#92400E" },
    {
      id: "metal",
      label: "Métal",
      emoji: "⚙️",
      bg: "#F1F5F9",
      color: "#334155",
    },
    {
      id: "plastique",
      label: "Plastique",
      emoji: "♳",
      bg: "#EFF6FF",
      color: "#1E40AF",
    },
    {
      id: "textile",
      label: "Textile",
      emoji: "🧵",
      bg: "#FDF2F8",
      color: "#9D174D",
    },
    {
      id: "verre",
      label: "Verre",
      emoji: "🫙",
      bg: "#ECFDF5",
      color: "#065F46",
    },
    {
      id: "papier",
      label: "Papier",
      emoji: "📦",
      bg: "#FFF7E6",
      color: "#92400E",
    },
    {
      id: "autre",
      label: "Autre",
      emoji: "♻️",
      bg: "var(--uc-vxl)",
      color: "var(--uc-vm)",
    },
  ];

  const MOCK_ITEMS = [];

  // ─────────────────────────────────────────
  // ÉTAT LOCAL
  // ─────────────────────────────────────────

  const PAGE_SIZE = 9;

  let _state = {
    items: [],
    filtered: [],
    activeMaterial: "tous",
    activeCondition: "",
    activeDistance: 5,
    searchQuery: "",
    sortBy: "recent",
    currentPage: 1,
    selectedItem: null, // Item ouvert dans le modal détail
    stripeSessionUrl: null, // URL Stripe en attente de redirection
    _searchTimer: null, // Debounce timer
  };

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

  function formatPrice(p) {
    return p.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  }

  function getMaterialInfo(id) {
    return (
      MATERIALS.find((m) => m.id === id) || MATERIALS[MATERIALS.length - 1]
    );
  }

  function showToast(msg, type = "success") {
    const colors = {
      success: "var(--uc-vf)",
      error: "var(--uc-tr)",
      warning: "#F59E0B",
    };
    const container =
      document.getElementById("toast-container") ||
      (() => {
        const el = document.createElement("div");
        el.id = "toast-container";
        el.className = "toast-container position-fixed bottom-0 end-0 p-3";
        el.style.zIndex = 9999;
        document.body.appendChild(el);
        return el;
      })();
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center border-0 text-white show";
    toastEl.style.background = colors[type] || colors.success;
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body" style="font-size:.82rem">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(toastEl);
    new bootstrap.Toast(toastEl, { delay: 4000 }).show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
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
  // FILTRAGE & TRI
  // ─────────────────────────────────────────

  function applyFiltersAndSort() {
    let result = [..._state.items];

    // Filtre matériau
    if (_state.activeMaterial !== "tous") {
      result = result.filter((i) => i.material === _state.activeMaterial);
    }

    // Filtre état
    if (_state.activeCondition) {
      if (_state.activeCondition === "don") {
        result = result.filter((i) => i.is_free);
      } else {
        result = result.filter(
          (i) => i.condition === _state.activeCondition && !i.is_free,
        );
      }
    }

    // Filtre distance
    if (_state.activeDistance && _state.activeDistance < 50) {
      result = result.filter(
        (i) =>
          i.distance_km === undefined ||
          i.distance_km === 0 ||
          i.distance_km <= _state.activeDistance,
      );
    }

    // Recherche fulltext (name + description + location)
    if (_state.searchQuery) {
      const q = _state.searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.material.toLowerCase().includes(q),
      );
    }

    // Tri
    result.sort((a, b) => {
      switch (_state.sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "weight":
          return b.weight_kg - a.weight_kg;
        case "recent":
        default:
          return new Date(b.posted_at) - new Date(a.posted_at);
      }
    });

    _state.filtered = result;
    _state.currentPage = 1;

    // Badge compteur
    const countEl = document.getElementById("results-count");
    if (countEl) {
      countEl.textContent = `${result.length} annonce${result.length > 1 ? "s" : ""}`;
    }
  }

  // ─────────────────────────────────────────
  // RENDERERS — Chips matériaux
  // ─────────────────────────────────────────

  function renderMaterialChips() {
    const container = document.getElementById("material-filters");
    if (!container) return;

    container.innerHTML = MATERIALS.map(
      (m) => `
      <span class="mat-chip ${m.id === _state.activeMaterial ? "active" : ""}"
            data-mat="${m.id}"
            onclick="ProModules.marketplace.setMaterial('${m.id}', this)">
        ${m.emoji ? m.emoji + " " : ""}${m.label}
      </span>`,
    ).join("");
  }

  // ─────────────────────────────────────────
  // RENDERERS — Tags actifs
  // ─────────────────────────────────────────

  function renderActiveTags() {
    const container = document.getElementById("active-tags");
    if (!container) return;

    const tags = [];
    if (_state.activeMaterial !== "tous") {
      const m = getMaterialInfo(_state.activeMaterial);
      tags.push({
        label: `${m.emoji} ${m.label}`,
        clear: () => setMaterial("tous"),
      });
    }
    if (_state.activeCondition) {
      tags.push({
        label:
          _state.activeCondition === "don"
            ? "Don gratuit"
            : `État: ${_state.activeCondition}`,
        clear: () => setFilter("condition", ""),
      });
    }
    if (_state.searchQuery) {
      tags.push({
        label: `"${_state.searchQuery}"`,
        clear: () => {
          _state.searchQuery = "";
          document.getElementById("search-input").value = "";
          applyFiltersAndSort();
          renderGrid();
          renderActiveTags();
        },
      });
    }

    container.innerHTML = tags
      .map(
        (t, i) => `
      <span class="active-tag">
        ${escHtml(t.label)}
        <button onclick="ProModules.marketplace._clearTag(${i})" title="Supprimer">✕</button>
      </span>`,
      )
      .join("");

    // Stockage des callbacks (closure-safe via index)
    _state._tagClearFns = tags.map((t) => t.clear);
  }

  function _clearTag(index) {
    if (_state._tagClearFns?.[index]) {
      _state._tagClearFns[index]();
      applyFiltersAndSort();
      renderGrid();
      renderActiveTags();
    }
  }

  // ─────────────────────────────────────────
  // RENDERERS — Grille items
  // ─────────────────────────────────────────

  function renderGrid() {
    const grid = document.getElementById("market-grid");
    if (!grid) return;

    const start = (_state.currentPage - 1) * PAGE_SIZE;
    const paged = _state.filtered.slice(start, start + PAGE_SIZE);

    if (paged.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div style="font-size:3rem">🌿</div>
          <div class="text-muted mt-2">
            Aucune annonce ne correspond à vos filtres.<br>
            <button class="btn btn-sm btn-outline-success mt-2"
                    onclick="ProModules.marketplace.resetFilters()">
              Réinitialiser les filtres
            </button>
          </div>
        </div>`;
      renderPagination();
      return;
    }

    grid.innerHTML = paged
      .map((item) => {
        const mat = getMaterialInfo(item.material);
        return `
        <div class="col-12 col-sm-6 col-xl-4">
          <div class="market-card" onclick="ProModules.marketplace.openDetail('${item.id}')">
            <!-- Image / visuel matériau -->
            <div class="market-card-img" style="background:${mat.bg}">
              <span style="font-size:3.5rem">${mat.emoji || "♻️"}</span>
              <span class="mat-tag" style="background:${mat.bg};color:${mat.color}">
                ${mat.label}
              </span>
              <span class="cond-tag">
                ${item.is_free ? "🎁 Don" : item.condition === "bon" ? "★ Bon état" : "~ Moyen"}
              </span>
            </div>
            <!-- Corps -->
            <div class="market-card-body">
              <div style="font-size:.85rem;font-weight:700;color:var(--uc-gc);margin-bottom:.25rem;
                          line-height:1.3">
                ${escHtml(item.name)}
              </div>
              <div style="font-size:.7rem;color:var(--uc-gm);margin-bottom:.6rem;
                          line-height:1.4;flex:1">
                ${escHtml(item.description.slice(0, 80))}…
              </div>
              <!-- Méta -->
              <div class="d-flex gap-2 mb-2 flex-wrap">
                <span style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                  <i class="bi bi-geo-alt"></i> ${escHtml(item.location)}
                </span>
                <span style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                  ${item.distance_km} km
                </span>
                <span style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                  <i class="bi bi-box"></i> ${item.weight_kg} kg
                </span>
              </div>
              <!-- Prix + CTA -->
              <div class="d-flex align-items-center justify-content-between mt-auto">
                <div>
                  ${
                    item.is_free
                      ? `<div style="font-family:var(--uc-fd);font-size:1rem;font-weight:700;color:var(--uc-vc)">Gratuit</div>`
                      : `<div style="font-family:var(--uc-fd);font-size:1.1rem;font-weight:700;color:var(--uc-vf)">
                         ${formatPrice(item.price)}
                       </div>`
                  }
                  <div style="font-size:.58rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                    ${item.objects_count} objet${item.objects_count > 1 ? "s" : ""}
                  </div>
                </div>
                <button class="btn btn-sm rounded-pill fw-bold"
                        style="background:var(--uc-vf);color:#fff;font-size:.72rem;padding:.3rem .9rem"
                        onclick="event.stopPropagation();ProModules.marketplace.openDetail('${item.id}')">
                  ${item.is_free ? "Réserver" : "Acheter"}
                </button>
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");

    renderPagination();
  }

  function renderPagination() {
    const container = document.getElementById("market-pagination");
    if (!container) return;

    const total = Math.ceil(_state.filtered.length / PAGE_SIZE);
    if (total <= 1) {
      container.innerHTML = "";
      return;
    }

    let html = `<div class="mkt-page-btn ${_state.currentPage === 1 ? "opacity-50" : ""}"
                     onclick="ProModules.marketplace.goToPage(${_state.currentPage - 1})">‹</div>`;
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - _state.currentPage) <= 1) {
        html += `<div class="mkt-page-btn ${p === _state.currentPage ? "active" : ""}"
                      onclick="ProModules.marketplace.goToPage(${p})">${p}</div>`;
      } else if (Math.abs(p - _state.currentPage) === 2) {
        html += `<div class="mkt-page-btn" style="cursor:default;border:none;pointer-events:none">…</div>`;
      }
    }
    html += `<div class="mkt-page-btn ${_state.currentPage === total ? "opacity-50" : ""}"
                  onclick="ProModules.marketplace.goToPage(${_state.currentPage + 1})">›</div>`;
    container.innerHTML = html;
  }

  // ─────────────────────────────────────────
  // MODAL DÉTAIL
  // ─────────────────────────────────────────

  function openDetail(itemId) {
    const item = _state.items.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    _state.selectedItem = item;

    const mat = getMaterialInfo(item.material);

    // Titre modal
    const titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = item.name;

    // Corps modal
    const body = document.getElementById("modal-item-body");
    if (body) {
      body.innerHTML = `
        <div class="row g-3">
          <!-- Visuel -->
          <div class="col-12 col-md-5">
            <div class="rounded-3 d-flex align-items-center justify-content-center"
                 style="height:200px;background:${mat.bg};font-size:6rem">
              ${mat.emoji || "♻️"}
            </div>
            <!-- Impact calcul -->
            ${(() => {
              const impact = window.API?.projects?.calculateImpact(
                item.weight_kg,
                item.material,
              ) || {
                co2_kg: (item.weight_kg * 0.6).toFixed(1),
                water_l: 0,
                score_points: 0,
              };
              return `
                <div class="mt-2 p-2 rounded-3" style="background:var(--uc-vxl)">
                  <div style="font-size:.6rem;font-family:var(--uc-mono);color:var(--uc-gm);
                               margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.1em">
                    Impact estimé si upcyclé
                  </div>
                  <div class="d-flex gap-2">
                    <span class="impact-chip">🌿 ${impact.co2_kg} kg CO₂</span>
                    <span class="impact-chip blue">⭐ +${impact.score_points} pts</span>
                  </div>
                </div>`;
            })()}
          </div>
          <!-- Infos -->
          <div class="col-12 col-md-7">
            <p style="font-size:.82rem;line-height:1.65;color:var(--uc-gc);margin-bottom:1rem">
              ${escHtml(item.description)}
            </p>
            <div class="scan-result-row">
              <span class="scan-result-label">Matériau</span>
              <span class="scan-result-val">${mat.emoji} ${mat.label}</span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">État</span>
              <span class="scan-result-val">
                ${item.condition === "bon" ? "★ Bon état" : "~ État moyen"}
              </span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">Poids total</span>
              <span class="scan-result-val">${item.weight_kg} kg</span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">Quantité</span>
              <span class="scan-result-val">
                ${item.objects_count} objet${item.objects_count > 1 ? "s" : ""}
              </span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">Localisation</span>
              <span class="scan-result-val">
                <i class="bi bi-geo-alt"></i> ${escHtml(item.location)} · ${item.distance_km} km
              </span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">Proposé par</span>
              <span class="scan-result-val">${escHtml(item.seller)}</span>
            </div>
            <div class="scan-result-row">
              <span class="scan-result-label">Publié le</span>
              <span class="scan-result-val">
                ${new Date(item.posted_at).toLocaleDateString("fr-FR")}
              </span>
            </div>

            <!-- Prix -->
            <div class="mt-3 p-3 rounded-3"
                 style="background:${item.is_free ? "var(--uc-vxl)" : "var(--uc-gxl)"}">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                    ${item.is_free ? "DON GRATUIT" : "PRIX TTC"}
                  </div>
                  <div style="font-family:var(--uc-fd);font-size:1.6rem;font-weight:700;
                               color:${item.is_free ? "var(--uc-vc)" : "var(--uc-vf)"}">
                    ${item.is_free ? "Gratuit" : formatPrice(item.price)}
                  </div>
                </div>
                ${
                  !item.is_free
                    ? `
                  <div class="text-end">
                    <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                      Prix/kg estimé
                    </div>
                    <div style="font-family:var(--uc-mono);font-weight:700;color:var(--uc-gc)">
                      ${(item.price / item.weight_kg).toFixed(2)} €/kg
                    </div>
                  </div>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>`;
    }

    // Bouton checkout
    const checkoutBtn = document.getElementById("btn-checkout");
    const checkoutLabel = document.getElementById("checkout-label");
    if (checkoutBtn && checkoutLabel) {
      checkoutLabel.textContent = item.is_free
        ? "Réserver gratuitement"
        : `Payer ${formatPrice(item.price)}`;
    }

    new bootstrap.Modal(document.getElementById("modal-item-detail")).show();
  }

  // ─────────────────────────────────────────
  // CHECKOUT STRIPE (Task 47)
  // ─────────────────────────────────────────

  async function startCheckout() {
    const item = _state.selectedItem;
    if (!item) return;

    const btn = document.getElementById("btn-checkout");
    const label = document.getElementById("checkout-label");
    const spinner = document.getElementById("checkout-spinner");

    btn.disabled = true;
    label.textContent = "Création de la session…";
    spinner.style.display = "";

    try {
      // Appel API Go → POST /api/pro/marketplace/checkout
      // L'API Go crée une Stripe Checkout Session et retourne { stripe_session_url }
      const { data, error } = await API.marketplace.createCheckout(item.id, 1);

      if (error || !data?.stripe_session_url) {
        // Fallback simulation si API non disponible
        console.info("[Marketplace] API checkout non disponible — simulation");
        _state.stripeSessionUrl = `https://checkout.stripe.com/pay/cs_test_SIMULATION_${item.id}`;
      } else {
        _state.stripeSessionUrl = data.stripe_session_url;
      }

      // Ferme le modal détail
      bootstrap.Modal.getInstance(
        document.getElementById("modal-item-detail"),
      )?.hide();

      // Ouvre le modal de confirmation Stripe
      const confirmText = document.getElementById("stripe-confirm-text");
      if (confirmText) {
        confirmText.innerHTML = `
          Vous allez être redirigé vers Stripe pour payer
          <strong>${item.is_free ? "gratuitement" : formatPrice(item.price)}</strong>
          pour <strong>${escHtml(item.name)}</strong>.`;
      }

      setTimeout(() => {
        new bootstrap.Modal(
          document.getElementById("modal-stripe-confirm"),
        ).show();
      }, 300);
    } catch (e) {
      showToast(
        "Erreur lors de la création de la session de paiement",
        "error",
      );
    } finally {
      btn.disabled = false;
      label.textContent = _state.selectedItem?.is_free
        ? "Réserver gratuitement"
        : `Payer ${formatPrice(_state.selectedItem?.price || 0)}`;
      spinner.style.display = "none";
    }
  }

  function redirectToStripe() {
    if (!_state.stripeSessionUrl) return;

    const btn = document.getElementById("btn-go-stripe");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-1"></span>Redirection…';
    }

    // En mode simulation, on affiche juste un toast
    if (_state.stripeSessionUrl.includes("SIMULATION")) {
      bootstrap.Modal.getInstance(
        document.getElementById("modal-stripe-confirm"),
      )?.hide();
      showToast(
        "🔗 Redirection Stripe simulée — API Go non connectée",
        "warning",
      );
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="bi bi-box-arrow-up-right me-1"></i>Payer sur Stripe';
      }
      return;
    }

    // Redirection réelle vers Stripe
    window.location.href = _state.stripeSessionUrl;
  }

  // ─────────────────────────────────────────
  // ACTIONS PUBLIQUES
  // ─────────────────────────────────────────

  function setMaterial(matId, chipEl) {
    _state.activeMaterial = matId;

    document
      .querySelectorAll(".mat-chip")
      .forEach((c) => c.classList.remove("active"));
    if (chipEl) chipEl.classList.add("active");
    else {
      const target = document.querySelector(`[data-mat="${matId}"]`);
      if (target) target.classList.add("active");
    }

    applyFiltersAndSort();
    renderGrid();
    renderActiveTags();
  }

  function setFilter(key, value) {
    if (key === "condition") _state.activeCondition = value;
    if (key === "distance")
      _state.activeDistance = value ? parseFloat(value) : null;
    applyFiltersAndSort();
    renderGrid();
    renderActiveTags();
  }

  function setSort(sortKey, linkEl) {
    _state.sortBy = sortKey;
    const labels = {
      recent: "Plus récent",
      price_asc: "Prix croissant",
      price_desc: "Prix décroissant",
      weight: "Poids décroissant",
    };
    const labelEl = document.getElementById("sort-label");
    if (labelEl) labelEl.textContent = labels[sortKey] || sortKey;
    applyFiltersAndSort();
    renderGrid();
  }

  function onSearchInput(value) {
    clearTimeout(_state._searchTimer);
    _state._searchTimer = setTimeout(() => {
      _state.searchQuery = value.trim();
      applyFiltersAndSort();
      renderGrid();
      renderActiveTags();
    }, 280); // Debounce 280ms
  }

  function resetFilters() {
    _state.activeMaterial = "tous";
    _state.activeCondition = "";
    _state.activeDistance = null;
    _state.searchQuery = "";
    _state.sortBy = "recent";

    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";

    const condFilter = document.getElementById("condition-filter");
    if (condFilter) condFilter.value = "";

    renderMaterialChips();
    applyFiltersAndSort();
    renderGrid();
    renderActiveTags();
  }

  function goToPage(page) {
    const total = Math.ceil(_state.filtered.length / PAGE_SIZE);
    if (page < 1 || page > total) return;
    _state.currentPage = page;
    renderGrid();
    document
      .getElementById("market-grid")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ─────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────

  async function loadData() {
    const filters = {
      material: _state.activeMaterial !== "tous" ? _state.activeMaterial : "",
    };

    const items = await fetchOrMock(
      () => API.marketplace.getItems(filters),
      MOCK_ITEMS,
    );

    _state.items = items;
    applyFiltersAndSort();
    renderMaterialChips();
    renderGrid();
    renderActiveTags();
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────

  async function init(ctx) {
    await loadData();
  }

  // ─────────────────────────────────────────
  // ENREGISTREMENT
  // ─────────────────────────────────────────

  window.ProModules = window.ProModules || {};
  window.ProModules.marketplace = {
    init,
    setMaterial,
    setFilter,
    setSort,
    onSearchInput,
    resetFilters,
    openDetail,
    startCheckout,
    redirectToStripe,
    goToPage,
    _clearTag,
  };
})();
