(function () {
  "use strict";

  const MOCK_NOTIFICATIONS = [];

  let _state = {
    notifications: [],
    activeFilter: "all",
    session: null,
  };

  async function fetchOrMock(apiFn, mockData, label) {
    try {
      const { data, error } = await apiFn();
      if (error || !data) {
        console.info(
          `[Notifications] API '${label}' non disponible — données simulées`,
        );
        return mockData;
      }
      return data;
    } catch {
      console.info(
        `[Notifications] API '${label}' inaccessible — données simulées`,
      );
      return mockData;
    }
  }

  function showToast(msg, type = "success") {
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
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  function escHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function typeStyle(type) {
    switch (type) {
      case "urgente":
        return { dot: "var(--uc-tr)", bg: "#FFF5F2", label: "Urgente" };
      case "warn":
        return { dot: "#F59E0B", bg: "#FFFBEB", label: "Attention" };
      case "info":
        return { dot: "var(--uc-vc)", bg: "var(--uc-vxl)", label: "Info" };
      default:
        return { dot: "var(--uc-gl)", bg: "#F8F9FA", label: "" };
    }
  }

  function renderList(notifications, filter) {
    const container = document.getElementById("notif-list");
    if (!container) return;

    const filtered =
      filter === "all"
        ? notifications
        : filter === "unread"
          ? notifications.filter((n) => !n.read)
          : notifications.filter((n) => n.type === filter);

    _updateFilterCounts(notifications);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-bell-slash" style="font-size:2.5rem;color:var(--uc-gl)"></i>
          <div class="mt-3 small">Aucune notification dans cette catégorie</div>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map((n) => {
        const style = typeStyle(n.type);
        return `
        <div class="notif-item ${n.read ? "notif-read" : ""}"
             id="notif-${escHtml(n.id)}"
             style="background:${n.read ? "#fff" : style.bg};border-left:3px solid ${style.dot};
                    border-radius:10px;padding:1rem;margin-bottom:.75rem;
                    display:flex;gap:.85rem;align-items:flex-start;
                    box-shadow:0 1px 4px rgba(28,61,43,.06);
                    transition:opacity .2s">

          <!-- Icône -->
          <div style="font-size:1.3rem;flex-shrink:0;margin-top:.1rem">${escHtml(n.icon)}</div>

          <!-- Contenu -->
          <div class="flex-grow-1">
            <div style="font-size:.82rem;font-weight:700;color:var(--uc-gc)">
              ${!n.read ? `<span style="color:${style.dot}" class="me-1">●</span>` : ""}
              ${escHtml(n.title)}
            </div>
            <div style="font-size:.74rem;color:var(--uc-gm);margin-top:.2rem">
              ${escHtml(n.detail)}
            </div>
            ${
              n.action
                ? `
              <a href="${escHtml(n.action.href)}"
                 class="text-success mt-1 d-inline-block"
                 style="font-size:.72rem;font-weight:700;text-decoration:none">
                ${escHtml(n.action.label)} <i class="bi bi-arrow-right"></i>
              </a>`
                : ""
            }
          </div>

          <!-- Méta + actions -->
          <div class="d-flex flex-column align-items-end gap-1 flex-shrink-0">
            <span style="font-size:.62rem;color:var(--uc-gl);font-family:var(--uc-mono)">
              ${escHtml(n.time)}
            </span>
            <div class="d-flex gap-1 mt-1">
              ${
                !n.read
                  ? `
                <button class="btn btn-sm p-0"
                        style="font-size:.62rem;color:var(--uc-gm);border:none;background:none;text-decoration:underline"
                        onclick="ProModules.notifications.markRead('${escHtml(n.id)}')">
                  Marquer lu
                </button>`
                  : ""
              }
              <button class="btn btn-sm p-0"
                      style="font-size:.62rem;color:var(--uc-gl);border:none;background:none"
                      title="Supprimer"
                      onclick="ProModules.notifications.remove('${escHtml(n.id)}')">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  function _updateFilterCounts(notifications) {
    const counts = {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      urgente: notifications.filter((n) => n.type === "urgente").length,
      info: notifications.filter((n) => n.type === "info").length,
    };

    Object.entries(counts).forEach(([key, count]) => {
      const badge = document.getElementById(`notif-count-${key}`);
      if (badge) badge.textContent = count;
    });
  }

  function filterBy(type, btn) {
    _state.activeFilter = type;

    document
      .querySelectorAll(".notif-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    renderList(_state.notifications, type);
  }

  async function markRead(notifId) {
    _state.notifications = _state.notifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n,
    );
    renderList(_state.notifications, _state.activeFilter);

    const unread = _state.notifications.filter((n) => !n.read).length;
    window.Store?.actions?.setUnreadCount(unread);

    try {
      await window.API?.notifications?.markRead(notifId);
    } catch (e) {
    }
  }

  async function markAllRead() {
    _state.notifications = _state.notifications.map((n) => ({
      ...n,
      read: true,
    }));
    renderList(_state.notifications, _state.activeFilter);

    window.Store?.actions?.clearUnread?.();

    try {
      await window.API?.notifications?.markAllRead();
    } catch (e) {
    }

    showToast("Toutes les notifications marquées comme lues ✓");
  }

  async function remove(notifId) {
    _state.notifications = _state.notifications.filter((n) => n.id !== notifId);
    renderList(_state.notifications, _state.activeFilter);

    const unread = _state.notifications.filter((n) => !n.read).length;
    window.Store?.actions?.setUnreadCount(unread);

    try {
      await window.API?.notifications?.delete(notifId);
    } catch (e) {
    }
  }

  async function loadData() {
    const notifs = await fetchOrMock(
      () =>
        window.API?.notifications?.getAll() || Promise.resolve({ data: null }),
      MOCK_NOTIFICATIONS,
      "getAll",
    );

    _state.notifications = notifs;
    renderList(notifs, _state.activeFilter);

    const unread = notifs.filter((n) => !n.read).length;
    window.Store?.actions?.setUnreadCount(unread);
  }

  async function init(ctx) {
    _state.session = ctx.session;
    _state.activeFilter = "all";

    const markAllBtn = document.getElementById("btn-mark-all-read");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", markAllRead);
    }

    document.querySelectorAll(".notif-filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        filterBy(this.getAttribute("data-filter"), this);
      });
    });

    await loadData();
  }

  window.ProModules = window.ProModules || {};
  window.ProModules.notifications = {
    init,
    filterBy,
    markRead,
    markAllRead,
    remove,
  };
})();
