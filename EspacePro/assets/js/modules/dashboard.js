/**
 * dashboard.js — UpcycleConnect Espace Pro
 * Module A — Tasks 38, 39, 40
 *
 * Responsabilités :
 *   Task 38 : Affichage KPIs (score, objets, projets) + accès conditionnel premium
 *   Task 39 : Système d'alertes avec niveaux, filtrage, marquage lu
 *   Task 40 : Tableau de bord avancé (guard premium) + graphiques
 *
 * Pattern : s'enregistre dans window.ProModules.dashboard
 *           init() est appelé par router.js après injection du HTML
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────
  // DONNÉES SIMULÉES
  // Utilisées si l'API Go n'est pas encore disponible.
  // Remplacer par de vrais appels API sans toucher au reste du code.
  // ─────────────────────────────────────────

  // MOCK_KPIS — remplacer par des zéros neutres
  const EMPTY_KPIS = {
    score: 0,
    score_delta: 0,
    objects_saved: 0,
    objects_delta: 0,
    active_projects: 0,
    late_projects: 0,
    co2_kg: 0,
    water_l: 0,
    waste_kg: 0,
    objects_detail: [],
    projects_detail: [],
    monthly: [],
  };

  // MOCK_ALERTS — tableau vide
  const EMPTY_ALERTS = [];

  // MOCK_ACTIVITY — tableau vide
  const EMPTY_ACTIVITY = [];

  // MOCK_SUBSCRIPTION — null (le renderer gère déjà ce cas)
  const EMPTY_SUBSCRIPTION = null;

  // ─────────────────────────────────────────
  // ÉTAT LOCAL DU MODULE
  // ─────────────────────────────────────────

  let _state = {
    kpis: null,
    alerts: [],
    activity: [],
    subscription: null,
    activeFilter: "all",
    isPremium: false,
    session: null,
  };

  // ─────────────────────────────────────────
  // HELPERS — Chargement et erreur
  // ─────────────────────────────────────────

  /**
   * Tente d'appeler l'API Go.
   * Si l'API n'est pas disponible (network error / 404), utilise les données mock.
   * Cela permet de développer le front sans attendre le back.
   */
  async function fetchOrMock(apiFn, mockData, label) {
    try {
      const { data, error } = await apiFn();
      if (error || !data) {
        console.info(
          `[Dashboard] API '${label}' non disponible — données simulées`,
        );
        return mockData;
      }
      return data;
    } catch {
      console.info(
        `[Dashboard] API '${label}' inaccessible — données simulées`,
      );
      return mockData;
    }
  }

  function showToast(msg, type = "success") {
    // Utilise le système de toast Bootstrap si disponible
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

    const colors = {
      success: "var(--uc-vf)",
      error: "var(--uc-tr)",
      warning: "#F59E0B",
    };
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center border-0 text-white show";
    toastEl.style.background = colors[type] || colors.success;
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body" style="font-size:.82rem">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(toastEl);
    new bootstrap.Toast(toastEl, { delay: 3500 }).show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  // ─────────────────────────────────────────
  // RENDERERS — KPIs
  // ─────────────────────────────────────────

  function renderKPIs(kpis) {
    // Score
    const scoreEl = document.getElementById("kpi-score");
    if (scoreEl) {
      scoreEl.textContent = kpis.score;
      // Animer la barre
      setTimeout(() => {
        const bar = document.getElementById("kpi-score-bar");
        if (bar) bar.style.width = `${kpis.score}%`;
      }, 100);
    }

    const scoreDelta = document.getElementById("kpi-score-delta");
    if (scoreDelta) {
      const d = kpis.score_delta;
      scoreDelta.className = `kpi-delta${d < 0 ? " neg" : ""}`;
      scoreDelta.textContent = `${d >= 0 ? "↑ +" : "↓ "}${d} pts ce mois`;
    }

    // Objets sauvés
    const objEl = document.getElementById("kpi-objects");
    if (objEl) objEl.textContent = kpis.objects_saved;

    const objDelta = document.getElementById("kpi-objects-delta");
    if (objDelta) {
      const d = kpis.objects_delta;
      objDelta.className = `kpi-delta${d < 0 ? " neg" : ""}`;
      objDelta.textContent = `${d >= 0 ? "↑ +" : "↓ "}${d} ce mois`;
    }

    // Breakdown matières
    const objBreakdown = document.getElementById("kpi-objects-breakdown");
    if (objBreakdown && kpis.objects_detail) {
      objBreakdown.innerHTML = kpis.objects_detail
        .map(
          (m) => `
        <span style="font-size:.58rem;font-family:var(--uc-mono);color:${m.color};
                     background:${m.color}18;border-radius:4px;padding:.1rem .35rem;font-weight:700">
          ${m.label} ${m.count}
        </span>`,
        )
        .join("");
    }

    // Projets
    const projEl = document.getElementById("kpi-projects");
    if (projEl) projEl.textContent = kpis.active_projects;

    const projDelta = document.getElementById("kpi-projects-delta");
    if (projDelta) {
      projDelta.className = `kpi-delta${kpis.late_projects > 0 ? " neg" : ""}`;
      projDelta.textContent =
        kpis.late_projects > 0
          ? `↓ ${kpis.late_projects} en retard`
          : "✓ Tous à jour";
    }

    // Breakdown statuts projets
    const projBreakdown = document.getElementById("kpi-projects-breakdown");
    if (projBreakdown && kpis.projects_detail) {
      projBreakdown.innerHTML = kpis.projects_detail
        .map(
          (p) => `
        <span style="font-size:.58rem;font-family:var(--uc-mono);color:${p.color};
                     background:${p.color}15;border-radius:4px;padding:.1rem .35rem;font-weight:700">
          ${p.label} ${p.count}
        </span>`,
        )
        .join("");
    }
  }

  // ─────────────────────────────────────────
  // RENDERERS — Impact environnemental
  // ─────────────────────────────────────────

  function renderImpact(kpis) {
    // Score central
    const scoreVal = document.getElementById("impact-score-value");
    if (scoreVal) scoreVal.textContent = kpis.score;

    setTimeout(() => {
      const bar = document.getElementById("impact-score-bar");
      if (bar) bar.style.width = `${kpis.score}%`;
    }, 150);

    // Barres
    const maxCo2 = 1000;
    const maxWater = 2000;
    const maxWaste = 500;

    const barsHtml = `
      <div class="impact-bar-row">
        <div class="impact-bar-label">CO₂ économisé</div>
        <div class="impact-bar-bg">
          <div class="impact-bar-fill"
               style="width:${Math.min(100, (kpis.co2_kg / maxCo2) * 100).toFixed(0)}%;
                      background:var(--uc-vc)"></div>
        </div>
        <div class="impact-bar-val">${kpis.co2_kg} kg</div>
      </div>
      <div class="impact-bar-row">
        <div class="impact-bar-label">Eau préservée</div>
        <div class="impact-bar-bg">
          <div class="impact-bar-fill"
               style="width:${Math.min(100, (kpis.water_l / maxWater) * 100).toFixed(0)}%;
                      background:#3B82F6"></div>
        </div>
        <div class="impact-bar-val">${kpis.water_l} L</div>
      </div>
      <div class="impact-bar-row">
        <div class="impact-bar-label">Déchets évités</div>
        <div class="impact-bar-bg">
          <div class="impact-bar-fill"
               style="width:${Math.min(100, (kpis.waste_kg / maxWaste) * 100).toFixed(0)}%;
                      background:var(--uc-tr)"></div>
        </div>
        <div class="impact-bar-val">${kpis.waste_kg} kg</div>
      </div>
      <div class="impact-bar-row">
        <div class="impact-bar-label">Objets remis</div>
        <div class="impact-bar-bg">
          <div class="impact-bar-fill"
               style="width:${Math.min(100, (kpis.objects_saved / 200) * 100).toFixed(0)}%;
                      background:var(--uc-vm)"></div>
        </div>
        <div class="impact-bar-val">${kpis.objects_saved}</div>
      </div>`;

    const barsEl = document.getElementById("impact-bars");
    if (barsEl) barsEl.innerHTML = barsHtml;
  }

  // ─────────────────────────────────────────
  // RENDERERS — Alertes (Task 39)
  // ─────────────────────────────────────────

  function renderAlerts(alerts, filter = "all") {
    const container = document.getElementById("alerts-list");
    if (!container) return;

    const filtered =
      filter === "all" ? alerts : alerts.filter((a) => a.level === filter);

    // Badge compteur
    const countBadge = document.getElementById("alert-count-badge");
    const unread = alerts.filter((a) => !a.read).length;
    if (countBadge)
      countBadge.textContent = `${unread} non lue${unread > 1 ? "s" : ""}`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-check-circle" style="font-size:2rem;color:var(--uc-vc)"></i>
          <div class="mt-2 small">Aucune alerte dans cette catégorie</div>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (alert) => `
      <div class="alert-item ${alert.level} ${alert.read ? "opacity-75" : ""}"
           id="alert-${alert.id}"
           data-level="${alert.level}">
        <div class="alert-dot ${alert.level} mt-1" style="flex-shrink:0"></div>
        <div class="flex-grow-1">
          <div style="font-size:.78rem;font-weight:700;color:var(--uc-gc)">
            ${alert.read ? "" : '<span class="me-1" style="color:var(--uc-tr)">●</span>'}
            ${escHtml(alert.title)}
          </div>
          <div style="font-size:.7rem;color:var(--uc-gm);margin-top:.1rem">
            ${escHtml(alert.detail)}
          </div>
          ${
            alert.action
              ? `
            <a href="${alert.action.href}"
               class="text-success mt-1 d-inline-block"
               style="font-size:.68rem;font-weight:700;text-decoration:none">
              ${escHtml(alert.action.label)} <i class="bi bi-arrow-right"></i>
            </a>`
              : ""
          }
        </div>
        <div class="d-flex flex-column align-items-end gap-1 flex-shrink-0">
          <span style="font-size:.62rem;color:var(--uc-gl);font-family:var(--uc-mono)">
            ${escHtml(alert.time)}
          </span>
          ${
            !alert.read
              ? `
            <button class="btn btn-sm p-0"
                    style="font-size:.6rem;color:var(--uc-gm);text-decoration:underline;border:none;background:none"
                    onclick="ProModules.dashboard.markAlertRead('${alert.id}')">
              Marquer lu
            </button>`
              : ""
          }
        </div>
      </div>`,
      )
      .join("");
  }

  // ─────────────────────────────────────────
  // RENDERERS — Activité récente
  // ─────────────────────────────────────────

  function renderActivity(activities) {
    const container = document.getElementById("activity-list");
    if (!container) return;

    if (!activities.length) {
      container.innerHTML = `<div class="text-muted text-center py-3 small">Aucune activité récente</div>`;
      return;
    }

    container.innerHTML = activities
      .map(
        (a) => `
      <div class="activity-item">
        <div class="activity-icon-circle" style="background:${a.bg}">${a.icon}</div>
        <div class="flex-grow-1">
          <div style="font-size:.78rem;font-weight:700;color:var(--uc-gc)">${escHtml(a.label)}</div>
          <div style="font-size:.7rem;color:var(--uc-gm)">${escHtml(a.detail)}</div>
        </div>
        <div style="font-size:.62rem;color:var(--uc-gl);font-family:var(--uc-mono);flex-shrink:0">
          ${escHtml(a.time)}
        </div>
      </div>`,
      )
      .join("");
  }

  // ─────────────────────────────────────────
  // RENDERERS — Widget Abonnement
  // ─────────────────────────────────────────

  function renderSubscription(sub) {
    const container = document.getElementById("subscription-widget");
    if (!container) return;

    // Valeurs par défaut si l'API ne retourne pas ces champs
    sub = sub || MOCK_SUBSCRIPTION;
    if (!sub.features) sub.features = MOCK_SUBSCRIPTION.features;
    if (!sub.label)
      sub.label = sub.plan === "PREMIUM" ? "Pro Premium" : "Pro Standard";
    if (!sub.price)
      sub.price = sub.price_ttc ? sub.price_ttc + " €/mois" : "15,00 €/mois";
    if (!sub.renewal_date) sub.renewal_date = sub.renewal_date || "–";

    const isPrem = sub.plan === "PREMIUM";
    container.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div>
          <span style="font-size:.9rem;font-weight:700;color:var(--uc-vf)">${escHtml(sub.label)}</span>
          ${isPrem ? '<span class="ms-2 badge" style="background:linear-gradient(135deg,#F59E0B,#D97706);font-size:.55rem">★ PREMIUM</span>' : ""}
        </div>
        <span style="font-size:.75rem;font-family:var(--uc-mono);color:var(--uc-gm)">${escHtml(sub.price)}</span>
      </div>
      <div style="font-size:.7rem;color:var(--uc-gm);margin-bottom:.85rem">
        <i class="bi bi-calendar-check me-1"></i>Renouvellement le ${escHtml(sub.renewal_date)}
      </div>
      <div class="row g-2 mb-3">
        ${sub.features
          .map(
            (f) => `
          <div class="col-6">
            <div class="text-center rounded-2 p-2" style="background:${f.bg}">
              <div style="font-size:.58rem;font-family:var(--uc-mono);color:var(--uc-gm)">${escHtml(f.label)}</div>
              <div style="font-size:.95rem;font-weight:700;color:${f.color}">${escHtml(f.value)}</div>
            </div>
          </div>`,
          )
          .join("")}
      </div>
      ${
        !isPrem
          ? `
        <a href="#/subscription"
           class="btn btn-sm w-100"
           style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;font-weight:700;border-radius:10px">
          <i class="bi bi-stars me-1"></i>Passer au Premium
        </a>`
          : `
        <a href="#/subscription"
           class="btn btn-sm btn-outline-secondary w-100"
           style="font-size:.75rem;border-radius:10px">
          Gérer l'abonnement
        </a>`
      }`;
  }

  // ─────────────────────────────────────────
  // TABLEAU DE BORD AVANCÉ (Task 40 — Premium)
  // ─────────────────────────────────────────

  function renderAdvancedDashboard(kpis) {
    const container = document.getElementById("advanced-dashboard-content");
    if (!container) return;

    const monthly = kpis.monthly || [];
    const maxObjects = Math.max(...monthly.map((m) => m.objects), 1);
    const maxCo2 = Math.max(...monthly.map((m) => m.co2), 1);

    // Calculs sur 12 mois
    const totalObjects = monthly.reduce((s, m) => s + m.objects, 0);
    const totalCo2 = monthly.reduce((s, m) => s + m.co2, 0);
    const avgScore = Math.round(
      monthly.reduce((s, m) => s + m.score, 0) / monthly.length,
    );
    const bestMonth = monthly.reduce(
      (best, m) => (m.objects > best.objects ? m : best),
      monthly[0],
    );

    container.innerHTML = `

      <!-- Stats synthèse annuelle -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="text-center p-3 rounded-3" style="background:var(--uc-vxl)">
            <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:var(--uc-vf)">${totalObjects}</div>
            <div style="font-family:var(--uc-mono);font-size:.58rem;color:var(--uc-gm);letter-spacing:.1em">OBJETS / 12 MOIS</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="text-center p-3 rounded-3" style="background:var(--uc-trl)">
            <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:var(--uc-tr)">${totalCo2} kg</div>
            <div style="font-family:var(--uc-mono);font-size:.58rem;color:var(--uc-gm);letter-spacing:.1em">CO₂ ÉVITÉ TOTAL</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="text-center p-3 rounded-3" style="background:#EFF6FF">
            <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:#1D4ED8">${avgScore}</div>
            <div style="font-family:var(--uc-mono);font-size:.58rem;color:var(--uc-gm);letter-spacing:.1em">SCORE MOYEN</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="text-center p-3 rounded-3" style="background:#FFF7E6">
            <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:#92400E">${bestMonth?.month || "–"}</div>
            <div style="font-family:var(--uc-mono);font-size:.58rem;color:var(--uc-gm);letter-spacing:.1em">MEILLEUR MOIS</div>
          </div>
        </div>
      </div>

      <!-- Graphique objets (barres CSS) -->
      <div class="pro-card mb-3">
        <div class="pro-card-title">
          <i class="bi bi-bar-chart me-2"></i>Objets sauvés par mois
        </div>
        <div class="d-flex align-items-end gap-1" style="height:120px;padding-bottom:1.5rem;position:relative">
          ${monthly
            .map((m) => {
              const h = Math.round((m.objects / maxObjects) * 100);
              return `
              <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-end gap-1"
                   title="${m.month} : ${m.objects} objets">
                <span style="font-size:.55rem;font-family:var(--uc-mono);color:var(--uc-gm)">${m.objects}</span>
                <div style="width:100%;height:${h}%;background:var(--uc-vc);border-radius:4px 4px 0 0;
                            min-height:4px;transition:height .5s ease"></div>
                <span style="font-size:.5rem;font-family:var(--uc-mono);color:var(--uc-gl);
                             position:absolute;bottom:0">${m.month}</span>
              </div>`;
            })
            .join("")}
        </div>
      </div>

      <!-- Graphique CO₂ (ligne CSS) -->
      <div class="pro-card mb-3">
        <div class="pro-card-title">
          <i class="bi bi-graph-up me-2"></i>CO₂ évité cumulé (kg) — 12 mois
        </div>
        <div style="position:relative;height:100px;padding:0 8px">
          <svg width="100%" height="100px" viewBox="0 0 ${monthly.length * 60} 100" preserveAspectRatio="none">
            <!-- Aire sous la courbe -->
            <defs>
              <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2E6B47" stop-opacity=".25"/>
                <stop offset="100%" stop-color="#2E6B47" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <polyline
              points="${monthly
                .map((m, i) => {
                  const x = i * 60 + 30;
                  const y = 90 - Math.round((m.co2 / maxCo2) * 80);
                  return `${x},${y}`;
                })
                .join(" ")}"
              fill="none" stroke="var(--uc-vc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${monthly
              .map((m, i) => {
                const x = i * 60 + 30;
                const y = 90 - Math.round((m.co2 / maxCo2) * 80);
                return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--uc-vm)"/>`;
              })
              .join("")}
          </svg>
          <div class="d-flex justify-content-between" style="font-size:.5rem;font-family:var(--uc-mono);color:var(--uc-gl);margin-top:.25rem">
            ${monthly.map((m) => `<span>${m.month}</span>`).join("")}
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="d-flex gap-2 justify-content-end">
        <button class="btn btn-sm btn-outline-secondary"
                onclick="ProModules.dashboard.exportCSV()">
          <i class="bi bi-download me-1"></i>Export CSV
        </button>
        <button class="btn btn-sm" style="background:var(--uc-vf);color:#fff"
                onclick="ProModules.dashboard.exportPDF()">
          <i class="bi bi-file-earmark-pdf me-1"></i>Export PDF
        </button>
      </div>`;
  }

  // ─────────────────────────────────────────
  // ACTIONS PUBLIQUES
  // ─────────────────────────────────────────

  /**
   * Filtre les alertes par niveau sans re-fetch.
   * Appelé par les boutons de filtre dans le HTML.
   */
  function filterAlerts(level, btn) {
    _state.activeFilter = level;

    // Activer le bouton sélectionné
    document
      .querySelectorAll(".alert-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    renderAlerts(_state.alerts, level);
  }

  /**
   * Marque une alerte comme lue (appel API + mise à jour locale).
   */
  async function markAlertRead(alertId) {
    // Mise à jour optimiste (UI d'abord, API ensuite)
    _state.alerts = _state.alerts.map((a) =>
      a.id === alertId ? { ...a, read: true } : a,
    );
    renderAlerts(_state.alerts, _state.activeFilter);

    // Appel API (best-effort — pas bloquant)
    try {
      await API.dashboard.markAlertRead(alertId);
    } catch (e) {
      // Non bloquant — l'UI reste à jour localement
    }
  }

  /** Ouvre le modal Tableau Avancé (guard premium dedans) */
  function openAdvanced() {
    // Guard premium sur cette action spécifique
    const advancedContent = document.getElementById(
      "advanced-dashboard-content",
    );
    const session = Auth.guardPremium(advancedContent);
    if (!session) {
      // guardPremium a déjà injecté le message d'upgrade dans le container
      const modal = new bootstrap.Modal(
        document.getElementById("modal-advanced-dashboard"),
      );
      modal.show();
      return;
    }

    renderAdvancedDashboard(_state.kpis || EMPTY_KPIS);
    const modal = new bootstrap.Modal(
      document.getElementById("modal-advanced-dashboard"),
    );
    modal.show();
  }

  /** Export CSV des données mensuelles */
  function exportCSV() {
    const kpis = _state.kpis || EMPTY_KPIS;
    const rows = [
      ["Mois", "Objets sauvés", "CO₂ évité (kg)", "Score"],
      ...(kpis.monthly || []).map((m) => [m.month, m.objects, m.co2, m.score]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `upcycleconnect-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("Export CSV téléchargé ✓");
  }

  /** Export PDF — déclenche l'impression navigateur (approche simple sans librairie) */
  function exportPDF() {
    showToast("Ouverture de l'aperçu d'impression…", "success");
    setTimeout(() => window.print(), 400);
  }

  /** Rafraîchit toutes les données (bouton rechargement) */
  async function refresh() {
    const btn = document.getElementById("btn-refresh-dash");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    // Invalide le cache
    Store.actions.setCache("kpis", null);
    Store.actions.setCache("alerts", null);

    await loadAllData();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
    }
    showToast("Données actualisées ✓");
  }

  // ─────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ─────────────────────────────────────────

  async function loadAllData() {
    Store.actions.setLoading("dashboard", true);

    // Chargements en parallèle pour la performance
    const [kpis, alerts, activity, subscription] = await Promise.all([
      fetchOrMock(() => API.dashboard.getKPIs(), EMPTY_KPIS, "getKPIs"),
      fetchOrMock(() => API.dashboard.getAlerts(10), EMPTY_ALERTS, "getAlerts"),
      fetchOrMock(
        () => API.dashboard.getRecentActivity(5),
        EMPTY_ACTIVITY,
        "getActivity",
      ),
      fetchOrMock(
        () => API.subscription.getCurrent(),
        EMPTY_SUBSCRIPTION,
        "getSubscription",
      ),
    ]);

    // Mise en cache
    Store.actions.setCache("kpis", kpis);

    // Sauvegarde dans l'état local
    _state.kpis = kpis;
    _state.alerts = alerts;
    _state.activity = activity;
    _state.subscription = subscription;

    // Rendu de tous les composants
    renderKPIs(kpis);
    renderImpact(kpis);
    renderAlerts(alerts, _state.activeFilter);
    renderActivity(activity);
    renderSubscription(subscription);

    Store.actions.setLoading("dashboard", false);
  }

  // ─────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────

  /** Échappe le HTML pour prévenir les XSS */
  function escHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bonne après-midi";
    return "Bonsoir";
  }

  // ─────────────────────────────────────────
  // POINT D'ENTRÉE — appelé par router.js
  // ─────────────────────────────────────────

  /**
   * init() est appelé par router.js après que le HTML de la vue
   * a été injecté dans #pro-view.
   *
   * @param {object} ctx - { path, params, session, isPremium }
   */
  async function init(ctx) {
    _state.isPremium = ctx.isPremium;
    _state.session = ctx.session;

    // ── Greeting personnalisé ──
    const user = Store.get("user");
    const greetEl = document.getElementById("dash-greeting");
    if (greetEl && user) {
      greetEl.textContent = `${getGreeting()}, ${user.prenom || "Pro"} 🌱`;
    }

    // ── Sous-titre date ──
    const subtitleEl = document.getElementById("dash-subtitle");
    if (subtitleEl) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      subtitleEl.textContent = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} · Abonnement ${
        _state.isPremium ? "Pro Premium actif" : "Pro Standard"
      }`;
    }

    // ── Bouton tableau avancé (premium uniquement) ──
    const advBtn = document.getElementById("btn-advanced-dashboard");
    if (advBtn) {
      // On l'affiche toujours, mais il affichera le message upgrade si non-premium
      advBtn.style.removeProperty("display");
      advBtn.style.display = "";
    }

    // ── Utilise le cache si données fraîches (< 2 min) ──
    if (Store.actions.isCacheValid("kpis") && Store.get("cache").kpis.data) {
      const cached = Store.get("cache").kpis.data;
      _state.kpis = cached;
      renderKPIs(cached);
      renderImpact(cached);
      // Alertes et activité pas mis en cache (toujours fresh)
    }

    // ── Chargement complet ──
    await loadAllData();
  }

  // ─────────────────────────────────────────
  // ENREGISTREMENT dans ProModules
  // ─────────────────────────────────────────

  window.ProModules = window.ProModules || {};
  window.ProModules.dashboard = {
    init,
    refresh,
    filterAlerts,
    markAlertRead,
    openAdvanced,
    exportCSV,
    exportPDF,
  };
})();
