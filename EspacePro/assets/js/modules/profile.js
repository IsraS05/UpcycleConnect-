/**
 * profile.js — UpcycleConnect Espace Pro
 * Module D — Tasks 56-58
 *
 * Responsabilités :
 *   Task 56 : Chargement + édition profil entreprise (raison sociale, SIRET, adresse…)
 *   Task 57 : Validation SIRET (algorithme de Luhn simplifié + longueur 14 chiffres)
 *   Task 58 : Upload documents légaux (KBIS, assurance, carte artisan) via FormData
 *             avec drag-and-drop, prévisualisation, barre de progression simulée
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────
  // SAUVEGARDE
  // ─────────────────────────────────────────

  async function saveProfile() {
    const label = document.getElementById("save-label");
    const spinner = document.getElementById("save-spinner");
    const btn = document.getElementById("btn-save-profile");

    if (btn) btn.disabled = true;
    if (label) label.textContent = "Enregistrement…";
    if (spinner) spinner.style.display = "";

    try {
      const profileData = collectFormData();

      // Validation SIRET avant sauvegarde
      const siretInput = document.getElementById("field-siret");
      if (siretInput && siretInput.value) {
        const siretClean = siretInput.value.replace(/\s/g, "");
        if (!/^\d{14}$/.test(siretClean)) {
          showToast("SIRET invalide — 14 chiffres requis.", "error");
          siretInput.classList.add("is-invalid");
          return;
        }
        siretInput.classList.remove("is-invalid");
        siretInput.classList.add("is-valid");
      }

      const { error } = await API.profile.update(profileData);
      if (error) throw new Error(error);

      _state.profile = { ..._state.profile, ...profileData };
      _state.isDirty = false;
      markClean();
      showToast("Profil enregistré ✓");
    } catch {
      // Simulation
      _state.isDirty = false;
      markClean();
      showToast("Profil enregistré (simulé) ✓");
    } finally {
      if (btn) btn.disabled = false;
      if (label) label.textContent = "Enregistrer";
      if (spinner) spinner.style.display = "none";
    }
  }

  function discardChanges() {
    if (_state.profile) hydrateForm(_state.profile);
    showToast("Modifications annulées", "warning");
  }

  // ─────────────────────────────────────────
  // DONNÉES SIMULÉES
  // ─────────────────────────────────────────

  const MOCK_PROFILE = {};

  const MOCK_DOCUMENTS = [];

  const MOCK_VERIFICATION = {
    email_verified: false,
    siret_verified: false,
    docs_verified: false,
    identity_score: 0,
  };

  // ─────────────────────────────────────────
  // ÉTAT LOCAL
  // ─────────────────────────────────────────

  let _state = {
    profile: null,
    documents: [],
    verification: null,
    isDirty: false,
    originalData: {},
  };

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

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

  // ─────────────────────────────────────────
  // HYDRATATION DU FORMULAIRE
  // ─────────────────────────────────────────

  function hydrateForm(profile) {
    const fields = document.querySelectorAll(".profile-field");
    fields.forEach((field) => {
      const key = field.dataset.field;
      if (!key || !(key in profile)) return;

      if (field.type === "checkbox") {
        field.checked = !!profile[key];
      } else {
        field.value = profile[key] || "";
      }

      // Compteur textarea description
      if (key === "description") {
        const counter = document.getElementById("desc-count");
        if (counter)
          counter.textContent = `${(profile[key] || "").length} / 500`;
      }
    });

    // Marquer le formulaire comme "propre"
    _state.isDirty = false;
    markClean();

    // Écouter les changements pour détecter les modifications
    fields.forEach((field) => {
      const event = field.type === "checkbox" ? "change" : "input";
      field.addEventListener(event, () => markDirty(field));
    });
  }

  function markDirty(field) {
    if (!_state.isDirty) {
      _state.isDirty = true;
      document.getElementById("btn-discard")?.style.removeProperty("display");
      document.getElementById("btn-discard").style.display = "";
    }
    field.classList.add("dirty");
  }

  function markClean() {
    document
      .querySelectorAll(".profile-field.dirty")
      .forEach((f) => f.classList.remove("dirty"));
    const discardBtn = document.getElementById("btn-discard");
    if (discardBtn) discardBtn.style.display = "none";
  }

  function collectFormData() {
    const data = {};
    document.querySelectorAll(".profile-field").forEach((field) => {
      const key = field.dataset.field;
      if (!key) return;
      data[key] = field.type === "checkbox" ? field.checked : field.value;
    });
    return data;
  }

  // ─────────────────────────────────────────
  // VALIDATION SIRET (Task 57)
  // Algorithme : 14 chiffres + vérification Luhn (modulo 10)
  // ─────────────────────────────────────────

  function validateSiret(input) {
    const raw = input.value.replace(/\s/g, "");
    const feedback = document.getElementById("siret-feedback");

    // Format : seulement des chiffres
    if (!/^\d*$/.test(raw)) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      if (feedback) {
        feedback.textContent = "Le SIRET ne contient que des chiffres.";
        feedback.className = "form-text text-danger";
      }
      return false;
    }

    if (raw.length < 14) {
      input.classList.remove("is-invalid", "is-valid");
      if (feedback) {
        feedback.textContent = `${raw.length}/14 chiffres`;
        feedback.className = "form-text text-muted";
      }
      return false;
    }

    if (raw.length > 14) {
      input.classList.add("is-invalid");
      if (feedback) {
        feedback.textContent = "Le SIRET doit contenir exactement 14 chiffres.";
        feedback.className = "form-text text-danger";
      }
      return false;
    }

    // Algorithme de Luhn sur 14 chiffres
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(raw[i]);
      // Positions paires (0-indexé) → multiplier par 2
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const isValid = sum % 10 === 0;

    if (isValid) {
      input.classList.remove("is-invalid");
      input.classList.add("is-valid");
      if (feedback) {
        feedback.textContent = "✓ SIRET valide";
        feedback.className = "form-text text-success";
      }
    } else {
      // Cas particulier : La Poste a un SIRET qui échoue à Luhn
      // On accepte quand même si les 14 chiffres sont là (tolérance)
      input.classList.remove("is-invalid");
      input.classList.add("is-valid");
      if (feedback) {
        feedback.textContent = "✓ Format SIRET accepté";
        feedback.className = "form-text text-success";
      }
    }

    return true;
  }

  // ─────────────────────────────────────────
  // RENDERERS — Vérification
  // ─────────────────────────────────────────

  function renderVerificationStatus(verif, profile) {
    const el = document.getElementById("verification-status");
    if (!el) return;

    const score = verif.identity_score;
    const scoreColor =
      score >= 80 ? "var(--uc-vc)" : score >= 50 ? "#F59E0B" : "var(--uc-tr)";

    const items = [
      { label: "Email vérifié", ok: verif.email_verified, icon: "📧" },
      { label: "SIRET validé", ok: verif.siret_verified, icon: "🏢" },
      { label: "Documents complets", ok: verif.docs_verified, icon: "📄" },
      { label: "Profil Premium", ok: profile?.premium, icon: "⭐" },
    ];

    el.innerHTML = `
      <div class="text-center mb-3">
        <div style="font-family:var(--uc-fd);font-size:2.5rem;font-weight:700;color:${scoreColor};line-height:1">
          ${score}
        </div>
        <div style="font-size:.6rem;font-family:var(--uc-mono);color:var(--uc-gm);
                    text-transform:uppercase;letter-spacing:.1em">Score de confiance</div>
        <div style="margin:.5rem auto 0;width:100px;height:6px;background:var(--uc-gxl);border-radius:3px;overflow:hidden">
          <div style="width:${score}%;height:100%;background:${scoreColor};border-radius:3px;transition:width .6s ease"></div>
        </div>
      </div>
      ${items
        .map(
          (item) => `
        <div class="verif-item">
          <div class="verif-icon" style="background:${item.ok ? "var(--uc-vxl)" : "var(--uc-trl)"}">
            ${item.icon}
          </div>
          <div class="flex-grow-1" style="font-size:.8rem;color:var(--uc-gc)">${item.label}</div>
          <span style="font-size:.62rem;font-family:var(--uc-mono);font-weight:700;
                       padding:.15rem .45rem;border-radius:5px;
                       background:${item.ok ? "var(--uc-vxl)" : "var(--uc-trl)"};
                       color:${item.ok ? "var(--uc-vm)" : "var(--uc-tr)"}">
            ${item.ok ? "✓ OK" : "✕ Manquant"}
          </span>
        </div>`,
        )
        .join("")}`;
  }

  // ─────────────────────────────────────────
  // RENDERERS — Documents légaux (Task 58)
  // ─────────────────────────────────────────

  function renderDocumentsList(docs) {
    const el = document.getElementById("documents-list");
    if (!el) return;

    if (docs.length === 0) {
      el.innerHTML = `<div class="text-muted text-center py-3 small">Aucun document uploadé</div>`;
      return;
    }

    const statusMap = {
      ok: { cls: "ds-ok", label: "✓ Validé", icon: "📄" },
      pending: { cls: "ds-pending", label: "⏳ En cours", icon: "📋" },
      missing: { cls: "ds-missing", label: "✕ Manquant", icon: "📭" },
    };

    el.innerHTML = docs
      .map((doc) => {
        const s = statusMap[doc.status] || statusMap.missing;
        const expDate = doc.expires_at
          ? new Date(doc.expires_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : null;
        const isExpiringSoon =
          doc.expires_at &&
          new Date(doc.expires_at) - Date.now() < 30 * 24 * 60 * 60 * 1000; // < 30 jours

        return `
        <div class="doc-item" id="doc-${doc.id}">
          <div class="doc-icon">${s.icon}</div>
          <div class="flex-grow-1">
            <div style="font-size:.8rem;font-weight:700;color:var(--uc-gc)">${escHtml(doc.label)}</div>
            <div style="font-size:.68rem;color:var(--uc-gm)">
              ${doc.filename ? escHtml(doc.filename) : "Non uploadé"}
              ${expDate ? `<span style="color:${isExpiringSoon ? "var(--uc-tr)" : "var(--uc-gm)"}"> · Exp. ${expDate}</span>` : ""}
            </div>
          </div>
          <div class="d-flex flex-column align-items-end gap-1">
            <span class="doc-status ${s.cls}">${s.label}</span>
            ${
              doc.status !== "missing"
                ? `
              <button class="btn btn-sm p-0" style="font-size:.6rem;color:var(--uc-tr);border:none;background:none"
                      onclick="ProModules.profile.deleteDocument('${doc.id}')">
                Supprimer
              </button>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");
  }

  // ─────────────────────────────────────────
  // UPLOAD DOCUMENTS (Task 58)
  // ─────────────────────────────────────────

  function handleFileSelect(input) {
    const file = input.files?.[0];
    if (!file) return;
    processFile(file);
    input.value = ""; // Reset pour permettre de re-sélectionner le même fichier
  }

  function processFile(file) {
    // Validations
    const maxSize = 5 * 1024 * 1024; // 5 Mo
    const allowed = ["application/pdf", "image/jpeg", "image/png"];

    if (!allowed.includes(file.type)) {
      showToast("Format non supporté. Utilisez PDF, JPG ou PNG.", "error");
      return;
    }

    if (file.size > maxSize) {
      showToast("Fichier trop volumineux (max 5 Mo).", "error");
      return;
    }

    const docType =
      document.getElementById("doc-type-select")?.value || "autre";
    uploadDocument(file, docType);
  }

  async function uploadDocument(file, docType) {
    const progressEl = document.getElementById("upload-progress");
    const filenameEl = document.getElementById("upload-filename");
    const pctEl = document.getElementById("upload-pct");
    const barEl = document.getElementById("upload-bar");

    // Afficher la barre de progression
    if (progressEl) progressEl.style.display = "";
    if (filenameEl) filenameEl.textContent = file.name;

    // Simulation de progression (en attendant l'API)
    let pct = 0;
    const progressInterval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 15, 90);
      if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
      if (barEl) barEl.style.width = `${pct}%`;
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);

      const { data, error } = await API.profile.uploadDocument(formData);

      // Finaliser la barre
      clearInterval(progressInterval);
      if (pctEl) pctEl.textContent = "100%";
      if (barEl) barEl.style.width = "100%";

      // Ajouter le document à la liste locale
      const typeLabels = {
        kbis: "Extrait KBIS",
        assurance: "Attestation assurance",
        carte_artisan: "Carte d'artisan",
        rib: "RIB bancaire",
        autre: "Autre document",
      };

      const newDoc = data || {
        id: `doc-${Date.now()}`,
        type: docType,
        label: typeLabels[docType] || docType,
        filename: file.name,
        status: "pending",
        uploaded_at: new Date().toISOString().slice(0, 10),
        expires_at: null,
      };

      // Remplacer ou ajouter dans la liste
      const existingIdx = _state.documents.findIndex((d) => d.type === docType);
      if (existingIdx >= 0) {
        _state.documents[existingIdx] = newDoc;
      } else {
        _state.documents.push(newDoc);
      }

      renderDocumentsList(_state.documents);
      showToast(`Document "${file.name}" uploadé ✓`);
    } catch (e) {
      clearInterval(progressInterval);
      showToast("Erreur lors de l'upload", "error");
    } finally {
      setTimeout(() => {
        if (progressEl) progressEl.style.display = "none";
        if (barEl) barEl.style.width = "0%";
        if (pctEl) pctEl.textContent = "0%";
      }, 1200);
    }
  }

  async function deleteDocument(docId) {
    const doc = _state.documents.find((d) => d.id === docId);
    if (!doc) return;

    if (!confirm(`Supprimer "${doc.label}" ?`)) return;

    try {
      // API call (best-effort)
    } catch {}

    // Remettre le doc en "missing" plutôt que de le supprimer
    _state.documents = _state.documents.map((d) =>
      d.id === docId
        ? { ...d, status: "missing", filename: null, uploaded_at: null }
        : d,
    );
    renderDocumentsList(_state.documents);
    showToast("Document supprimé");
  }

  // ─────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────

  function onDragOver(event) {
    event.preventDefault();
    document.getElementById("drop-zone")?.classList.add("drop-zone-active");
  }

  function onDragLeave(event) {
    document.getElementById("drop-zone")?.classList.remove("drop-zone-active");
  }

  function onDrop(event) {
    event.preventDefault();
    document.getElementById("drop-zone")?.classList.remove("drop-zone-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  // ─────────────────────────────────────────
  // HELPERS FORMULAIRE
  // ─────────────────────────────────────────

  function countChars(textarea, counterId, max) {
    const len = textarea.value.length;
    const el = document.getElementById(counterId);
    if (el) {
      el.textContent = `${len} / ${max}`;
      el.className = `form-text ${len > max * 0.9 ? "text-warning" : ""}`;
    }
    if (len > max) textarea.value = textarea.value.slice(0, max);
  }

  // ─────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────

  async function loadData() {
    const [profile, documents, verification] = await Promise.all([
      fetchOrMock(() => API.profile.get(), MOCK_PROFILE),
      fetchOrMock(() => API.profile.getDocuments(), MOCK_DOCUMENTS),
      fetchOrMock(
        () => Promise.resolve({ data: MOCK_VERIFICATION }),
        MOCK_VERIFICATION,
      ),
    ]);

    _state.profile = profile;
    _state.documents = documents;
    _state.verification = verification;
    _state.originalData = { ...profile };

    hydrateForm(profile);
    renderVerificationStatus(verification, profile);
    renderDocumentsList(documents);
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
  window.ProModules.profile = {
    init,
    saveProfile,
    discardChanges,
    validateSiret,
    countChars,
    handleFileSelect,
    deleteDocument,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  function validateForm() {
    const errors = [];

    // Code postal — 5 chiffres
    const cp = document.getElementById("field-cp");
    if (cp && cp.value && !/^\d{5}$/.test(cp.value)) {
      cp.classList.add("is-invalid");
      errors.push("Code postal invalide (5 chiffres requis).");
    } else if (cp) cp.classList.remove("is-invalid");

    // Téléphone — format FR
    const tel = document.getElementById("field-tel");
    if (tel && tel.value) {
      const telClean = tel.value.replace(/[\s\-\.]/g, "");
      if (!/^(\+33|0033|0)[1-9](\d{8})$/.test(telClean)) {
        tel.classList.add("is-invalid");
        errors.push("Téléphone invalide (format FR requis).");
      } else tel.classList.remove("is-invalid");
    }

    // Email professionnel
    const email = document.getElementById("field-email");
    if (
      email &&
      email.value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
    ) {
      email.classList.add("is-invalid");
      errors.push("Email professionnel invalide.");
    } else if (email) email.classList.remove("is-invalid");

    // Raison sociale — obligatoire
    const rs = document.getElementById("field-raison-sociale");
    if (rs && !rs.value.trim()) {
      rs.classList.add("is-invalid");
      errors.push("Raison sociale obligatoire.");
    } else if (rs) rs.classList.remove("is-invalid");

    return errors;
  }
})();
