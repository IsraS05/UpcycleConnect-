(function () {
  "use strict";

  const CO2_COEFFICIENTS = {
    bois: 0.42,
    metal: 1.8,
    plastique: 2.1,
    textile: 5.5,
    verre: 0.31,
    papier: 0.9,
    ceramique: 0.55,
    cuir: 3.2,
    caoutchouc: 1.4,
    autre: 0.6,
  };

  function calculateImpact(weightKg, material) {
    const coeff =
      CO2_COEFFICIENTS[material?.toLowerCase()] ?? CO2_COEFFICIENTS.autre;
    const co2Kg = Math.round(weightKg * coeff * 100) / 100;
    const waterL = Math.round(co2Kg * 4.3);
    const scorePoints = Math.round(co2Kg * 1.5 + weightKg * 0.8);
    return {
      co2_kg: co2Kg,
      water_l: waterL,
      score_points: scorePoints,
      coeff_used: coeff,
    };
  }

  const MOCK_PROJECTS = [];

  const MATERIALS_LIST = [
    { id: "bois", label: "Bois", emoji: "🪵" },
    { id: "metal", label: "Métal", emoji: "⚙️" },
    { id: "plastique", label: "Plastique", emoji: "♳" },
    { id: "textile", label: "Textile", emoji: "🧵" },
    { id: "verre", label: "Verre", emoji: "🫙" },
    { id: "papier", label: "Papier", emoji: "📦" },
    { id: "ceramique", label: "Céramique", emoji: "🏺" },
    { id: "autre", label: "Autre", emoji: "♻️" },
  ];

  const STEPS_ORDER = ["COLLECTE", "TRANSFORMATION", "VENTE", "TERMINE"];

  function escHtml(s) {
    if (typeof s !== "string") return String(s ?? "");
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg, type = "success") {
    const colors = {
      success: "var(--uc-vf)",
      error: "var(--uc-tr)",
      warning: "#F59E0B",
    };
    const wrap =
      document.getElementById("toast-container") ||
      (() => {
        const el = document.createElement("div");
        el.id = "toast-container";
        el.className = "toast-container position-fixed bottom-0 end-0 p-3";
        el.style.zIndex = 9999;
        document.body.appendChild(el);
        return el;
      })();
    const t = document.createElement("div");
    t.className = "toast align-items-center border-0 text-white show";
    t.style.background = colors[type] || colors.success;
    t.innerHTML = `<div class="d-flex"><div class="toast-body" style="font-size:.82rem">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    wrap.appendChild(t);
    new bootstrap.Toast(t, { delay: 3500 }).show();
    t.addEventListener("hidden.bs.toast", () => t.remove());
  }

  async function fetchOrMock(fn, mock) {
    try {
      const { data, error } = await fn();
      return error || !data ? mock : data;
    } catch {
      return mock;
    }
  }

  function buildTimeline(step) {
    const steps = [
      { key: "COLLECTE", label: "Collecte" },
      { key: "TRANSFORMATION", label: "Transfo." },
      { key: "VENTE", label: "Vente" },
    ];
    const pi = STEPS_ORDER.indexOf(step);
    return `<div class="timeline-wrap">
      ${steps
        .map((s, i) => {
          const ti = STEPS_ORDER.indexOf(s.key);
          const cls = ti < pi ? "done" : ti === pi ? "current" : "todo";
          return `<div class="tl-step ${cls}">
          <div class="tl-circle ${cls}">${cls === "done" ? "✓" : String(i + 1)}</div>
          <div class="tl-label ${cls === "current" ? "current" : ""}">${s.label}</div>
        </div>`;
        })
        .join("")}
    </div>`;
  }

  const PAGE_SIZE = 6;

  let _list = {
    projects: [],
    filtered: [],
    activeFilter: "all",
    sortBy: "recent",
    currentPage: 1,
    pendingDelete: null,
  };

  function applyListFilters() {
    _list.filtered =
      _list.activeFilter === "all"
        ? [..._list.projects]
        : _list.projects.filter((p) => p.step === _list.activeFilter);

    _list.filtered.sort((a, b) => {
      if (_list.sortBy === "impact") {
        return (
          calculateImpact(b.weight_kg, b.material).co2_kg -
          calculateImpact(a.weight_kg, a.material).co2_kg
        );
      }
      if (_list.sortBy === "progress") return b.progress - a.progress;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  function renderProjectKPIs(projects) {
    const el = document.getElementById("projects-kpis");
    if (!el) return;
    const totalCo2 = projects.reduce(
      (s, p) => s + calculateImpact(p.weight_kg, p.material).co2_kg,
      0,
    );
    const active = projects.filter((p) => p.step !== "TERMINE").length;
    const late = projects.filter((p) => p.is_late).length;
    const done = projects.filter((p) => p.step === "TERMINE").length;
    const totalKg = projects.reduce((s, p) => s + p.weight_kg, 0);

    el.innerHTML = `
      <div class="col-6 col-md-3">
        <div class="kpi-card kpi-green p-3">
          <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:var(--uc-vf)">${active}</div>
          <div class="kpi-label">Projets actifs</div>
          <div class="kpi-delta">${done} terminé${done > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card kpi-terra p-3">
          <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:var(--uc-tr)">${totalCo2.toFixed(1)}</div>
          <div class="kpi-label">kg CO₂ évité</div>
          <div class="kpi-delta">Sur ${projects.length} projets</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card p-3" style="border-color:var(--uc-bs)">
          <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:#F59E0B">${late}</div>
          <div class="kpi-label" style="color:var(--uc-gm)">En retard</div>
          <div style="font-size:.7rem;color:var(--uc-gm);margin-top:.3rem">${late > 0 ? "Action requise" : "Tout est à jour ✓"}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card p-3" style="border-color:var(--uc-bs)">
          <div style="font-family:var(--uc-fd);font-size:1.8rem;font-weight:700;color:var(--uc-gc)">${Math.round(totalKg)}</div>
          <div class="kpi-label" style="color:var(--uc-gm)">kg traités total</div>
          <div style="font-size:.7rem;color:var(--uc-gm);margin-top:.3rem">Toutes matières</div>
        </div>
      </div>`;
  }

  function renderProjects() {
    const container = document.getElementById("projects-container");
    if (!container) return;

    const start = (_list.currentPage - 1) * PAGE_SIZE;
    const paged = _list.filtered.slice(start, start + PAGE_SIZE);

    if (paged.length === 0) {
      container.innerHTML = `<div class="text-center py-5"><div style="font-size:3rem">🌱</div>
        <div class="text-muted mt-2 small">Aucun projet dans cette catégorie.</div>
        <a href="#/projects/new" class="btn btn-sm mt-3" style="background:var(--uc-vf);color:#fff">+ Nouveau projet</a></div>`;
      renderProjectsPagination();
      return;
    }

    const pillMap = {
      COLLECTE: ["sp-collecte", "Collecte"],
      TRANSFORMATION: ["sp-transfo", "Transformation"],
      VENTE: ["sp-vente", "En vente"],
      TERMINE: ["sp-termine", "Terminé"],
    };

    container.innerHTML = paged
      .map((p) => {
        const impact = calculateImpact(p.weight_kg, p.material);
        const [spCls, spLabel] = pillMap[p.step] || ["sp-termine", "–"];
        const matBg =
          {
            bois: "#FEF3E2",
            metal: "#F1F5F9",
            textile: "var(--uc-trl)",
            ceramique: "#FDF2F8",
          }[p.material] || "var(--uc-vxl)";

        return `
        <div class="proj-card">
          <div class="d-flex align-items-start gap-3">
            <div class="proj-icon" style="background:${matBg}">${p.icon || "♻️"}</div>
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <span style="font-family:var(--uc-fd);font-size:1rem;font-weight:700;color:var(--uc-vf)">${escHtml(p.name)}</span>
                <span class="status-pill ${spCls}">${spLabel}</span>
                ${p.is_late ? `<span class="status-pill" style="background:var(--uc-trl);color:var(--uc-tr)">⚠ J+${p.late_days}</span>` : ""}
              </div>
              <div style="font-size:.72rem;color:var(--uc-gm);margin-bottom:.6rem">
                ${escHtml(p.material.charAt(0).toUpperCase() + p.material.slice(1))} · ${p.weight_kg} kg · ${new Date(p.created_at).toLocaleDateString("fr-FR")}
              </div>
              ${buildTimeline(p.step)}
              <div class="d-flex align-items-center gap-2 mt-1">
                <div class="proj-progress-bar flex-grow-1">
                  <div class="proj-progress-fill" style="width:${p.progress}%"></div>
                </div>
                <span style="font-size:.68rem;font-family:var(--uc-mono);font-weight:700;color:var(--uc-vm)">${p.progress}%</span>
              </div>
            </div>
            <div class="d-flex flex-column gap-1 flex-shrink-0">
              <a href="#/projects/edit?id=${p.id}" class="btn btn-sm btn-outline-secondary rounded-2"
                 style="font-size:.68rem;padding:.25rem .55rem" title="Modifier"><i class="bi bi-pencil"></i></a>
              <button class="btn btn-sm btn-outline-secondary rounded-2"
                      style="font-size:.68rem;padding:.25rem .55rem"
                      onclick="ProModules.projects.advanceStep('${p.id}')"
                      title="Avancer l'étape" ${p.step === "TERMINE" ? "disabled" : ""}>
                <i class="bi bi-arrow-right-circle"></i>
              </button>
              <button class="btn btn-sm rounded-2"
                      style="font-size:.68rem;padding:.25rem .55rem;background:var(--uc-trl);color:var(--uc-tr);border:none"
                      onclick="ProModules.projects.confirmDelete('${p.id}')" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div class="d-flex gap-2 mt-2 flex-wrap">
            <span class="impact-chip">🌿 ${impact.co2_kg} kg CO₂</span>
            <span class="impact-chip blue">⭐ +${impact.score_points} pts</span>
            ${p.estimated_price ? `<span class="impact-chip terra">💰 ~${p.estimated_price}€</span>` : ""}
          </div>
        </div>`;
      })
      .join("");

    renderProjectsPagination();
  }

  function renderProjectsPagination() {
    const el = document.getElementById("projects-pagination");
    if (!el) return;
    const total = Math.ceil(_list.filtered.length / PAGE_SIZE);
    if (total <= 1) {
      el.innerHTML = "";
      return;
    }
    let html = `<div class="proj-page-btn ${_list.currentPage === 1 ? "opacity-50" : ""}" onclick="ProModules.projects.goToPage(${_list.currentPage - 1})">‹</div>`;
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - _list.currentPage) <= 1) {
        html += `<div class="proj-page-btn ${p === _list.currentPage ? "active" : ""}" onclick="ProModules.projects.goToPage(${p})">${p}</div>`;
      } else if (Math.abs(p - _list.currentPage) === 2) {
        html += `<div class="proj-page-btn" style="cursor:default;border:none">…</div>`;
      }
    }
    html += `<div class="proj-page-btn ${_list.currentPage === total ? "opacity-50" : ""}" onclick="ProModules.projects.goToPage(${_list.currentPage + 1})">›</div>`;
    el.innerHTML = html;
  }

  function filterByStatus(status, btn) {
    _list.activeFilter = status;
    document
      .querySelectorAll(".proj-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    applyListFilters();
    _list.currentPage = 1;
    renderProjects();
  }

  function setSort(key) {
    _list.sortBy = key;
    applyListFilters();
    _list.currentPage = 1;
    renderProjects();
  }

  function toggleView() {
    const btn = document.getElementById("btn-toggle-view");
    if (btn)
      btn.innerHTML = btn.innerHTML.includes("Grille")
        ? '<i class="bi bi-list-ul me-1"></i>Liste'
        : '<i class="bi bi-grid me-1"></i>Grille';
  }

  function goToPage(p) {
    const max = Math.ceil(_list.filtered.length / PAGE_SIZE);
    if (p < 1 || p > max) return;
    _list.currentPage = p;
    renderProjects();
  }

  async function advanceStep(projectId) {
    const id = parseInt(projectId) || projectId;
    const proj = _list.projects.find((p) => p.id === id);
    if (!proj || proj.step === "TERMINE") return;
    const next = STEPS_ORDER[STEPS_ORDER.indexOf(proj.step) + 1];
    if (!next) return;

    proj.step = next;
    proj.progress =
      { COLLECTE: 10, TRANSFORMATION: 45, VENTE: 80, TERMINE: 100 }[next] ??
      proj.progress;

    applyListFilters();
    renderProjects();

    try {
      await API.projects.updateStep(id, next);
    } catch {
    }
    showToast(`Étape avancée → ${next}`);
  }

  function confirmDelete(projectId) {
    _list.pendingDelete = projectId;
    const proj = _list.projects.find((p) => p.id === projectId);
    const el = document.getElementById("delete-project-name");
    if (el) el.textContent = proj?.name || projectId;
    new bootstrap.Modal(document.getElementById("modal-delete-project")).show();
  }

  async function executeDelete() {
    const id = _list.pendingDelete;
    if (!id) return;
    bootstrap.Modal.getInstance(
      document.getElementById("modal-delete-project"),
    )?.hide();
    try {
      await API.projects.delete(id);
    } catch {}
    _list.projects = _list.projects.filter((p) => p.id !== id);
    applyListFilters();
    renderProjects();
    renderProjectKPIs(_list.projects);
    showToast("Projet supprimé");
    _list.pendingDelete = null;
  }

  async function initList(ctx) {
    const projects = await fetchOrMock(
      () => API.projects.getAll(),
      MOCK_PROJECTS,
    );
    projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    _list.projects = projects;
    _list.filtered = [...projects];
    renderProjectKPIs(projects);
    renderProjects();
  }

  const EDITOR_STEPS = [
    { label: "Informations", icon: "📋" },
    { label: "Matériaux", icon: "🪵" },
    { label: "Étape projet", icon: "📋" },
    { label: "Récap", icon: "✅" },
  ];

  let _ed = {
    currentStep: 0,
    isEdit: false,
    projectId: null,
    data: {
      name: "",
      description: "",
      material: "",
      weight_kg: 0,
      condition: "bon",
      estimated_price: 0,
      step: "COLLECTE",
      container_id: "",
      notes: "",
    },
  };

  function renderEditorStepper() {
    const el = document.getElementById("stepper");
    if (!el) return;
    el.innerHTML = EDITOR_STEPS.map((s, i) => {
      const cls =
        i < _ed.currentStep
          ? "completed"
          : i === _ed.currentStep
            ? "active"
            : "pending";
      return `<div class="step-item-wrap ${cls}">
        <div class="step-num ${cls}">${i < _ed.currentStep ? "✓" : i + 1}</div>
        <div class="step-title ${cls === "active" ? "active" : ""}">${s.label}</div>
      </div>`;
    }).join("");
  }

  function updateEditorNav() {
    const prev = document.getElementById("btn-prev");
    const label = document.getElementById("btn-next-label");
    const icon = document.getElementById("btn-next-icon");
    const isLast = _ed.currentStep === EDITOR_STEPS.length - 1;
    if (prev) prev.style.display = _ed.currentStep > 0 ? "" : "none";
    if (label)
      label.textContent = isLast
        ? _ed.isEdit
          ? "Enregistrer"
          : "Créer le projet"
        : "Étape suivante";
    if (icon)
      icon.className = isLast
        ? "bi bi-check2-circle ms-1"
        : "bi bi-arrow-right ms-1";
  }

  function renderImpactPreview(impact) {
    const mat = MATERIALS_LIST.find((m) => m.id === _ed.data.material);
    return `
      <div style="font-family:var(--uc-mono);font-size:.6rem;letter-spacing:.1em;color:var(--uc-gm);text-transform:uppercase;margin-bottom:.75rem">
        Impact estimé (ADEME Base Carbone v22)
      </div>
      <div class="row g-2 text-center">
        <div class="col-4">
          <div style="font-family:var(--uc-fd);font-size:2.2rem;font-weight:700;color:var(--uc-vf);line-height:1">${impact.co2_kg}</div>
          <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">kg CO₂ évité</div>
        </div>
        <div class="col-4">
          <div style="font-family:var(--uc-fd);font-size:2.2rem;font-weight:700;color:#3B82F6;line-height:1">${impact.water_l}</div>
          <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">litres d'eau</div>
        </div>
        <div class="col-4">
          <div style="font-family:var(--uc-fd);font-size:2.2rem;font-weight:700;color:#F59E0B;line-height:1">+${impact.score_points}</div>
          <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">pts Upcycling</div>
        </div>
      </div>
      <div style="font-size:.6rem;color:var(--uc-gm);margin-top:.6rem;text-align:center">
        Coeff. ${impact.coeff_used} kg CO₂/kg · ${mat?.label || _ed.data.material}
      </div>`;
  }

  function renderEditorStep() {
    const el = document.getElementById("step-content");
    if (!el) return;

    if (_ed.currentStep === 0) {
      el.innerHTML = `<div class="step-panel"><div class="pro-card">
        <div class="form-section-label">Informations générales</div>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" style="font-size:.78rem;font-weight:600">Nom du projet *</label>
            <input type="text" class="form-control" id="ed-name" value="${escHtml(_ed.data.name)}"
                   placeholder="Ex: Chaise vintage palette chêne"
                   oninput="ProModules.projectEditor.updateData('name',this.value)">
          </div>
          <div class="col-12">
            <label class="form-label" style="font-size:.78rem;font-weight:600">Description</label>
            <textarea class="form-control" rows="3" id="ed-description"
                      placeholder="Objet, origine, vision de transformation…"
                      oninput="ProModules.projectEditor.updateData('description',this.value)">${escHtml(_ed.data.description)}</textarea>
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label" style="font-size:.78rem;font-weight:600">État de l'objet</label>
            <select class="form-select" id="ed-condition" onchange="ProModules.projectEditor.updateData('condition',this.value)">
              <option value="bon"     ${_ed.data.condition === "bon" ? "selected" : ""}>★ Bon état</option>
              <option value="moyen"   ${_ed.data.condition === "moyen" ? "selected" : ""}>~ État moyen</option>
              <option value="mauvais" ${_ed.data.condition === "mauvais" ? "selected" : ""}>✕ À restaurer</option>
            </select>
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label" style="font-size:.78rem;font-weight:600">Prix de vente estimé</label>
            <div class="input-group">
              <input type="number" class="form-control" id="ed-price" min="0" step="0.5"
                     value="${_ed.data.estimated_price}"
                     oninput="ProModules.projectEditor.updateData('estimated_price',parseFloat(this.value)||0)">
              <span class="input-group-text">€</span>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label" style="font-size:.78rem;font-weight:600">Notes de travail</label>
            <textarea class="form-control" rows="2" id="ed-notes"
                      placeholder="Outils, étapes planifiées, fournisseurs…"
                      oninput="ProModules.projectEditor.updateData('notes',this.value)">${escHtml(_ed.data.notes)}</textarea>
          </div>
        </div>
      </div></div>`;
    } else if (_ed.currentStep === 1) {
      const impact =
        _ed.data.material && _ed.data.weight_kg > 0
          ? calculateImpact(_ed.data.weight_kg, _ed.data.material)
          : null;

      el.innerHTML = `<div class="step-panel">
        <div class="pro-card mb-3">
          <div class="form-section-label">Matériau principal *</div>
          <div class="mat-selector">
            ${MATERIALS_LIST.map(
              (m) => `
              <div class="mat-option ${_ed.data.material === m.id ? "selected" : ""}"
                   onclick="ProModules.projectEditor.selectMaterial('${m.id}')">
                <span class="mat-emoji">${m.emoji}</span>
                <span class="mat-label">${m.label}</span>
              </div>`,
            ).join("")}
          </div>
        </div>
        <div class="pro-card mb-3">
          <div class="form-section-label">Poids estimé *</div>
          <div class="row g-3 align-items-center">
            <div class="col-8">
              <input type="range" class="form-range" min="0.1" max="200" step="0.1"
                     id="weight-slider" value="${_ed.data.weight_kg}"
                     oninput="ProModules.projectEditor.updateWeight(this.value)">
            </div>
            <div class="col-4">
              <div class="input-group input-group-sm">
                <input type="number" class="form-control" id="weight-input"
                       min="0.1" max="200" step="0.1" value="${_ed.data.weight_kg}"
                       oninput="ProModules.projectEditor.updateWeight(this.value)">
                <span class="input-group-text">kg</span>
              </div>
            </div>
          </div>
        </div>
        <div class="impact-preview-card" id="impact-preview">
          ${impact ? renderImpactPreview(impact) : `<div class="text-center text-muted small py-2">Sélectionnez matériau + poids pour voir l'impact</div>`}
        </div>
      </div>`;
    } else if (_ed.currentStep === 2) {
      const projectStepRows = [
        {
          key: "COLLECTE",
          icon: "📦",
          label: "Collecte",
          desc: "L'objet a été ou doit être récupéré.",
        },
        {
          key: "TRANSFORMATION",
          icon: "🔨",
          label: "Transformation",
          desc: "Travail de remise en valeur en cours.",
        },
        {
          key: "VENTE",
          icon: "🏷️",
          label: "En vente",
          desc: "Prêt à être vendu ou donné.",
        },
        {
          key: "TERMINE",
          icon: "✅",
          label: "Terminé",
          desc: "Projet clôturé avec succès.",
        },
      ];
      el.innerHTML = `<div class="step-panel">
        <div class="pro-card mb-3">
          <div class="form-section-label">Étape actuelle du projet</div>
          ${projectStepRows
            .map(
              (s) => `
            <div style="display:flex;align-items:center;gap:1rem;padding:.85rem 0;
                        border-bottom:1px solid var(--uc-gxl);cursor:pointer"
                 onclick="ProModules.projectEditor.selectProjectStep('${s.key}')">
              <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;font-size:.9rem;
                          display:flex;align-items:center;justify-content:center;
                          background:${_ed.data.step === s.key ? "var(--uc-vf)" : "var(--uc-gxl)"}">
                ${s.icon}
              </div>
              <div class="flex-grow-1">
                <div style="font-size:.85rem;font-weight:700;color:var(--uc-gc)">${s.label}</div>
                <div style="font-size:.72rem;color:var(--uc-gm)">${s.desc}</div>
              </div>
              <div style="width:20px;height:20px;border-radius:50%;border:2px solid;flex-shrink:0;
                          display:flex;align-items:center;justify-content:center;
                          border-color:${_ed.data.step === s.key ? "var(--uc-vf)" : "var(--uc-gl)"};
                          background:${_ed.data.step === s.key ? "var(--uc-vf)" : "transparent"}">
                ${_ed.data.step === s.key ? '<span style="color:#fff;font-size:.6rem">✓</span>' : ""}
              </div>
            </div>`,
            )
            .join("")}
        </div>
        <div class="pro-card">
          <div class="form-section-label">Conteneur associé (optionnel)</div>
          <input type="text" class="form-control form-control-sm" id="ed-container"
                 placeholder="Ex: C-047 — Bastille" value="${escHtml(_ed.data.container_id)}"
                 oninput="ProModules.projectEditor.updateData('container_id',this.value)">
          <div class="form-text">ID du conteneur si objet récupéré via UpcycleConnect</div>
        </div>
      </div>`;
    } else if (_ed.currentStep === 3) {
      const impact = calculateImpact(
        _ed.data.weight_kg || 0,
        _ed.data.material || "autre",
      );
      const mat = MATERIALS_LIST.find((m) => m.id === _ed.data.material);
      const rows = [
        { label: "Nom", value: _ed.data.name || "–" },
        { label: "Matériau", value: mat ? `${mat.emoji} ${mat.label}` : "–" },
        { label: "Poids", value: `${_ed.data.weight_kg} kg` },
        { label: "État", value: _ed.data.condition },
        { label: "Étape", value: _ed.data.step },
        {
          label: "Prix estimé",
          value: _ed.data.estimated_price
            ? `${_ed.data.estimated_price} €`
            : "–",
        },
        { label: "Conteneur", value: _ed.data.container_id || "Aucun" },
      ];
      el.innerHTML = `<div class="step-panel">
        <div class="pro-card mb-3">
          <div class="form-section-label">Récapitulatif</div>
          ${rows
            .map(
              (r) => `
            <div style="display:flex;justify-content:space-between;padding:.5rem 0;
                        border-bottom:1px solid var(--uc-gxl);font-size:.82rem">
              <span style="color:var(--uc-gm)">${r.label}</span>
              <span style="font-weight:600;color:var(--uc-gc)">${escHtml(String(r.value))}</span>
            </div>`,
            )
            .join("")}
        </div>
        <div class="impact-preview-card">${renderImpactPreview(impact)}</div>
      </div>`;
    }
  }

  function updateData(key, value) {
    if (key === "estimated_price") {
      value = Math.max(0, parseFloat(value) || 0);
      const input = document.getElementById("ed-price");
      if (input && parseFloat(input.value) < 0) input.value = 0;
    }
    _ed.data[key] = value;
  }

  function selectMaterial(matId) {
    _ed.data.material = matId;
    renderEditorStep();
  }

  function updateWeight(val) {
    const w = parseFloat(val) || 0;
    _ed.data.weight_kg = w;
    const slider = document.getElementById("weight-slider");
    const input = document.getElementById("weight-input");
    if (slider) slider.value = w;
    if (input) input.value = w;
    const preview = document.getElementById("impact-preview");
    if (preview && _ed.data.material) {
      preview.innerHTML = renderImpactPreview(
        calculateImpact(w, _ed.data.material),
      );
    }
  }

  function selectProjectStep(step) {
    _ed.data.step = step;
    renderEditorStep();
  }

  function prevStep() {
    if (_ed.currentStep <= 0) return;
    _ed.currentStep--;
    renderEditorStepper();
    renderEditorStep();
    updateEditorNav();
  }

  async function nextStep() {
    if (_ed.currentStep === 0 && !_ed.data.name.trim()) {
      showToast("Le nom du projet est requis.", "error");
      return;
    }
    if (_ed.currentStep === 0) {
      if (!_ed.data.name.trim()) {
        showToast("Le nom du projet est requis.", "error");
        return;
      }
      if (_ed.data.name.trim().length < 3) {
        showToast("Le nom doit faire au moins 3 caractères.", "error");
        return;
      }
      if (_ed.data.estimated_price < 0) {
        const priceInput = document.getElementById("ed-price");
        if (priceInput) priceInput.classList.add("is-invalid");
        showToast("Le prix de vente ne peut pas être négatif.", "error");
        return;
      }
      if (_ed.data.estimated_price > 100000) {
        showToast("Le prix de vente semble excessif (max 100 000€).", "error");
        return;
      }
      const priceInput = document.getElementById("ed-price");
      if (priceInput) priceInput.classList.remove("is-invalid");
    }

    if (_ed.currentStep === 1) {
      if (!_ed.data.material) {
        showToast("Sélectionnez un matériau.", "error");
        return;
      }
      if (!_ed.data.weight_kg || _ed.data.weight_kg <= 0) {
        showToast("Renseignez un poids valide.", "error");
        return;
      }
      if (_ed.data.weight_kg > 200) {
        showToast("Poids maximal dépassé (200 kg).", "error");
        return;
      }
    }

    const isLast = _ed.currentStep === EDITOR_STEPS.length - 1;
    if (isLast) {
      const btn = document.getElementById("btn-next");
      const spinner = document.getElementById("btn-next-spinner");
      const label = document.getElementById("btn-next-label");
      if (btn) btn.disabled = true;
      if (spinner) spinner.style.display = "";
      if (label) label.textContent = "Enregistrement…";
      try {
        if (_ed.isEdit) {
          await API.projects.update(_ed.projectId, _ed.data);
        } else {
          await API.projects.create(_ed.data);
        }
        showToast(`Projet ${_ed.isEdit ? "mis à jour" : "créé"} ✓`);
      } catch {
        showToast(`Projet ${_ed.isEdit ? "mis à jour" : "créé"} (simulé) ✓`);
      } finally {
        if (btn) btn.disabled = false;
        if (spinner) spinner.style.display = "none";
      }
      setTimeout(() => window.Router?.go("projects"), 700);
      return;
    }

    _ed.currentStep++;
    renderEditorStepper();
    renderEditorStep();
    updateEditorNav();
  }

  async function initEditor(ctx) {
    const isEdit = ctx.path === "projects/edit" && ctx.params?.id;
    _ed.isEdit = !!isEdit;
    _ed.currentStep = 0;
    _ed.data = {
      name: "",
      description: "",
      material: "",
      weight_kg: 0,
      condition: "bon",
      estimated_price: 0,
      step: "COLLECTE",
      container_id: "",
      notes: "",
    };

    const titleEl = document.getElementById("editor-title");
    const subtitleEl = document.getElementById("editor-subtitle");

    if (isEdit) {
      _ed.projectId = ctx.params.id;
      if (titleEl) titleEl.textContent = "Modifier le projet";
      if (subtitleEl) subtitleEl.textContent = `ID : ${ctx.params.id}`;
      const proj = await fetchOrMock(
        () => API.projects.getById(ctx.params.id),
        MOCK_PROJECTS[0],
      );
      if (proj) Object.assign(_ed.data, proj);
    } else {
      if (titleEl) titleEl.textContent = "Nouveau Projet";
      if (subtitleEl) subtitleEl.textContent = "Remplissez les 4 étapes";
    }

    renderEditorStepper();
    renderEditorStep();
    updateEditorNav();
  }

  window.ProModules = window.ProModules || {};

  window.ProModules.projects = {
    init: initList,
    filterByStatus,
    setSort,
    toggleView,
    goToPage,
    advanceStep,
    confirmDelete,
    executeDelete,
  };

  window.ProModules.projectEditor = {
    init: initEditor,
    prevStep,
    nextStep,
    updateData,
    selectMaterial,
    updateWeight,
    selectProjectStep,
  };
})();
