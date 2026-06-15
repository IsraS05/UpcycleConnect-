(function () {
  "use strict";

  const MOCK_SUBSCRIPTION = {
    id: null,
    plan: "STANDARD",
    status: "active",
    price_ht: 0,
    price_ttc: 0,
    tva_pct: 20,
    currency: "EUR",
    start_date: null,
    renewal_date: null,
    next_billing: null,
    payment_method: "",
    stripe_customer: "",
    siret: "",
    raison_sociale: "",
  };

  const PLANS = [
    {
      id: "STANDARD",
      label: "Pro Standard",
      price_ttc: 0,
      price_label: "Gratuit",
      subtitle: "Pour démarrer",
      color: "var(--uc-gm)",
      recommended: false,
      features: [
        { label: "Annonces publiées", value: "5/mois", available: true },
        { label: "Projets actifs", value: "3 max", available: true },
        { label: "Scan QR conteneurs", value: "✓", available: true },
        { label: "Marketplace — achat", value: "✓", available: true },
        { label: "Publicités visibles", value: "0", available: true },
        { label: "Tableau de bord avancé", value: "–", available: false },
        { label: "Export PDF/CSV", value: "–", available: false },
        { label: "Support prioritaire", value: "–", available: false },
      ],
    },
    {
      id: "PREMIUM",
      label: "Pro Premium",
      price_ttc: 29.0,
      price_label: "29,00 €",
      subtitle: "Pour les actifs",
      color: "var(--uc-vf)",
      recommended: true,
      features: [
        { label: "Annonces publiées", value: "Illimitées", available: true },
        { label: "Projets actifs", value: "Illimités", available: true },
        { label: "Scan QR conteneurs", value: "✓", available: true },
        { label: "Marketplace — achat", value: "✓", available: true },
        { label: "Publicités visibles", value: "3", available: true },
        { label: "Tableau de bord avancé", value: "✓", available: true },
        { label: "Export PDF/CSV", value: "✓", available: true },
        { label: "Support prioritaire", value: "✓", available: true },
      ],
    },
    {
      id: "ENTERPRISE",
      label: "Pro Entreprise",
      price_ttc: null,
      price_label: "Sur devis",
      subtitle: "Multi-sites & volumes",
      color: "#7C3AED",
      recommended: false,
      features: [
        { label: "Annonces publiées", value: "Illimitées", available: true },
        { label: "Projets actifs", value: "Illimités", available: true },
        { label: "Scan QR conteneurs", value: "✓", available: true },
        { label: "Marketplace — achat", value: "✓", available: true },
        { label: "Publicités visibles", value: "Illimitées", available: true },
        { label: "Tableau de bord avancé", value: "✓", available: true },
        { label: "Export PDF/CSV", value: "✓", available: true },
        { label: "Support prioritaire", value: "Dédié 24/7", available: true },
      ],
    },
  ];

  let _state = {
    subscription: null,
    pendingPlanId: null,
  };

  function escHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "–";
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatPrice(ttc) {
    if (ttc === null) return "Sur devis";
    if (ttc === 0) return "Gratuit";
    return ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
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

  async function fetchOrMock(apiFn, mockData, label) {
    try {
      const { data, error } = await apiFn();
      if (error || !data) {
        console.info(`[Subscription] '${label}' → données simulées`);
        return mockData;
      }
      return normalizeNullStrings(data);
    } catch {
      return mockData;
    }
  }

  function normalizeNullStrings(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === "object" && "String" in val && "Valid" in val) {
        result[key] = val.Valid ? val.String : "";
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  function renderCurrentPlan(sub) {
    const isPremium = sub.plan === "PREMIUM";
    const isActive = sub.status === "active";

    const badge = document.getElementById("sub-status-badge");
    if (badge) {
      const statusMap = {
        active: {
          label: "● Actif",
          bg: "var(--uc-vxl)",
          color: "var(--uc-vm)",
        },
        cancelled: {
          label: "✕ Annulé",
          bg: "var(--uc-trl)",
          color: "var(--uc-tr)",
        },
        past_due: { label: "⚠ En retard", bg: "#FFF7E6", color: "#92400E" },
      };
      const s = statusMap[sub.status] || statusMap.active;
      badge.style.background = s.bg;
      badge.style.color = s.color;
      badge.textContent = s.label;
    }

    const card = document.getElementById("current-plan-card");
    if (!card) return;

    const planInfo = PLANS.find((p) => p.id === sub.plan) || PLANS[0];

    card.innerHTML = `
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span style="font-family:var(--uc-fd);font-size:1.3rem;font-weight:700;color:var(--uc-vf)">
              ${escHtml(planInfo.label)}
            </span>
            ${
              isPremium
                ? `
              <span class="badge"
                    style="background:linear-gradient(135deg,#F59E0B,#D97706);
                           font-size:.58rem;font-family:var(--uc-mono)">
                ★ PREMIUM
              </span>`
                : ""
            }
          </div>
          <div style="font-size:.78rem;color:var(--uc-gm)">
            <i class="bi bi-calendar-check me-1"></i>
            Abonnement actif depuis le ${formatDate(sub.start_date)}
            · Renouvellement le <strong>${formatDate(sub.renewal_date)}</strong>
          </div>
          <div style="font-size:.75rem;color:var(--uc-gm);margin-top:.3rem">
            <i class="bi bi-credit-card me-1"></i>${escHtml(sub.payment_method)}
            &nbsp;·&nbsp; SIRET ${escHtml(sub.siret)}
          </div>
        </div>
        <div class="text-end">
          <div style="font-family:var(--uc-fd);font-size:2rem;font-weight:700;color:var(--uc-vf)">
            ${formatPrice(sub.price_ttc)}
          </div>
          <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">
            TTC/MOIS · TVA ${sub.tva_pct}% incl.
          </div>
          <div style="font-size:.68rem;color:var(--uc-gm);margin-top:.25rem">
            HT : ${sub.price_ht.toFixed(2).replace(".", ",")} € · TVA : ${(sub.price_ttc - sub.price_ht).toFixed(2).replace(".", ",")} €
          </div>
        </div>
      </div>

      <div class="mt-3">
        ${renderPeriodBar(sub)}
      </div>`;
  }

  function renderPeriodBar(sub) {
    const start = new Date(sub.start_date).getTime();
    const end = new Date(sub.renewal_date).getTime();
    const now = Date.now();
    const pct = Math.min(
      100,
      Math.max(0, Math.round(((now - start) / (end - start)) * 100)),
    );
    const daysLeft = Math.max(
      0,
      Math.round((end - now) / (1000 * 60 * 60 * 24)),
    );

    return `
      <div class="d-flex justify-content-between" style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm);margin-bottom:.3rem">
        <span>${formatDate(sub.start_date)}</span>
        <span>${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}</span>
        <span>${formatDate(sub.renewal_date)}</span>
      </div>
      <div style="height:6px;background:var(--uc-gxl);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;
                    background:linear-gradient(90deg,var(--uc-vm),var(--uc-vc));
                    border-radius:3px;transition:width .6s ease"></div>
      </div>`;
  }

  function renderPlansGrid(currentPlanId) {
    const grid = document.getElementById("plans-grid");
    if (!grid) return;

    grid.innerHTML = PLANS.map((plan) => {
      const isCurrent = plan.id === currentPlanId;
      const isEnterprise = plan.id === "ENTERPRISE";

      return `
        <div class="col-12 col-md-4">
          <div class="plan-card ${isCurrent ? "plan-current" : ""} ${plan.recommended && !isCurrent ? "plan-premium" : ""}">

            <!-- En-tête plan -->
            <div class="mb-3">
              <div style="font-family:var(--uc-fd);font-size:1rem;font-weight:700;color:${plan.color}">
                ${escHtml(plan.label)}
              </div>
              <div style="font-size:.72rem;color:var(--uc-gm)">${escHtml(plan.subtitle)}</div>
            </div>

            <!-- Prix -->
            <div class="mb-3 pb-3" style="border-bottom:1px solid var(--uc-bs)">
              <div class="plan-price">${escHtml(plan.price_label)}</div>
              ${
                plan.price_ttc && plan.price_ttc > 0
                  ? `
                <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">
                  /mois · TVA 20% incluse
                </div>`
                  : ""
              }
            </div>

            <!-- Features -->
            <div class="mb-3">
              ${plan.features
                .map(
                  (f) => `
                <div class="plan-feature">
                  ${
                    f.available
                      ? '<i class="bi bi-check-circle-fill feat-check"></i>'
                      : '<i class="bi bi-dash-circle feat-cross"></i>'
                  }
                  <span style="${!f.available ? "color:var(--uc-gl)" : ""}">
                    ${escHtml(f.label)}
                  </span>
                  <span class="ms-auto"
                        style="font-family:var(--uc-mono);font-size:.65rem;
                               color:${f.available ? "var(--uc-vc)" : "var(--uc-gl)"}">
                    ${escHtml(f.value)}
                  </span>
                </div>`,
                )
                .join("")}
            </div>

            <!-- CTA -->
            ${
              isCurrent
                ? `<div class="text-center py-2 rounded-3"
                      style="background:rgba(28,61,43,.08);font-size:.75rem;
                             font-weight:700;color:var(--uc-vf)">
                   <i class="bi bi-check2-circle me-1"></i>Plan actuel
                 </div>`
                : isEnterprise
                  ? `<a href="mailto:pro@upcycleconnect.fr?subject=Demande plan Entreprise"
                      class="btn w-100 rounded-3"
                      style="background:#EDE9FE;color:#7C3AED;font-weight:700;font-size:.8rem">
                     <i class="bi bi-envelope me-1"></i>Nous contacter
                   </a>`
                  : `<button class="btn w-100 rounded-3"
                          style="background:var(--uc-vf);color:#fff;font-weight:700;font-size:.8rem"
                          onclick="ProModules.subscription.selectPlan('${plan.id}')">
                     ${
                       plan.price_ttc > (_state.subscription?.price_ttc ?? 0)
                         ? '<i class="bi bi-arrow-up-circle me-1"></i>Passer à ce plan'
                         : '<i class="bi bi-arrow-down-circle me-1"></i>Rétrograder'
                     }
                   </button>`
            }
          </div>
        </div>`;
    }).join("");
  }

  function renderContractDetails(sub) {
    const container = document.getElementById("contract-details");
    if (!container) return;

    const rows = [
      { label: "N° contrat", value: sub.id },
      { label: "Raison sociale", value: sub.raison_sociale },
      { label: "SIRET", value: sub.siret },
      { label: "Client Stripe", value: sub.stripe_customer },
      { label: "Début contrat", value: formatDate(sub.start_date) },
      { label: "Prochain débit", value: formatDate(sub.next_billing) },
      { label: "Moyen de paiement", value: sub.payment_method },
      { label: "Devise", value: sub.currency + " — TVA FR 20%" },
    ];

    container.innerHTML = rows
      .map(
        (r) => `
      <div class="contract-row">
        <span class="contract-label">${escHtml(r.label)}</span>
        <span class="contract-value">${escHtml(r.value)}</span>
      </div>`,
      )
      .join("");
  }

  function renderPlanLimits(sub) {
    const container = document.getElementById("plan-limits");
    if (!container) return;

    const isPremium = sub.plan === "PREMIUM";

    const limits = [
      {
        icon: "📢",
        label: "Annonces publiées / mois",
        value: isPremium ? "∞" : "5",
        cls: isPremium ? "unlimited" : "limited",
      },
      {
        icon: "📋",
        label: "Projets actifs simultanés",
        value: isPremium ? "∞" : "3",
        cls: isPremium ? "unlimited" : "limited",
      },
      {
        icon: "📣",
        label: "Emplacements publicitaires",
        value: isPremium ? "3" : "0",
        cls: isPremium ? "limited" : "locked",
      },
      {
        icon: "📊",
        label: "Dashboard avancé",
        value: isPremium ? "✓" : "✕",
        cls: isPremium ? "unlimited" : "locked",
      },
      {
        icon: "📄",
        label: "Export PDF / CSV",
        value: isPremium ? "✓" : "✕",
        cls: isPremium ? "unlimited" : "locked",
      },
      {
        icon: "🔍",
        label: "Recherche avancée",
        value: isPremium ? "✓" : "Basique",
        cls: isPremium ? "unlimited" : "limited",
      },
      {
        icon: "🎯",
        label: "Filtres marketplace",
        value: isPremium ? "Tous" : "Limité",
        cls: isPremium ? "unlimited" : "limited",
      },
      {
        icon: "💬",
        label: "Support",
        value: isPremium ? "Prioritaire" : "Standard",
        cls: isPremium ? "unlimited" : "limited",
      },
    ];

    container.innerHTML = limits
      .map(
        (l) => `
      <div class="limit-row">
        <div class="limit-icon">${l.icon}</div>
        <div class="limit-label">${escHtml(l.label)}</div>
        <div class="limit-value ${l.cls}">${escHtml(l.value)}</div>
      </div>`,
      )
      .join("");
  }

  function selectPlan(planId) {
    _state.pendingPlanId = planId;
    const plan = PLANS.find((p) => p.id === planId);
    const current = PLANS.find((p) => p.id === _state.subscription?.plan);
    const isUpgrade =
      (plan?.price_ttc ?? 0) > (_state.subscription?.price_ttc ?? 0);

    const body = document.getElementById("modal-plan-body");
    if (body) {
      body.innerHTML = `
        <div class="d-flex align-items-center gap-3 p-3 rounded-3 mb-3"
             style="background:var(--uc-gxl)">
          <div class="text-center flex-grow-1">
            <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">ACTUEL</div>
            <div style="font-weight:700;color:var(--uc-gc)">${escHtml(current?.label || "–")}</div>
            <div style="font-family:var(--uc-fd);font-size:1.1rem;color:var(--uc-gm)">
              ${formatPrice(_state.subscription?.price_ttc ?? 0)}
            </div>
          </div>
          <div style="font-size:1.4rem;color:var(--uc-vc)">→</div>
          <div class="text-center flex-grow-1">
            <div style="font-size:.65rem;font-family:var(--uc-mono);color:var(--uc-gm)">NOUVEAU</div>
            <div style="font-weight:700;color:var(--uc-vf)">${escHtml(plan?.label || "–")}</div>
            <div style="font-family:var(--uc-fd);font-size:1.1rem;color:var(--uc-vf)">
              ${formatPrice(plan?.price_ttc ?? 0)}
            </div>
          </div>
        </div>
        <div class="alert ${isUpgrade ? "alert-success" : "alert-warning"} rounded-3 mb-0">
          <small>
            ${
              isUpgrade
                ? `<strong>Upgrade :</strong> La différence de ${formatPrice(
                    (plan?.price_ttc ?? 0) -
                      (_state.subscription?.price_ttc ?? 0),
                  )} sera débitée au prorata aujourd'hui. Votre nouveau plan est actif immédiatement.`
                : `<strong>Rétrogradation :</strong> Vous conservez votre plan actuel jusqu'au ${formatDate(
                    _state.subscription?.renewal_date,
                  )}. Le nouveau tarif s'appliquera au prochain renouvellement.`
            }
          </small>
        </div>`;
    }

    new bootstrap.Modal(document.getElementById("modal-change-plan")).show();
  }

  async function confirmUpgrade() {
    const planId = _state.pendingPlanId;
    if (!planId) return;

    const label = document.getElementById("confirm-plan-label");
    const spinner = document.getElementById("confirm-plan-spinner");
    const btn = document.getElementById("btn-confirm-plan");

    btn.disabled = true;
    label.textContent = "Traitement…";
    spinner.style.display = "";

    try {
      const { error } = await API.subscription.upgrade(planId);
      if (error) throw new Error(error);

      const plan = PLANS.find((p) => p.id === planId);
      _state.subscription = {
        ..._state.subscription,
        plan: planId,
        price_ttc: plan?.price_ttc ?? 0,
      };
      Store.get("user") && (Store.get("user").subscription = planId);

      bootstrap.Modal.getInstance(
        document.getElementById("modal-change-plan"),
      ).hide();
      showToast(`Plan mis à jour : ${plan?.label} ✓`);

      renderCurrentPlan(_state.subscription);
      renderPlansGrid(planId);
      renderPlanLimits(_state.subscription);
    } catch (e) {
      showToast(e.message || "Erreur lors du changement de plan", "error");
    } finally {
      btn.disabled = false;
      label.textContent = "Confirmer";
      spinner.style.display = "none";
    }
  }

  function confirmCancel() {
    const modal = new bootstrap.Modal(
      document.getElementById("modal-cancel-sub"),
    );
    modal.show();

    const input = document.getElementById("cancel-confirm-input");
    const btnCnf = document.getElementById("btn-confirm-cancel");
    if (input) {
      input.value = "";
      btnCnf.disabled = true;
      input.oninput = () => {
        btnCnf.disabled = input.value.trim().toUpperCase() !== "ANNULER";
      };
    }
  }

  async function executeCancellation() {
    const label = document.getElementById("cancel-label");
    const spinner = document.getElementById("cancel-spinner");
    const btn = document.getElementById("btn-confirm-cancel");

    btn.disabled = true;
    label.textContent = "Traitement…";
    spinner.style.display = "";

    try {
      const { error } = await API.subscription.cancel();
      if (error) throw new Error(error);

      _state.subscription = { ..._state.subscription, status: "cancelled" };

      bootstrap.Modal.getInstance(
        document.getElementById("modal-cancel-sub"),
      ).hide();
      showToast(
        "Abonnement annulé. Accès maintenu jusqu'à la fin de la période.",
        "warning",
      );

      renderCurrentPlan(_state.subscription);
    } catch (e) {
      console.info("[Subscription] Cancel API non disponible — simulation");
      bootstrap.Modal.getInstance(
        document.getElementById("modal-cancel-sub"),
      ).hide();
      showToast("Annulation enregistrée (mode simulé)", "warning");
    } finally {
      btn.disabled = false;
      label.textContent = "Confirmer l'annulation";
      spinner.style.display = "none";
    }
  }

  async function loadData() {
    const sub = await fetchOrMock(
      () => API.subscription.getCurrent(),
      MOCK_SUBSCRIPTION,
      "getCurrent",
    );
    _state.subscription = sub;

    renderCurrentPlan(sub);
    renderPlansGrid(sub.plan);
    renderContractDetails(sub);
    renderPlanLimits(sub);
  }

  async function init(ctx) {
    await loadData();
  }

  window.ProModules = window.ProModules || {};
  window.ProModules.subscription = {
    init,
    selectPlan,
    confirmUpgrade,
    confirmCancel,
    executeCancellation,
  };
})();
