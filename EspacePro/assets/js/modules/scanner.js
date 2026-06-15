(function () {
  "use strict";

  const JSQR_CDN = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";

  const QR_REGEX = /^UC-C(\w+)-OBJ-(\w+)$/i;

  const SCAN_COOLDOWN_MS = 2500;

  const MOCK_QR_DB = {};

  let _state = {
    stream: null,
    scanning: false,
    animFrameId: null,
    facingMode: "environment",
    torchOn: false,
    torchTrack: null,
    lastScanTime: 0,
    pendingResult: null,
    history: [],
    canvas: null,
    ctx: null,
  };

  function loadJsQR() {
    return new Promise((resolve, reject) => {
      if (window.jsQR) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = JSQR_CDN;
      script.onload = resolve;
      script.onerror = () => reject(new Error("jsQR non chargeable"));
      document.head.appendChild(script);
    });
  }

  async function startCamera() {
    const constraints = {
      video: {
        facingMode: { ideal: _state.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    try {
      _state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Accès à la caméra refusé. Autorisez l'accès dans les paramètres de votre navigateur."
          : err.name === "NotFoundError"
            ? "Aucune caméra détectée sur cet appareil."
            : `Erreur caméra : ${err.message}`;
      throw new Error(msg);
    }

    const video = document.getElementById("scanner-video");
    if (!video) return;

    video.srcObject = _state.stream;
    video.style.display = "";

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const tracks = _state.stream.getVideoTracks();
    _state.torchTrack = tracks[0] || null;

    if (!_state.canvas) {
      _state.canvas = document.createElement("canvas");
      _state.ctx = _state.canvas.getContext("2d", { willReadFrequently: true });
    }
    _state.canvas.width = video.videoWidth;
    _state.canvas.height = video.videoHeight;

    updateCamStatus(true);
  }

  function stopCamera() {
    if (_state.stream) {
      _state.stream.getTracks().forEach((t) => t.stop());
      _state.stream = null;
    }

    const video = document.getElementById("scanner-video");
    if (video) {
      video.srcObject = null;
      video.style.display = "none";
    }

    _state.torchOn = false;
    _state.torchTrack = null;
    updateCamStatus(false);
  }

  function updateCamStatus(active) {
    const dot = document.getElementById("cam-status-dot");
    const label = document.getElementById("cam-status-label");
    const frame = document.getElementById("scan-frame");
    const placeholder = document.getElementById("scanner-placeholder");
    const btn = document.getElementById("btn-start-scan");
    const btnLabel = document.getElementById("scan-btn-label");

    if (dot) {
      dot.style.background = active ? "#4ade80" : "var(--uc-gl)";
    }
    if (label) {
      label.textContent = active
        ? "● Caméra active — scan en cours…"
        : "Caméra inactive";
    }
    if (frame) {
      frame.style.display = active ? "" : "none";
    }
    if (placeholder) {
      placeholder.style.display = active ? "none" : "";
    }
    if (btn) {
      btn.style.background = active ? "var(--uc-tr)" : "var(--uc-vf)";
    }
    if (btnLabel) {
      btnLabel.textContent = active ? "Arrêter la caméra" : "Activer la caméra";
    }
  }

  function startScanLoop() {
    _state.scanning = true;

    function tick() {
      if (!_state.scanning) return;

      const video = document.getElementById("scanner-video");
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        _state.animFrameId = requestAnimationFrame(tick);
        return;
      }

      _state.ctx.drawImage(
        video,
        0,
        0,
        _state.canvas.width,
        _state.canvas.height,
      );
      const imageData = _state.ctx.getImageData(
        0,
        0,
        _state.canvas.width,
        _state.canvas.height,
      );

      const code = window.jsQR?.(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "dontInvert",
        },
      );

      if (code?.data) {
        const now = Date.now();
        if (now - _state.lastScanTime > SCAN_COOLDOWN_MS) {
          _state.lastScanTime = now;
          onQRDetected(code.data);
        }
      }

      _state.animFrameId = requestAnimationFrame(tick);
    }

    _state.animFrameId = requestAnimationFrame(tick);
  }

  function stopScanLoop() {
    _state.scanning = false;
    if (_state.animFrameId) {
      cancelAnimationFrame(_state.animFrameId);
      _state.animFrameId = null;
    }
  }

  async function onQRDetected(rawCode) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    showScanSuccess(rawCode);

    const match = rawCode.match(QR_REGEX);
    if (!match) {
      await processResult({
        success: false,
        code: rawCode,
        error: `Format non reconnu. Attendu : UC-C<id>-OBJ-<id>`,
      });
      return;
    }

    await validateCode(rawCode);
  }

  function showScanSuccess(rawCode) {
    const overlay = document.getElementById("scan-success-overlay");
    const rawEl = document.getElementById("scan-result-raw");
    if (overlay) {
      overlay.style.display = "flex";
      if (rawEl) rawEl.textContent = rawCode;

      setTimeout(() => {
        overlay.style.display = "none";
      }, 2000);
    }
  }

  async function validateCode(code) {
    try {
      let result;
      const { data, error } = await API.scanner.validateQR(code);

      if (error || !data) {
        result = MOCK_QR_DB[code.toUpperCase()] || null;
        if (!result) {
          await processResult({
            success: false,
            code,
            error: "Code non trouvé dans la base.",
          });
          return;
        }
        await processResult({ success: true, code, ...result });
      } else {
        await processResult({ success: true, code, ...data });
      }
    } catch {
      const result = MOCK_QR_DB[code.toUpperCase()] || null;
      if (result) {
        await processResult({ success: true, code, ...result });
      } else {
        await processResult({
          success: false,
          code,
          error: "Serveur inaccessible.",
        });
      }
    }
  }

  async function processResult(result) {
    _state.pendingResult = result;

    const panel = document.getElementById("scan-result-panel");
    const content = document.getElementById("scan-result-content");
    if (!panel || !content) return;

    panel.style.display = "";

    if (!result.success) {
      content.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
          <div style="width:42px;height:42px;border-radius:50%;background:var(--uc-trl);
                      display:flex;align-items:center;justify-content:center;
                      color:var(--uc-tr);font-size:1.1rem;flex-shrink:0">✕</div>
          <div>
            <div style="font-weight:700;color:var(--uc-gc)">Code invalide</div>
            <div style="font-size:.75rem;color:var(--uc-gm)">${escHtml(result.error)}</div>
          </div>
        </div>
        <div style="font-family:var(--uc-mono);font-size:.68rem;color:var(--uc-gm);
                    background:var(--uc-gxl);padding:.5rem .75rem;border-radius:8px">
          Code scanné : ${escHtml(result.code)}
        </div>
        <button class="btn btn-sm w-100 mt-3 rounded-3"
                style="background:var(--uc-vf);color:#fff;font-weight:600"
                onclick="ProModules.scanner.retryAfterError()">
          <i class="bi bi-arrow-clockwise me-1"></i>Rescanner
        </button>`;

      addToHistory({ code: result.code, success: false, time: new Date() });
      return;
    }

    const { object, container } = result;
    const impact = window.API?.projects?.calculateImpact(
      object.weight_kg,
      object.material,
    ) || { co2_kg: (object.weight_kg * 0.6).toFixed(1), score_points: 0 };

    const matEmojis = {
      bois: "🪵",
      metal: "⚙️",
      plastique: "♳",
      textile: "🧵",
      verre: "🫙",
      papier: "📦",
    };
    const matEmoji = matEmojis[object.material] || "♻️";

    content.innerHTML = `
      <!-- Header succès -->
      <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded-3"
           style="background:var(--uc-vxl)">
        <div style="font-size:2rem">${matEmoji}</div>
        <div>
          <div style="font-weight:700;color:var(--uc-vf)">${escHtml(object.name)}</div>
          <div style="font-size:.7rem;color:var(--uc-gm)">
            Trouvé dans ${escHtml(container.name)}
          </div>
        </div>
        <div class="ms-auto">
          <span style="font-size:.6rem;font-family:var(--uc-mono);font-weight:700;
                       padding:.2rem .5rem;border-radius:6px;
                       background:var(--uc-vc);color:#fff">✓ VALIDÉ</span>
        </div>
      </div>

      <!-- Détails objet -->
      <div class="scan-result-row">
        <span class="scan-result-label">Objet</span>
        <span class="scan-result-val">${escHtml(object.name)}</span>
      </div>
      <div class="scan-result-row">
        <span class="scan-result-label">Matériau</span>
        <span class="scan-result-val">${matEmoji} ${escHtml(object.material)}</span>
      </div>
      <div class="scan-result-row">
        <span class="scan-result-label">Poids</span>
        <span class="scan-result-val">${object.weight_kg} kg</span>
      </div>
      <div class="scan-result-row">
        <span class="scan-result-label">État</span>
        <span class="scan-result-val">
          ${object.condition === "bon" ? "★ Bon état" : "~ État moyen"}
        </span>
      </div>
      <div class="scan-result-row">
        <span class="scan-result-label">Conteneur</span>
        <span class="scan-result-val">${escHtml(container.id)}</span>
      </div>
      <div class="scan-result-row">
        <span class="scan-result-label">Adresse</span>
        <span class="scan-result-val" style="max-width:160px;text-align:right">
          ${escHtml(container.address)}
        </span>
      </div>

      <!-- Impact potentiel -->
      <div class="d-flex gap-2 my-3 flex-wrap">
        <span class="impact-chip">🌿 ${impact.co2_kg} kg CO₂ potentiel</span>
        <span class="impact-chip blue">⭐ +${impact.score_points} pts estimés</span>
      </div>

      <!-- CTA Confirmer -->
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary rounded-3 flex-grow-1"
                onclick="ProModules.scanner.cancelCollection()">
          Annuler
        </button>
        <button class="btn rounded-3 fw-bold flex-grow-1"
                style="background:var(--uc-vf);color:#fff"
                id="btn-confirm-collect"
                onclick="ProModules.scanner.confirmCollection()">
          <i class="bi bi-check2-circle me-1"></i>Confirmer la collecte
          <span id="collect-spinner" class="spinner-border spinner-border-sm ms-1"
                style="display:none" role="status"></span>
        </button>
      </div>`;

    addToHistory({
      code: result.code,
      name: object.name,
      success: true,
      time: new Date(),
    });
  }

  async function confirmCollection() {
    if (!_state.pendingResult?.success) return;

    const { object, container } = _state.pendingResult;
    const btn = document.getElementById("btn-confirm-collect");
    const spinner = document.getElementById("collect-spinner");
    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = "";

    try {
      const { error } = await API.scanner.confirmCollection(
        object.id,
        container.id,
      );
      if (error) throw new Error(error);

      showToast(`✓ Collecte confirmée — ${object.name} récupéré !`);
    } catch {
      console.info(
        "[Scanner] API confirmCollection non disponible — simulation",
      );
      showToast(`✓ Collecte confirmée (simulée) — ${object.name} !`);
    }

    const panel = document.getElementById("scan-result-panel");
    if (panel) panel.style.display = "none";
    _state.pendingResult = null;

    if (btn) {
      btn.disabled = false;
    }
    if (spinner) {
      spinner.style.display = "none";
    }

    const user = Store.get("user");
    if (user) {
      Store.set("user", { ...user });
    }
  }

  function cancelCollection() {
    const panel = document.getElementById("scan-result-panel");
    if (panel) panel.style.display = "none";
    _state.pendingResult = null;

    if (!_state.scanning) startScanLoop();
  }

  function retryAfterError() {
    const panel = document.getElementById("scan-result-panel");
    if (panel) panel.style.display = "none";
    _state.pendingResult = null;
  }

  function submitManualCode() {
    const input = document.getElementById("manual-code-input");
    const code = input?.value?.trim().toUpperCase();
    if (!code) return;

    if (input) input.value = "";
    validateCode(code);
  }

  function addToHistory(entry) {
    _state.history.unshift({ ...entry, id: Date.now() });
    if (_state.history.length > 20)
      _state.history = _state.history.slice(0, 20);

    try {
      sessionStorage.setItem("uc_scan_history", JSON.stringify(_state.history));
    } catch {
    }

    renderHistory();
  }

  function renderHistory() {
    const container = document.getElementById("scan-history");
    if (!container) return;

    if (_state.history.length === 0) {
      container.innerHTML = `
        <div class="text-center py-3 text-muted small">
          <i class="bi bi-inbox" style="font-size:1.5rem;color:var(--uc-gl)"></i>
          <div class="mt-1">Aucun scan récent</div>
        </div>`;
      return;
    }

    container.innerHTML = _state.history
      .slice(0, 8)
      .map(
        (h) => `
      <div class="scan-history-item">
        <div class="scan-history-dot"
             style="background:${h.success ? "var(--uc-vc)" : "var(--uc-tr)"}"></div>
        <div class="flex-grow-1">
          <div style="font-size:.75rem;font-weight:600;color:var(--uc-gc)">
            ${escHtml(h.name || h.code)}
          </div>
          <div style="font-size:.62rem;font-family:var(--uc-mono);color:var(--uc-gm)">
            ${new Date(h.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <span style="font-size:.6rem;font-family:var(--uc-mono);
                     color:${h.success ? "var(--uc-vc)" : "var(--uc-tr)"}">
          ${h.success ? "✓" : "✕"}
        </span>
      </div>`,
      )
      .join("");
  }

  function clearHistory() {
    _state.history = [];
    try {
      sessionStorage.removeItem("uc_scan_history");
    } catch {}
    renderHistory();
  }

  async function toggleScan() {
    if (_state.scanning) {
      stopScanLoop();
      stopCamera();
    } else {
      const btn = document.getElementById("btn-start-scan");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<span class="spinner-border spinner-border-sm me-2"></span>Démarrage…';
      }

      try {
        await loadJsQR();
        await startCamera();
        startScanLoop();
      } catch (e) {
        showToast(e.message || "Erreur caméra", "error");
        const btnLabel = document.getElementById("scan-btn-label");
        if (btnLabel) btnLabel.textContent = "Activer la caméra";
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  }

  async function switchCamera(facingMode) {
    _state.facingMode = facingMode;
    if (_state.scanning) {
      stopScanLoop();
      stopCamera();
      await startCamera();
      startScanLoop();
    }
  }

  async function toggleTorch() {
    if (!_state.torchTrack) return;

    try {
      _state.torchOn = !_state.torchOn;
      await _state.torchTrack.applyConstraints({
        advanced: [{ torch: _state.torchOn }],
      });

      const btn = document.getElementById("torch-btn");
      if (btn) {
        btn.style.background = _state.torchOn
          ? "rgba(245,158,11,.2)"
          : "var(--uc-gxl)";
        btn.innerHTML = _state.torchOn
          ? '<i class="bi bi-lightbulb-fill" style="color:#F59E0B"></i>'
          : '<i class="bi bi-lightbulb"></i>';
      }
    } catch {
      showToast("La torche n'est pas disponible sur cet appareil", "warning");
    }
  }

  function escHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
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

  async function init(ctx) {
    try {
      const saved = sessionStorage.getItem("uc_scan_history");
      if (saved) _state.history = JSON.parse(saved);
    } catch {}

    renderHistory();

    loadJsQR().catch(() => {});
  }

  function destroy() {
    stopScanLoop();
    stopCamera();
  }

  window.ProModules = window.ProModules || {};
  window.ProModules.scanner = {
    init,
    destroy,
    toggleScan,
    switchCamera,
    toggleTorch,
    submitManualCode,
    confirmCollection,
    cancelCollection,
    retryAfterError,
    clearHistory,
    openContainerDetail: (id) => window.Router?.go("map"),
  };
})();
