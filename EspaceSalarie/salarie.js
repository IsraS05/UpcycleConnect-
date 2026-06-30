/* ===========================================================
   UpcycleConnect — Espace Salarié — Logique
   API Go : http://localhost:8081
   =========================================================== */

const API = "http://localhost:8081";
const ID_SALARIE = Number(localStorage.getItem("id_user")) || 1;
const NOM_SALARIE = localStorage.getItem("nom_user") || "";

/* ------------------ Navigation ------------------ */
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    link.classList.add("active");
    const id = link.dataset.section;
    document.getElementById(id).classList.add("active");
    onSectionShown(id);
  });
});

function onSectionShown(id) {
  if (id === "planning") loadPlanning();
  if (id === "formations") loadFormations();
  if (id === "conseils") loadConseils();
  if (id === "forum") loadForumSujets();
}

/* ------------------ Helpers ------------------ */
function badge(statut) {
  const map = {
    "En attente": "badge-attente", "Valide": "badge-valide", "Refuse": "badge-refuse",
    "Brouillon": "badge-brouillon", "Planifie": "badge-publie", "Publie": "badge-publie",
    "Visible": "badge-valide", "Masque": "badge-masque", "Ouvert": "badge-valide", "Ferme": "badge-masque",
  };
  const label = { "Planifie": "Planifié", "Publie": "Publié", "Valide": "Validé",
                  "Refuse": "Refusé", "Ferme": "Fermé", "Masque": "Masqué" };
  return `<span class="badge ${map[statut] || "badge-brouillon"}">${label[statut] || statut}</span>`;
}

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function empty(cols, emoji, msg) {
  return `<tr><td colspan="${cols}"><div class="empty"><span class="emoji">${emoji}</span><div class="msg">${msg}</div></div></td></tr>`;
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }
function toISO(v) { return v ? new Date(v).toISOString() : null; }

