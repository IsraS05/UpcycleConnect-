(function () {
  "use strict";

  const MOCK_INVOICES = [];

  const PAGE_SIZE = 8;

  let _state = {
    invoices: [],
    filtered: [],
    currentFilter: "all",
    currentYear: "all",
    currentPage: 1,
    previewInvoice: null,
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

  function formatPrice(amount) {
    return amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
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
    new bootstrap.Toast(toastEl, { delay: 3500 }).show();
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

  function applyFilters() {
    let result = [..._state.invoices];

    if (_state.currentFilter !== "all") {
      result = result.filter((inv) => inv.status === _state.currentFilter);
    }

    if (_state.currentYear !== "all") {
      result = result.filter(
        (inv) => inv.year === parseInt(_state.currentYear),
      );
    }

    _state.filtered = result;
    _state.currentPage = 1;
  }

  function getPagedInvoices() {
    const start = (_state.currentPage - 1) * PAGE_SIZE;
    return _state.filtered.slice(start, start + PAGE_SIZE);
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(_state.filtered.length / PAGE_SIZE));
  }

  function renderSummary() {
    const container = document.getElementById("billing-summary");
    if (!container) return;

    const all = _state.invoices;
    const paid = all.filter((i) => i.status === "paid");
    const pending = all.filter((i) => i.status === "pending");
    const totalPaid = paid.reduce((s, i) => s + i.price_ttc, 0);
    const thisYear = all.filter((i) => i.year === 2026);
    const ytdTotal = thisYear.reduce((s, i) => s + i.price_ttc, 0);

    container.innerHTML = `
      <div class="col-6 col-md-3">
        <div class="kpi-card kpi-green p-3 h-100">
          <div style="font-family:var(--uc-fd);font-size:1.5rem;font-weight:700;color:var(--uc-vf)">
            ${paid.length}
          </div>
          <div class="kpi-label">Factures payées</div>
          <div class="kpi-delta">${formatPrice(totalPaid)} total</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card kpi-blue p-3 h-100">
          <div style="font-family:var(--uc-fd);font-size:1.5rem;font-weight:700;color:#1D4ED8">
            ${formatPrice(ytdTotal)}
          </div>
          <div class="kpi-label">Dépensé en 2026</div>
          <div class="kpi-delta">${thisYear.length} facture${thisYear.length > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card p-3 h-100" style="border-color:var(--uc-bs)">
          <div style="font-family:var(--uc-fd);font-size:1.5rem;font-weight:700;color:#F59E0B">
            ${pending.length}
          </div>
          <div class="kpi-label" style="color:var(--uc-gm)">En attente</div>
          <div style="font-size:.7rem;color:var(--uc-gm);margin-top:.4rem">
            ${
              pending.length > 0
                ? formatPrice(pending.reduce((s, i) => s + i.price_ttc, 0))
                : "Aucune"
            }
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card p-3 h-100" style="border-color:var(--uc-bs)">
          <div style="font-family:var(--uc-fd);font-size:1.5rem;font-weight:700;color:var(--uc-gc)">
            ${all.length}
          </div>
          <div class="kpi-label" style="color:var(--uc-gm)">Total factures</div>
          <div style="font-size:.7rem;color:var(--uc-gm);margin-top:.4rem">
            Depuis ${new Date(all[all.length - 1]?.date).getFullYear() || "–"}
          </div>
        </div>
      </div>`;
  }

  function renderTable() {
    const tbody = document.getElementById("invoices-tbody");
    const countLabel = document.getElementById("invoice-count-label");
    if (!tbody) return;

    const paged = getPagedInvoices();
    const total = _state.filtered.length;
    const start = (_state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(_state.currentPage * PAGE_SIZE, total);

    if (countLabel) {
      countLabel.textContent =
        total > 0
          ? `Affichage ${start}–${end} sur ${total} facture${total > 1 ? "s" : ""}`
          : "Aucune facture trouvée";
    }

    if (paged.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5 text-muted">
            <i class="bi bi-file-earmark-x" style="font-size:2rem;color:var(--uc-gl)"></i>
            <div class="mt-2 small">Aucune facture dans cette sélection</div>
          </td>
        </tr>`;
      renderPagination();
      return;
    }

    const statusMap = {
      paid: { label: "Payée", cls: "paid" },
      pending: { label: "En attente", cls: "pending" },
      failed: { label: "Échouée", cls: "failed" },
    };

    tbody.innerHTML = paged
      .map((inv) => {
        const st = statusMap[inv.status] || {
          label: inv.status,
          cls: "pending",
        };
        return `
        <tr style="cursor:pointer" onclick="ProModules.billing.openPreview('${escHtml(inv.id)}')">
          <td>
            <span style="font-family:var(--uc-mono);font-size:.75rem;font-weight:600;color:var(--uc-vf)">
              ${escHtml(inv.id)}
            </span>
          </td>
          <td>
            <span style="font-size:.78rem">${formatDate(inv.date)}</span>
          </td>
          <td>
            <span style="font-size:.78rem">${escHtml(inv.description)}</span>
          </td>
          <td>
            <span style="font-family:var(--uc-mono);font-weight:700;font-size:.8rem">
              ${formatPrice(inv.price_ttc)}
            </span>
          </td>
          <td>
            <span class="inv-badge ${st.cls}">${st.label}</span>
          </td>
          <td class="text-end">
            <div class="d-flex gap-1 justify-content-end">
              <button class="btn btn-sm btn-outline-secondary rounded-2"
                      style="font-size:.7rem;padding:.25rem .6rem"
                      onclick="event.stopPropagation();ProModules.billing.openPreview('${escHtml(inv.id)}')"
                      title="Aperçu">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-sm rounded-2"
                      style="font-size:.7rem;padding:.25rem .6rem;
                             background:var(--uc-vf);color:#fff"
                      onclick="event.stopPropagation();ProModules.billing.downloadPdf('${escHtml(inv.id)}')"
                      title="Télécharger PDF">
                <i class="bi bi-download"></i>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    renderPagination();
  }

  function renderPagination() {
    const container = document.getElementById("pagination-btns");
    if (!container) return;

    const totalPages = getTotalPages();
    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    let html = "";
    html += `<div class="page-btn ${_state.currentPage === 1 ? "opacity-50" : ""}"
               onclick="ProModules.billing.goToPage(${_state.currentPage - 1})">‹</div>`;

    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= _state.currentPage - 1 && p <= _state.currentPage + 1)
      ) {
        html += `<div class="page-btn ${p === _state.currentPage ? "active" : ""}"
                   onclick="ProModules.billing.goToPage(${p})">${p}</div>`;
      } else if (p === _state.currentPage - 2 || p === _state.currentPage + 2) {
        html += `<div class="page-btn" style="cursor:default;border:none">…</div>`;
      }
    }

    html += `<div class="page-btn ${_state.currentPage === totalPages ? "opacity-50" : ""}"
               onclick="ProModules.billing.goToPage(${_state.currentPage + 1})">›</div>`;

    container.innerHTML = html;
  }

  function buildInvoiceHtml(inv) {
    return `
      <div class="invoice-preview" id="printable-invoice">
        <div class="inv-header">
          <div>
            <div style="font-family:var(--uc-fd);font-size:1.3rem;font-weight:700;color:var(--uc-vf)">
              UpcycleConnect
            </div>
            <div style="font-size:.72rem;color:var(--uc-gm);margin-top:.2rem">
              174 rue La Fayette, 75010 Paris<br>
              contact@upcycleconnect.fr · SIRET 00000000000000<br>
              N° TVA intracommunautaire : FR00000000000
            </div>
          </div>
          <div class="text-end">
            <div style="font-family:var(--uc-fd);font-size:1.5rem;font-weight:700;color:var(--uc-vf)">
              FACTURE
            </div>
            <div style="font-family:var(--uc-mono);font-size:.8rem;font-weight:700;color:var(--uc-gc)">
              ${escHtml(inv.id)}
            </div>
            <div style="font-size:.72rem;color:var(--uc-gm);margin-top:.3rem">
              Date : ${formatDate(inv.date)}<br>
              Référence Stripe : ${escHtml(inv.stripe_id)}
            </div>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-6">
            <div style="font-family:var(--uc-mono);font-size:.6rem;letter-spacing:.1em;
                        color:var(--uc-gm);text-transform:uppercase;margin-bottom:.4rem">
              Facturer à
            </div>
            <div style="font-weight:700;font-size:.85rem">${escHtml(inv.raison_sociale)}</div>
            <div style="font-size:.75rem;color:var(--uc-gm)">
              SIRET : ${escHtml(inv.siret)}<br>
              ${escHtml(inv.address)}
            </div>
          </div>
          <div class="col-6 text-end">
            <div style="font-family:var(--uc-mono);font-size:.6rem;letter-spacing:.1em;
                        color:var(--uc-gm);text-transform:uppercase;margin-bottom:.4rem">
              Statut
            </div>
            <span class="inv-badge ${inv.status}" style="font-size:.72rem;padding:.3rem .7rem">
              ${inv.status === "paid" ? "✓ Payée" : inv.status === "pending" ? "⏳ En attente" : "✕ Échouée"}
            </span>
          </div>
        </div>

        <table class="table inv-table mb-0 rounded-3 overflow-hidden">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center" style="width:80px">Qté</th>
              <th class="text-end"    style="width:110px">Prix HT</th>
              <th class="text-center" style="width:80px">TVA</th>
              <th class="text-end"    style="width:110px">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escHtml(inv.description)}</td>
              <td class="text-center">${inv.qty}</td>
              <td class="text-end" style="font-family:var(--uc-mono)">${formatPrice(inv.price_ht)}</td>
              <td class="text-center" style="font-family:var(--uc-mono)">${inv.tva_pct}%</td>
              <td class="text-end" style="font-family:var(--uc-mono);font-weight:700">${formatPrice(inv.price_ttc)}</td>
            </tr>
          </tbody>
        </table>

        <div class="inv-total">
          <div>
            <div style="font-size:.72rem;color:var(--uc-gm)">Sous-total HT</div>
            <div style="font-family:var(--uc-mono);font-weight:600">${formatPrice(inv.price_ht)}</div>
          </div>
          <div>
            <div style="font-size:.72rem;color:var(--uc-gm)">TVA (${inv.tva_pct}%)</div>
            <div style="font-family:var(--uc-mono);font-weight:600">${formatPrice(inv.tva_amount)}</div>
          </div>
          <div>
            <div style="font-size:.72rem;font-weight:700;color:var(--uc-vf)">TOTAL TTC</div>
            <div style="font-family:var(--uc-fd);font-size:1.2rem;font-weight:700;color:var(--uc-vf)">
              ${formatPrice(inv.price_ttc)}
            </div>
          </div>
        </div>

        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--uc-gxl);
                    font-size:.65rem;color:var(--uc-gm);line-height:1.6">
          Paiement traité via Stripe · Réf. ${escHtml(inv.stripe_id)}<br>
          En cas de litige, contactez-nous à pro@upcycleconnect.fr<br>
          UpcycleConnect SAS — RCS Paris 000 000 000 — TVA FR00000000000
        </div>
      </div>`;
  }

  function openPreview(invoiceId) {
    const inv = _state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    _state.previewInvoice = inv;

    const numEl = document.getElementById("preview-invoice-number");
    if (numEl) numEl.textContent = inv.id;

    const body = document.getElementById("invoice-preview-body");
    if (body) body.innerHTML = buildInvoiceHtml(inv);

    new bootstrap.Modal(
      document.getElementById("modal-invoice-preview"),
    ).show();
  }

  async function downloadPdf(invoiceId) {
    const id = invoiceId || _state.previewInvoice?.id;
    if (!id) return;

    const spinner = document.getElementById("pdf-spinner");
    const btn = document.getElementById("btn-download-pdf");
    if (btn) btn.disabled = true;
    if (spinner) spinner.style.display = "";

    try {
      const { data: blob, error } = await API.billing.downloadInvoicePdf(id);

      if (!error && blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `UpcycleConnect-${id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        showToast(`Facture ${id} téléchargée ✓`);
      } else {
        _printInvoice(id);
      }
    } catch {
      _printInvoice(id);
    } finally {
      if (btn) btn.disabled = false;
      if (spinner) spinner.style.display = "none";
    }
  }

  function downloadCurrentPdf() {
    downloadPdf(_state.previewInvoice?.id);
  }

  function _printInvoice(invoiceId) {
    const inv = _state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Facture ${inv.id} — UpcycleConnect</title>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Nunito+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          :root {
            --uc-vf: #1C3D2B; --uc-vm: #2E6B47; --uc-vc: #4D9E6A;
            --uc-vxl: #E1F5E4; --uc-gc: #3A3A3A; --uc-gm: #7A7A72;
            --uc-gxl: #F0EDE8; --uc-bs: #EDE3C8;
            --uc-tr: #C4623A; --uc-trl: #F9EAE3;
          }
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Nunito Sans',sans-serif; font-size:13px; color:var(--uc-gc); padding:2.5cm; }
          .invoice-preview { max-width:700px; margin:0 auto; }
          .inv-header { display:flex; justify-content:space-between; padding-bottom:1.5rem; border-bottom:2px solid var(--uc-bs); margin-bottom:1.5rem; }
          table { width:100%; border-collapse:collapse; margin-bottom:.5rem; }
          th { background:var(--uc-gxl); font-family:'DM Mono',monospace; font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; color:var(--uc-gm); padding:.5rem .75rem; font-weight:700; text-align:left; }
          td { padding:.6rem .75rem; border-bottom:1px solid var(--uc-gxl); }
          .inv-total { display:flex; justify-content:flex-end; gap:2rem; padding:1rem 0; border-top:2px solid var(--uc-bs); }
          .inv-badge { font-family:'DM Mono',monospace; font-size:.6rem; font-weight:700; padding:.2rem .5rem; border-radius:6px; text-transform:uppercase; }
          .inv-badge.paid { background:var(--uc-vxl); color:var(--uc-vm); }
          @media print {
            body { padding:1cm; }
            @page { margin:1cm; }
          }
        </style>
      </head>
      <body>
        ${buildInvoiceHtml(inv)}
        <script>window.onload = function(){ window.print(); window.close(); }<\/script>
      </body>
      </html>`);
    printWindow.document.close();
    showToast(`Impression / enregistrement PDF de ${inv.id}`);
  }

  function filterInvoices(status, btn) {
    _state.currentFilter = status;
    document
      .querySelectorAll(".billing-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    applyFilters();
    renderTable();
  }

  function filterByYear(year) {
    _state.currentYear = year;
    applyFilters();
    renderTable();
  }

  function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;
    _state.currentPage = page;
    renderTable();
    document
      .getElementById("invoices-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportAll() {
    const rows = [
      [
        "N° Facture",
        "Date",
        "Description",
        "HT (€)",
        "TVA (€)",
        "TTC (€)",
        "Statut",
      ],
      ..._state.filtered.map((inv) => [
        inv.id,
        new Date(inv.date).toLocaleDateString("fr-FR"),
        inv.description,
        inv.price_ht.toFixed(2),
        inv.tva_amount.toFixed(2),
        inv.price_ttc.toFixed(2),
        inv.status,
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `upcycleconnect-factures-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("Export CSV des factures téléchargé ✓");
  }

  async function loadData() {
    const invoices = await fetchOrMock(
      () => API.billing.getInvoices(),
      MOCK_INVOICES,
    );

    _state.invoices = invoices.sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    applyFilters();

    renderSummary();
    renderTable();
  }

  async function init(ctx) {
    await loadData();
  }

  window.ProModules = window.ProModules || {};
  window.ProModules.billing = {
    init,
    filterInvoices,
    filterByYear,
    goToPage,
    openPreview,
    downloadPdf,
    downloadCurrentPdf,
    exportAll,
  };
})();