function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(str) { return escapeHtml(str).replace(/['"]/g, ""); }

function logout() {
  localStorage.removeItem("id_user");
  window.location.href = "login.html";
}

/* ===========================================================
   DASHBOARD
   =========================================================== */
async function loadDashboard() {
  try {
    const [planning, conseils, signalements] = await Promise.all([
      fetch(`${API}/salarie/planning/${ID_SALARIE}`).then((r) => r.json()),
      fetch(`${API}/salarie/conseils/${ID_SALARIE}`).then((r) => r.json()),
      fetch(`${API}/salarie/forum/signalements`).then((r) => r.json()),
    ]);

    const forms = planning || [];
    const sigs = signalements || [];
    document.getElementById("kpi-formations").textContent = forms.length;
    document.getElementById("kpi-attente").textContent = forms.filter((e) => e.statut_validation === "En attente").length;
    document.getElementById("kpi-conseils").textContent = (conseils || []).filter((c) => c.statut === "Publie").length;
    document.getElementById("kpi-signalements").textContent = sigs.length;

    // badge sidebar + segment
    setSignalCount(sigs.length);

    const tbody = document.getElementById("dash-formations");
    const proches = forms
      .filter((e) => new Date(e.date_debut) >= new Date())
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
      .slice(0, 5);
    tbody.innerHTML = proches.length
      ? proches.map((e) => `
          <tr>
            <td><span class="strong">${escapeHtml(e.titre)}</span></td>
            <td class="muted">${fmtDate(e.date_debut)}</td>
            <td>${escapeHtml(e.format) || "—"}</td>
            <td>${badge(e.statut_validation)}</td>
          </tr>`).join("")
      : empty(4, "🌱", "Aucune formation à venir. Proposez-en une depuis « Mes formations ».");
  } catch (err) {
    console.error("loadDashboard:", err);
  }
}

function setSignalCount(n) {
  const navB = document.getElementById("nav-forum-badge");
  const segB = document.getElementById("seg-badge");
  [navB, segB].forEach((el) => {
    if (!el) return;
    if (n > 0) { el.textContent = n; el.style.display = ""; }
    else { el.style.display = "none"; }
  });
}

/* ===========================================================
   PLANNING
   =========================================================== */
async function loadPlanning() {
  const tbody = document.getElementById("planning-body");
  try {
    const list = (await fetch(`${API}/salarie/planning/${ID_SALARIE}`).then((r) => r.json())) || [];
    tbody.innerHTML = list.length
      ? list.map((e) => `
          <tr>
            <td><span class="strong">${escapeHtml(e.titre)}</span></td>
            <td class="muted">${fmtDate(e.date_debut)}</td>
            <td class="muted">${fmtDate(e.date_fin)}</td>
            <td>${e.nb_places}</td>
            <td>${escapeHtml(e.format) || "—"}</td>
            <td>${badge(e.statut_validation)}</td>
          </tr>`).join("")
      : empty(6, "📅", "Votre planning est vide pour le moment.");
  } catch (err) {
    tbody.innerHTML = empty(6, "⚠️", "Impossible de charger le planning. L'API est-elle lancée ?");
  }
}

/* ===========================================================
   FORMATIONS
   =========================================================== */
async function loadFormations() {
  const tbody = document.getElementById("formations-body");
  try {
    const list = (await fetch(`${API}/salarie/planning/${ID_SALARIE}`).then((r) => r.json())) || [];
    tbody.innerHTML = list.length
      ? list.map((e) => `
          <tr>
            <td><span class="strong">${escapeHtml(e.titre)}</span></td>
            <td class="muted">${fmtDate(e.date_debut)}</td>
            <td>${e.nb_places}</td>
            <td>${escapeHtml(e.format) || "—"}</td>
            <td>${badge(e.statut_validation)}</td>
          </tr>`).join("")
      : empty(5, "🎓", "Aucune formation. Cliquez sur « Proposer une formation » pour commencer.");
  } catch (err) {
    tbody.innerHTML = empty(5, "⚠️", "Impossible de charger les formations.");
  }
}

async function createFormation() {
  const payload = {
    titre: document.getElementById("f-titre").value.trim(),
    description: document.getElementById("f-description").value.trim(),
    date_debut: toISO(document.getElementById("f-debut").value),
    date_fin: toISO(document.getElementById("f-fin").value),
    nb_places: Number(document.getElementById("f-places").value),
    format: document.getElementById("f-format").value,
    id_salarie: ID_SALARIE,
  };
  if (!payload.titre || !payload.date_debut) {
    alert("Donnez au moins un titre et une date de début.");
    return;
  }
  try {
    const res = await fetch(`${API}/salarie/formations/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    closeModal("modal-formation");
    document.getElementById("f-titre").value = "";
    document.getElementById("f-description").value = "";
    loadFormations();
    loadDashboard();
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

/* ===========================================================
   CONSEILS
   =========================================================== */
async function loadConseils() {
  const tbody = document.getElementById("conseils-body");
  try {
    const list = (await fetch(`${API}/salarie/conseils/${ID_SALARIE}`).then((r) => r.json())) || [];
    tbody.innerHTML = list.length
      ? list.map((c) => `
          <tr>
            <td><span class="strong">${escapeHtml(c.titre)}</span></td>
            <td class="muted">${escapeHtml(c.categorie) || "—"}</td>
            <td>${badge(c.statut)}</td>
            <td class="muted">${fmtDate(c.date_publication)}</td>
            <td style="text-align:right;">
              <button class="btn btn-soft btn-sm" onclick='openConseilEdit(${JSON.stringify(c)})'>Modifier</button>
              ${c.statut !== "Publie" ? `<button class="btn btn-primary btn-sm" onclick="publishConseil(${c.id_conseil})">Publier</button>` : ""}
              <button class="btn btn-danger btn-sm" onclick="deleteConseil(${c.id_conseil})">Suppr.</button>
            </td>
          </tr>`).join("")
      : empty(5, "📝", "Pas encore de conseil. Rédigez le premier !");
  } catch (err) {
    tbody.innerHTML = empty(5, "⚠️", "Impossible de charger les conseils.");
  }
}

function openConseilCreate() {
  document.getElementById("conseil-modal-title").textContent = "Rédiger un conseil";
  document.getElementById("c-id").value = "";
  document.getElementById("c-titre").value = "";
  document.getElementById("c-categorie").value = "";
  document.getElementById("c-statut").value = "Brouillon";
  document.getElementById("c-contenu").value = "";
  document.getElementById("c-date").value = "";
  openModal("modal-conseil");
}

function openConseilEdit(c) {
  document.getElementById("conseil-modal-title").textContent = "Modifier le conseil";
  document.getElementById("c-id").value = c.id_conseil;
  document.getElementById("c-titre").value = c.titre;
  document.getElementById("c-categorie").value = c.categorie || "";
  document.getElementById("c-statut").value = c.statut;
  document.getElementById("c-contenu").value = c.contenu || "";
  if (c.date_publication) {
    const d = new Date(c.date_publication);
    if (!isNaN(d)) document.getElementById("c-date").value = d.toISOString().slice(0, 16);
  }
  openModal("modal-conseil");
}

async function saveConseil() {
  const id = document.getElementById("c-id").value;
  const payload = {
    titre: document.getElementById("c-titre").value.trim(),
    categorie: document.getElementById("c-categorie").value.trim(),
    statut: document.getElementById("c-statut").value,
    contenu: document.getElementById("c-contenu").value.trim(),
    date_publication: toISO(document.getElementById("c-date").value),
    id_salarie: ID_SALARIE,
  };
  if (!payload.titre) { alert("Le titre est obligatoire."); return; }
  try {
    const url = id ? `${API}/salarie/conseils/modify/${id}` : `${API}/salarie/conseils/add`;
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    closeModal("modal-conseil");
    loadConseils();
    loadDashboard();
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

async function publishConseil(id) {
  try {
    const res = await fetch(`${API}/salarie/conseils/publish/${id}`, { method: "PUT" });
    if (!res.ok) throw new Error(await res.text());
    loadConseils(); loadDashboard();
  } catch (err) { alert("Erreur : " + err.message); }
}

async function deleteConseil(id) {
  if (!confirm("Supprimer ce conseil ?")) return;
  try {
    const res = await fetch(`${API}/salarie/conseils/delete/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    loadConseils(); loadDashboard();
  } catch (err) { alert("Erreur : " + err.message); }
}

/* ===========================================================
   FORUM — modération
   =========================================================== */
function setSeg(active) {
  document.getElementById("seg-sujets").classList.toggle("on", active === "sujets");
  document.getElementById("seg-signal").classList.toggle("on", active === "signal");
}

function resetForumHead() {
  document.getElementById("forum-head").innerHTML =
    `<tr><th>Sujet</th><th>Auteur</th><th>Messages</th><th>Signalés</th><th>Statut</th><th style="text-align:right;">Actions</th></tr>`;
}

async function loadForumSujets() {
  setSeg("sujets");
  document.getElementById("forum-card-title").textContent = "Sujets du forum";
  document.getElementById("messages-card").style.display = "none";
  resetForumHead();
  const tbody = document.getElementById("forum-body");
  try {
    const list = (await fetch(`${API}/salarie/forum/sujets`).then((r) => r.json())) || [];
    tbody.innerHTML = list.length
      ? list.map((s) => `
          <tr>
            <td><span class="strong">${escapeHtml(s.titre)}</span></td>
            <td class="muted">${escapeHtml(s.prenom_auteur || "")} ${escapeHtml(s.nom_auteur || "")}</td>
            <td>${s.nb_messages}</td>
            <td><span class="count-pill ${s.nb_signalements > 0 ? "has" : "zero"}">${s.nb_signalements}</span></td>
            <td>${badge(s.statut)}</td>
            <td style="text-align:right;">
              <button class="btn btn-soft btn-sm" onclick="loadMessages(${s.id_sujet}, '${escapeAttr(s.titre)}')">Ouvrir</button>
              ${s.statut === "Ouvert" ? `<button class="btn btn-danger btn-sm" onclick="closeSujet(${s.id_sujet})">Fermer</button>` : ""}
            </td>
          </tr>`).join("")
      : empty(6, "💬", "Aucun sujet sur le forum pour l'instant.");
  } catch (err) {
    tbody.innerHTML = empty(6, "⚠️", "Impossible de charger les sujets.");
  }
}

async function loadSignalements() {
  setSeg("signal");
  document.getElementById("forum-card-title").textContent = "Messages signalés";
  document.getElementById("messages-card").style.display = "none";
  document.getElementById("forum-head").innerHTML =
    `<tr><th>Auteur</th><th>Message</th><th>Sujet</th><th>Statut</th><th style="text-align:right;">Actions</th></tr>`;
  const tbody = document.getElementById("forum-body");
  try {
    const list = (await fetch(`${API}/salarie/forum/signalements`).then((r) => r.json())) || [];
    setSignalCount(list.length);
    tbody.innerHTML = list.length
      ? list.map((m) => `
          <tr>
            <td class="muted">${escapeHtml(m.prenom_auteur || "")} ${escapeHtml(m.nom_auteur || "")}</td>
            <td><div class="msg-text">${escapeHtml(m.contenu)}</div></td>
            <td class="muted">#${m.id_sujet}</td>
            <td>${badge(m.statut)}</td>
            <td style="text-align:right;">
              <button class="btn btn-danger btn-sm" onclick="hideMessage(${m.id_message})">Masquer</button>
              <button class="btn btn-soft btn-sm" onclick="dismissSignalement(${m.id_message})">Ignorer</button>
            </td>
          </tr>`).join("")
      : empty(5, "✅", "Aucun signalement à traiter. Tout est sain !");
  } catch (err) {
    tbody.innerHTML = empty(5, "⚠️", "Impossible de charger les signalements.");
  }
}

async function loadMessages(idSujet, titre) {
  document.getElementById("messages-card").style.display = "block";
  document.getElementById("messages-title").textContent = "Messages — " + titre;
  const tbody = document.getElementById("messages-body");
  try {
    const list = (await fetch(`${API}/salarie/forum/sujet/${idSujet}/messages`).then((r) => r.json())) || [];
    tbody.innerHTML = list.length
      ? list.map((m) => `
          <tr>
            <td class="muted">${escapeHtml(m.prenom_auteur || "")} ${escapeHtml(m.nom_auteur || "")}</td>
            <td><div class="msg-text">${escapeHtml(m.contenu)}${m.signale ? ' <span class="badge badge-signale">signalé</span>' : ""}</div></td>
            <td>${badge(m.statut)}</td>
            <td style="text-align:right;">
              ${m.statut !== "Masque" ? `<button class="btn btn-danger btn-sm" onclick="hideMessage(${m.id_message}, ${idSujet}, '${escapeAttr(titre)}')">Masquer</button>` : ""}
              ${m.signale ? `<button class="btn btn-soft btn-sm" onclick="dismissSignalement(${m.id_message}, ${idSujet}, '${escapeAttr(titre)}')">Ignorer signalement</button>` : ""}
            </td>
          </tr>`).join("")
      : empty(4, "💬", "Ce sujet ne contient aucun message.");
    document.getElementById("messages-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    tbody.innerHTML = empty(4, "⚠️", "Impossible de charger les messages.");
  }
}

async function hideMessage(id, idSujet, titre) {
  try {
    const res = await fetch(`${API}/salarie/forum/message/hide/${id}`, { method: "PUT" });
    if (!res.ok) throw new Error(await res.text());
    refreshForum(idSujet, titre);
  } catch (err) { alert("Erreur : " + err.message); }
}

async function dismissSignalement(id, idSujet, titre) {
  try {
    const res = await fetch(`${API}/salarie/forum/message/dismiss/${id}`, { method: "PUT" });
    if (!res.ok) throw new Error(await res.text());
    refreshForum(idSujet, titre);
  } catch (err) { alert("Erreur : " + err.message); }
}

async function closeSujet(id) {
  if (!confirm("Fermer ce sujet ? Les membres ne pourront plus y répondre.")) return;
  try {
    const res = await fetch(`${API}/salarie/forum/sujet/close/${id}`, { method: "PUT" });
    if (!res.ok) throw new Error(await res.text());
    loadForumSujets();
  } catch (err) { alert("Erreur : " + err.message); }
}

function refreshForum(idSujet, titre) {
  if (idSujet !== undefined) loadMessages(idSujet, titre);
  else loadSignalements();
  loadDashboard();
}

/* ------------------ Init ------------------ */
window.addEventListener("DOMContentLoaded", () => {
  const prenom = NOM_SALARIE || ("Salarié #" + ID_SALARIE);
  document.getElementById("user-name").textContent = prenom;
  document.getElementById("user-initials").textContent = (prenom[0] || "S").toUpperCase();
  document.getElementById("hello-name").textContent = NOM_SALARIE || "cher salarié";
  loadDashboard();
});
