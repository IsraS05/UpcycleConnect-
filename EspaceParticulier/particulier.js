const API = 'http://localhost:8081'
let currentUser = null

const titles = {
  dashboard: 'Dashboard',
  annonces:  'Mes annonces',
  conteneur: 'Dépôt conteneur',
  score:     'Mon Upcycling Score',
  catalogue: 'Formations & Événements',
  planning:  'Mon planning',
  conseils:  'Espace conseils',
  profil:    'Mon profil',
  forum:     'Forum',
}

// ── MULTILINGUE (i18n) ──
// Les traductions viennent de la table dictionnaire via l'API.
// Ajouter une langue = insérer des lignes en base (aucun code à modifier).
let I18N = {}
function tr(key, fallback) { return I18N[key] || fallback || key }

async function setLang(lang) {
  localStorage.setItem('uc_lang', lang)
  try {
    I18N = await fetch(`${API}/dictionnaire/${lang}`).then(r => r.json()) || {}
  } catch { I18N = {} }
  applyI18n()
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n
    if (I18N[k]) el.textContent = I18N[k]
  })
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.dataset.i18nPh
    if (I18N[k]) el.setAttribute('placeholder', I18N[k])
  })
  // titre de la barre du haut selon la page active
  const active = document.querySelector('.screen.active')
  if (active) {
    const page = active.id.replace('screen-', '')
    document.getElementById('page-title').textContent = tr('title.' + page, titles[page] || page)
  }
  const sel = document.getElementById('lang-select')
  if (sel) sel.value = localStorage.getItem('uc_lang') || 'fr'
  // si on est sur le planning, redessiner le calendrier dans la bonne langue
  if (document.getElementById('screen-planning')?.classList.contains('active') && document.getElementById('calendar')) {
    renderCalendar()
  }
}

// TUTORIEL FIRSTLOGIN
const tutoSteps = [
  { titre: 'Bienvenue sur UpcycleConnect 👋', texte: 'Voici un petit tour de votre espace particulier, ça prend 30 secondes.' },
  { titre: 'Vos annonces', texte: 'Déposez des objets à donner ou à vendre depuis « Mes annonces ». Elles sont validées par notre équipe avant publication.' },
  { titre: 'Dépôt en conteneur', texte: 'Demandez à déposer un objet dans un conteneur : vous recevez un code d\'ouverture une fois la demande validée.' },
  { titre: 'Formations & événements', texte: 'Inscrivez-vous aux ateliers depuis le catalogue, et retrouvez-les dans votre planning.' },
  { titre: 'Votre Upcycling Score', texte: 'Chaque contribution fait grimper votre score et mesure votre impact écologique. À vous de jouer !' },
]
let tutoIndex = 0

function startTuto() {
  tutoIndex = 0
  document.getElementById('tuto-overlay').style.display = 'flex'
  renderTuto()
}
function renderTuto() {
  const s = tutoSteps[tutoIndex]
  document.getElementById('tuto-content').innerHTML = `<h3>${s.titre}</h3><p>${s.texte}</p>`
  document.getElementById('tuto-dots').innerHTML = tutoSteps.map((_, i) => `<span class="${i === tutoIndex ? 'on' : ''}"></span>`).join('')
  document.getElementById('tuto-prev').style.visibility = tutoIndex === 0 ? 'hidden' : 'visible'
  document.getElementById('tuto-next').textContent = tutoIndex === tutoSteps.length - 1 ? 'Terminer' : 'Suivant'
}
function tutoNext() {
  if (tutoIndex < tutoSteps.length - 1) { tutoIndex++; renderTuto() } else finishTuto()
}
function tutoPrev() { if (tutoIndex > 0) { tutoIndex--; renderTuto() } }
function tutoSkip() { finishTuto() }
async function finishTuto() {
  document.getElementById('tuto-overlay').style.display = 'none'
  try { await fetch(`${API}/particulier/tutoriel/${currentUser.id_user}`, { method: 'PUT' }) } catch {}
  currentUser.tutoriel_vu = true
  saveSession(currentUser)
}

// SESSION
function saveSession(u) { localStorage.setItem('uc_user', JSON.stringify(u)) }

function loadSession() {
  const s = localStorage.getItem('uc_user')
  if (s) { currentUser = JSON.parse(s); showApp() }
}

// LOGIN / INSCRIPTION
function switchTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('tab-connexion').style.display   = tab === 'connexion' ? '' : 'none'
  document.getElementById('tab-inscription').style.display = tab === 'inscription' ? '' : 'none'
  event.target.classList.add('active')
}

async function login() {
  const email = document.getElementById('login-email').value.trim()
  const mdp   = document.getElementById('login-mdp').value
  if (!email || !mdp) { toast('Remplissez tous les champs'); return }
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mot_de_passe: mdp })
    })
    if (res.ok) {
      currentUser = await res.json()
      saveSession(currentUser)
      showApp()
    } else {
      toast('Email ou mot de passe incorrect')
    }
  } catch { toast('Erreur de connexion') }
}

async function register() {
  const nom    = document.getElementById('reg-nom').value.trim()
  const prenom = document.getElementById('reg-prenom').value.trim()
  const email  = document.getElementById('reg-email').value.trim()
  const mdp    = document.getElementById('reg-mdp').value
  if (!nom || !prenom || !email || !mdp) { toast('Remplissez tous les champs'); return }
  if (mdp.length < 6) { toast('Mot de passe trop court (6 car. min)'); return }
  try {
    const res = await fetch(`${API}/admin/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, email, mot_de_passe: mdp, role: 'Particulier' })
    })
    if (res.ok) { toast('Compte créé ! Connectez-vous.'); switchTab('connexion') }
    else { toast('Erreur : ' + await res.text()) }
  } catch { toast('Erreur serveur') }
}

function showApp() {
  document.getElementById('login-page').style.display = 'none'
  document.getElementById('app-page').style.display   = 'flex'
  document.getElementById('user-name').textContent    = currentUser.prenom + ' ' + currentUser.nom
  resetNav()
  loadDashboard()
  setLang(localStorage.getItem('uc_lang') || 'fr')
  if (!currentUser.tutoriel_vu) startTuto()
}

function resetNav() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-dashboard').classList.add('active')
  document.getElementById('page-title').textContent = 'Dashboard'
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  document.querySelector('.sidebar nav a').classList.add('active')
}

function logout() {
  currentUser = null
  localStorage.removeItem('uc_user')
  const ids = ['dash-mes-annonces','dash-events-list','liste-annonces',
    'liste-evenements','liste-planning','mes-depots','user-name']
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '' })
  ;['dash-annonces','dash-score','dash-events','score-val','score-kg','score-objets']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0' })
  document.getElementById('login-email').value = ''
  document.getElementById('login-mdp').value   = ''
  resetNav()
  document.getElementById('login-page').style.display = 'flex'
  document.getElementById('app-page').style.display   = 'none'
}

// NAVIGATION
function go(page, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + page).classList.add('active')
  document.getElementById('page-title').textContent = tr('title.' + page, titles[page] || page)
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  if (el) el.classList.add('active')

  if (page === 'dashboard') loadDashboard()
  if (page === 'annonces')  loadMesAnnonces()
  if (page === 'catalogue') loadEvenements()
  if (page === 'conteneur') { loadConteneurs(); loadMesDepots() }
  if (page === 'score')     loadScore()
  if (page === 'planning')  loadPlanning()
  if (page === 'conseils')  loadConseils()
  if (page === 'forum')     loadForum()
  if (page === 'profil')    loadProfil()
}

// DASHBOARD
async function loadDashboard() {
  try {
    const [annonces, evenements] = await Promise.all([
      fetch(`${API}/admin/annonces`).then(r => r.json()),
      fetch(`${API}/admin/evenements`).then(r => r.json()),
    ])
    const mes = (annonces || []).filter(a => String(a.id_user) === String(currentUser.id_user))
    document.getElementById('dash-annonces').textContent = mes.length
    document.getElementById('dash-events').textContent   = (evenements || []).filter(e => e.statut_validation === 'Valide').length

    // Score rapide
    const valides = mes.filter(a => a.statut_validation === 'Valide')
    document.getElementById('dash-score').textContent = calcScore(valides.length, 0)

    // Mes annonces
    const c1 = document.getElementById('dash-mes-annonces')
    c1.innerHTML = mes.slice(0, 3).map(a => annonceCard(a)).join('') || '<div class="placeholder">Aucune annonce</div>'

    // Prochains events
    const c2 = document.getElementById('dash-events-list')
    const valEvs = (evenements || []).filter(e => e.statut_validation === 'Valide')
    c2.innerHTML = valEvs.slice(0, 3).map(e => planningItem(e)).join('') || '<div class="placeholder">Aucun événement</div>'
  } catch (e) { console.error(e) }
}

// MES ANNONCES
async function loadCategories() {
  try {
    const cats = await fetch(`${API}/admin/categories`).then(r => r.json())
    const sel = document.getElementById('ann-cat')
    sel.innerHTML = (cats || []).map(c => `<option value="${c.id_categorie}">${c.libelle}</option>`).join('')
  } catch { /* catégories indisponibles */ }
}

let mesAnnoncesCache = []
async function loadMesAnnonces() {
  loadCategories()
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    mesAnnoncesCache = (annonces || []).filter(a => String(a.id_user) === String(currentUser.id_user))
    const filtre = document.getElementById('ann-filtre').value
    let mes = mesAnnoncesCache
    if (filtre) mes = mes.filter(a => a.statut_validation === filtre)
    document.getElementById('liste-annonces').innerHTML =
      mes.length ? mes.map(a => annonceCardFull(a)).join('') : '<div class="placeholder">Aucune annonce</div>'
  } catch { toast('Erreur chargement annonces') }
}

function annonceCard(a) {
  return `<div class="annonce-card">
    <div class="info">
      <div class="title">${a.titre}</div>
      <div class="meta">${a.type} · ${a.statut_validation}</div>
    </div>
    <span class="badge ${badgeClass(a.statut_validation)}">${a.statut_validation}</span>
  </div>`
}

function annonceCardFull(a) {
  return `<div class="annonce-card">
    <div class="info">
      <div class="title">${a.titre}</div>
      <div class="meta">${a.type} · ${a.categorie || ''} · ${a.ville || ''}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="badge ${badgeClass(a.statut_validation)}">${a.statut_validation}</span>
      <button class="btn btn-sm" onclick="openEditAnnonce(${a.id_annonce})">Modifier</button>
      <button class="btn btn-sm btn-red" onclick="deleteAnnonce(${a.id_annonce})">Supprimer</button>
    </div>
  </div>`
}

function escape(s) { return (s || '').replace(/'/g, "\\'") }
function badgeClass(s) { return s === 'Valide' ? 'badge-ok' : s === 'Refuse' ? 'badge-off' : 'badge-wait' }

async function createAnnonce() {
  const ville = document.getElementById('ann-ville').value
  const cp    = document.getElementById('ann-cp').value
  const body  = {
    titre:           document.getElementById('ann-titre').value,
    description:     document.getElementById('ann-desc').value,
    type:            document.getElementById('ann-type').value,
    prix:            parseFloat(document.getElementById('ann-prix').value) || 0,
    ville:           ville || null,
    code_postal:     cp || null,
    projet_potentiel: null,
    id_user:         currentUser.id_user,
    id_categorie:    parseInt(document.getElementById('ann-cat').value) || 1,
  }
  if (!body.titre.trim()) { toast('Le titre est obligatoire'); return }
  try {
    const res = await fetch(`${API}/particulier/annonces/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    if (res.ok) { toast('Annonce soumise !'); closeModal('modal-annonce', null); loadMesAnnonces() }
    else toast('Erreur : ' + await res.text())
  } catch { toast('Erreur serveur') }
}

// Ouvre le formulaire de création en le vidant (sinon il garde les valeurs précédentes)
function newAnnonce() {
  ['ann-titre','ann-desc','ann-ville','ann-cp'].forEach(id => { document.getElementById(id).value = '' })
  document.getElementById('ann-prix').value = '0'
  document.getElementById('ann-type').selectedIndex = 0
  openModal('modal-annonce')
}

function openEditAnnonce(id) {
  const a = mesAnnoncesCache.find(x => x.id_annonce === id)
  if (!a) return
  document.getElementById('edit-ann-titre').value = a.titre || ''
  document.getElementById('edit-ann-desc').value  = a.description || ''
  document.getElementById('edit-ann-type').value  = a.type
  document.getElementById('edit-ann-prix').value  = a.prix
  document.getElementById('edit-ann-save').onclick = () => updateAnnonce(id)
  openModal('modal-edit-annonce')
}

async function updateAnnonce(id) {
  const body = {
    titre:       document.getElementById('edit-ann-titre').value,
    description: document.getElementById('edit-ann-desc').value,
    type:        document.getElementById('edit-ann-type').value,
    prix:        parseFloat(document.getElementById('edit-ann-prix').value) || 0,
  }
  try {
    const res = await fetch(`${API}/particulier/annonces/modify/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    if (res.ok) { toast('Annonce modifiée'); closeModal('modal-edit-annonce', null); loadMesAnnonces() }
    else toast('Erreur modification')
  } catch { toast('Erreur serveur') }
}

async function deleteAnnonce(id) {
  if (!confirm('Supprimer cette annonce ?')) return
  try {
    await fetch(`${API}/particulier/annonces/delete/${id}`, { method: 'DELETE' })
    toast('Annonce supprimée')
    loadMesAnnonces()
  } catch { toast('Erreur suppression') }
}

// evenements
async function loadEvenements() {
  try {
    const [events, inscriptions] = await Promise.all([
      fetch(`${API}/admin/evenements`).then(r => r.json()),
      fetch(`${API}/particulier/planning/${currentUser.id_user}`).then(r => r.json()),
    ])
    const inscrits = new Set((inscriptions || []).map(e => e.id_event))
    let valides = (events || []).filter(e => e.statut_validation === 'Valide')
    const dateMin = document.getElementById('ev-date')?.value
    if (dateMin) valides = valides.filter(e => (e.date_debut || '').slice(0, 10) >= dateMin)
    const fmt = document.getElementById('ev-format')?.value
    if (fmt) valides = valides.filter(e => e.format === fmt)
    const q = (document.getElementById('ev-search')?.value || '').toLowerCase()
    if (q) valides = valides.filter(e => (e.titre || '').toLowerCase().includes(q))
    document.getElementById('liste-evenements').innerHTML =
      valides.length ? valides.map(e => `
        <div class="event-card">
          <h4>${e.titre}</h4>
          <div class="meta">${new Date(e.date_debut).toLocaleDateString('fr-FR')} · ${e.format} · ${e.nb_places} places</div>
          <p style="font-size:12px;color:#666;margin:6px 0">${e.description || ''}</p>
          ${inscrits.has(e.id_event)
            ? `<button class="btn btn-sm" disabled>${tr('btn.inscrit', '✓ Inscrit')}</button>`
            : `<button class="btn btn-dark btn-sm" onclick="inscrire(${e.id_event}, this)">${tr('btn.sinscrire', "S'inscrire")}</button>`}
        </div>
      `).join('') : '<div class="placeholder">Aucun événement disponible</div>'
  } catch { toast('Erreur chargement événements') }
}

async function inscrire(idEvent, btn) {
  try {
    const res = await fetch(`${API}/particulier/inscription/${idEvent}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_user: currentUser.id_user })
    })
    if (res.ok) { toast('Inscription enregistrée !'); btn.textContent = tr('btn.inscrit', '✓ Inscrit'); btn.disabled = true; btn.classList.remove('btn-dark') }
    else toast(await res.text())
  } catch { toast('Erreur inscription') }
}

// PLANNING
let planningCache = []
let calDate = new Date()

async function loadPlanning() {
  try {
    planningCache = await fetch(`${API}/particulier/planning/${currentUser.id_user}`).then(r => r.json()) || []
  } catch { planningCache = []; toast('Erreur planning') }
  renderCalendar()
  renderPlanningList()
}

function calPrev() { calDate.setMonth(calDate.getMonth() - 1); renderCalendar() }
function calNext() { calDate.setMonth(calDate.getMonth() + 1); renderCalendar() }

function renderCalendar() {
  const el = document.getElementById('calendar')
  if (!el) return
  const y = calDate.getFullYear(), m = calDate.getMonth()
  const lang = localStorage.getItem('uc_lang') || 'fr'
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'
  document.getElementById('cal-title').textContent =
    calDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const dows = lang === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const offset = (new Date(y, m, 1).getDay() + 6) % 7   // lundi = 0
  const nbDays = new Date(y, m + 1, 0).getDate()
  // événements de ce mois regroupés par jour
  const byDay = {}
  ;(planningCache || []).forEach(e => {
    const d = new Date(e.date_debut)
    if (d.getFullYear() === y && d.getMonth() === m) {
      (byDay[d.getDate()] = byDay[d.getDate()] || []).push(e.titre)
    }
  })
  let cells = dows.map(d => `<div class="cal-dow">${d}</div>`).join('')
  for (let i = 0; i < offset; i++) cells += '<div class="cal-cell cal-empty"></div>'
  for (let day = 1; day <= nbDays; day++) {
    const evs = byDay[day] || []
    cells += `<div class="cal-cell ${evs.length ? 'has' : ''}">
      <div class="d">${day}</div>
      ${evs.map(t => `<div class="cal-ev" title="${t}">${t}</div>`).join('')}
    </div>`
  }
  el.innerHTML = `<div class="cal-grid">${cells}</div>`
}

function renderPlanningList() {
  const events = planningCache || []
  document.getElementById('liste-planning').innerHTML =
    events.length ? events.map(e => `
      <div class="planning-item">
        ${planningDate(e.date_debut)}
        <div class="planning-info">
          <div class="name">${e.titre}</div>
          <div class="sub">${e.format} · ${e.prenom_salarie} ${e.nom_salarie}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge badge-ok">Inscrit</span>
          <button class="btn btn-sm btn-red" onclick="annulerInscription(${e.id_event})">Annuler</button>
        </div>
      </div>
    `).join('') : '<div class="placeholder">Aucune inscription</div>'
}

async function annulerInscription(idEvent) {
  if (!confirm('Annuler cette inscription ?')) return
  try {
    const res = await fetch(`${API}/particulier/inscription/${idEvent}/${currentUser.id_user}`, { method: 'DELETE' })
    if (res.ok) { toast('Inscription annulée'); loadPlanning() }
    else toast('Erreur annulation')
  } catch { toast('Erreur serveur') }
}

// dépot conteneur
async function loadConteneurs() {
  try {
    const conteneurs = await fetch(`${API}/admin/conteneurs`).then(r => r.json())
    const sel = document.getElementById('depot-conteneur')
    sel.innerHTML = (conteneurs || []).map(c => `<option value="${c.id_box}">${c.localisation} (${c.etat})</option>`).join('')
  } catch { console.error('loadConteneurs') }
}

async function loadMesDepots() {
  try {
    const depots = await fetch(`${API}/particulier/depots/${currentUser.id_user}`).then(r => r.json())
    const c = document.getElementById('mes-depots')
    if (!c) return
    c.innerHTML = (depots || []).length ? (depots || []).map(d => `
      <div class="annonce-card">
        <div class="info">
          <div class="title">Dépôt #${d.id_depot} — Conteneur ${d.id_box}</div>
          <div class="meta">
            ${d.statut === 'Valide' ? `Code d'ouverture : <strong>${d.code_ouverture}</strong> · Code-barres : <strong>${d.code_barres_pro}</strong>` : 'En attente de validation'}
          </div>
        </div>
        <span class="badge ${d.statut === 'Valide' ? 'badge-ok' : 'badge-wait'}">${d.statut}</span>
      </div>
    `).join('') : '<div class="placeholder">Aucune demande</div>'
  } catch { console.error('loadMesDepots') }
}

async function demandeDepot() {
  const titre = document.getElementById('depot-titre').value
  if (!titre) { toast('Remplissez le titre'); return }
  const idBox = parseInt(document.getElementById('depot-conteneur').value)
  if (!idBox) { toast('Aucun conteneur disponible'); return }
  try {
    const res = await fetch(`${API}/particulier/depot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code_ouverture:  Math.random().toString(36).substring(2,8).toUpperCase(),
        code_barres_pro: Math.random().toString(36).substring(2,10).toUpperCase(),
        id_user: currentUser.id_user,
        id_box:  idBox,
      })
    })
    if (res.ok) {
      toast('Demande envoyée !')
      document.getElementById('depot-titre').value = ''
      document.getElementById('depot-desc').value  = ''
      loadMesDepots()
    } else toast('Erreur demande')
  } catch { toast('Erreur serveur') }
}

// SCORE
function calcScore(nbValides, nbFormations) {
  return nbValides * 20 + nbFormations * 20
}

function getLevel(score) {
  if (score >= 1000) return { label: 'Platine 🏆', color: '#5c6bc0' }
  if (score >= 500)  return { label: 'Or 🥇',     color: '#f9a825' }
  if (score >= 100)  return { label: 'Argent 🥈', color: '#9e9e9e' }
  return { label: 'Bronze 🥉', color: '#a1663b' }
}

async function loadScore() {
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    const mes = (annonces || []).filter(a => String(a.id_user) === String(currentUser.id_user))
    const valides = mes.filter(a => a.statut_validation === 'Valide')
    const score = calcScore(valides.length, 0)
    const level = getLevel(score)

    document.getElementById('score-val').textContent    = score
    document.getElementById('dash-score').textContent   = score
    document.getElementById('score-objets').textContent = valides.length
    document.getElementById('score-kg').textContent     = (valides.length * 8).toFixed(1)

    const lvlEl = document.getElementById('score-level')
    if (lvlEl) { lvlEl.textContent = level.label; lvlEl.style.color = level.color }

    // Détail contributions
    const det = document.getElementById('score-detail')
    if (det) det.innerHTML = `
      <div class="planning-item"><div class="planning-info"><div class="name">Annonces validées</div><div class="sub">+20 pts chacune</div></div><span class="badge badge-ok">${valides.length} × 20 = ${valides.length*20} pts</span></div>
      <div class="planning-item"><div class="planning-info"><div class="name">Formations suivies</div><div class="sub">+20 pts chacune</div></div><span class="badge badge-ok">0 × 20 = 0 pts</span></div>
    `
  } catch { console.error('loadScore') }
}

// CONSEILS
let conseilsCache = []
async function loadConseils() {
  try {
    conseilsCache = await fetch(`${API}/admin/articles`).then(r => r.json()) || []
  } catch { conseilsCache = [] }
  renderConseils()
}

function renderConseils() {
  const c = document.getElementById('liste-conseils')
  if (!c) return
  let list = conseilsCache || []
  const t = document.getElementById('conseil-type')?.value
  if (t) list = list.filter(a => a.type === t)
  const q = (document.getElementById('conseil-search')?.value || '').toLowerCase()
  if (q) list = list.filter(a => (a.titre || '').toLowerCase().includes(q))
  c.innerHTML = list.length ? list.map(a => `
    <div class="event-card" style="cursor:pointer" onclick="openArticle(${a.id_article})">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <h4>${a.titre}</h4>
        <span class="badge ${a.type === 'Conseil' ? 'badge-ok' : 'badge-wait'}">${a.type}</span>
      </div>
      <div class="meta">${a.nom} ${a.prenom}</div>
      <p style="font-size:12px;color:#666;margin-top:6px">${(a.contenu || '').substring(0,120)}...</p>
    </div>
  `).join('') : '<div class="placeholder">Aucun article disponible</div>'
}

function openArticle(id) {
  const a = (conseilsCache || []).find(x => x.id_article === id)
  if (!a) return
  document.getElementById('article-titre').textContent   = a.titre
  document.getElementById('article-type').textContent    = a.type
  document.getElementById('article-auteur').textContent  = `${tr('article.par', 'Par')} ${a.nom} ${a.prenom}`
  document.getElementById('article-contenu').textContent = a.contenu || ''
  openModal('modal-article')
}

// FORUM
let topicsCache = []
let currentTopicId = null

async function loadForum() {
  document.getElementById('forum-thread').style.display = 'none'
  document.getElementById('forum-topics').style.display = ''
  try {
    topicsCache = await fetch(`${API}/forum/topics`).then(r => r.json()) || []
  } catch { topicsCache = []; toast('Erreur chargement forum') }
  document.getElementById('forum-topics').innerHTML = topicsCache.length ? topicsCache.map(t => `
    <div class="annonce-card" style="cursor:pointer" onclick="openTopic(${t.id_topic})">
      <div class="info">
        <div class="title">${t.titre}</div>
        <div class="meta">${t.prenom} ${t.nom} · ${t.nb_messages} message(s)</div>
      </div>
      <span class="badge badge-wait">›</span>
    </div>
  `).join('') : '<div class="placeholder">Aucun sujet pour le moment</div>'
}

async function createTopic() {
  const titre = document.getElementById('topic-titre').value.trim()
  if (!titre) { toast('Indiquez un titre'); return }
  try {
    const res = await fetch(`${API}/forum/topics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre, id_user: currentUser.id_user })
    })
    if (res.ok) { toast('Sujet créé !'); document.getElementById('topic-titre').value = ''; closeModal('modal-topic', null); loadForum() }
    else toast('Erreur création')
  } catch { toast('Erreur serveur') }
}

function openTopic(id) {
  currentTopicId = id
  const t = topicsCache.find(x => x.id_topic === id)
  document.getElementById('forum-topics').style.display = 'none'
  document.getElementById('forum-thread').style.display = ''
  document.getElementById('forum-thread-title').textContent = t ? t.titre : ''
  loadMessages()
}

async function loadMessages() {
  try {
    const msgs = await fetch(`${API}/forum/topics/${currentTopicId}/messages`).then(r => r.json())
    document.getElementById('forum-messages').innerHTML = (msgs || []).length ? (msgs || []).map(m => `
      <div class="annonce-card">
        <div class="info">
          <div class="meta"><strong>${m.prenom} ${m.nom}</strong></div>
          <div style="margin-top:4px">${m.contenu}</div>
        </div>
      </div>
    `).join('') : '<div class="placeholder">Aucun message, soyez le premier !</div>'
  } catch { toast('Erreur messages') }
}

async function postMessage() {
  const contenu = document.getElementById('forum-msg').value.trim()
  if (!contenu) { toast('Écrivez un message'); return }
  try {
    const res = await fetch(`${API}/forum/topics/${currentTopicId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenu, id_user: currentUser.id_user })
    })
    if (res.ok) { document.getElementById('forum-msg').value = ''; loadMessages() }
    else toast('Erreur envoi')
  } catch { toast('Erreur serveur') }
}

function closeTopic() { loadForum() }

// PROFIL
function loadProfil() {
  if (!currentUser) return
  document.getElementById('profil-nom').value    = currentUser.nom || ''
  document.getElementById('profil-prenom').value = currentUser.prenom || ''
  document.getElementById('profil-email').value  = currentUser.email || ''
}

async function saveProfil() {
  const nom    = document.getElementById('profil-nom').value.trim()
  const prenom = document.getElementById('profil-prenom').value.trim()
  const email  = document.getElementById('profil-email').value.trim()
  try {
    const res = await fetch(`${API}/admin/users/modify/${currentUser.id_user}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentUser, nom, prenom, email })
    })
    if (res.ok) {
      currentUser = { ...currentUser, nom, prenom, email }
      saveSession(currentUser)
      document.getElementById('user-name').textContent = prenom + ' ' + nom
      toast('Profil mis à jour')
    } else toast('Erreur mise à jour')
  } catch { toast('Erreur serveur') }
}

async function changePassword() {
  const ancien = document.getElementById('profil-ancien-mdp').value
  const nouveau = document.getElementById('profil-nouveau-mdp').value
  if (!ancien || !nouveau) { toast('Remplissez les deux champs'); return }
  if (nouveau.length < 6) { toast('Mot de passe trop court'); return }
  try {
    const res = await fetch(`${API}/particulier/password/${currentUser.id_user}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ancien_mdp: ancien, nouveau_mdp: nouveau })
    })
    if (res.ok) {
      toast('Mot de passe modifié')
      document.getElementById('profil-ancien-mdp').value = ''
      document.getElementById('profil-nouveau-mdp').value = ''
    } else toast(await res.text())
  } catch { toast('Erreur serveur') }
}

async function deleteAccount() {
  if (!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
  try {
    await fetch(`${API}/admin/users/delete/${currentUser.id_user}`, { method: 'DELETE' })
    toast('Compte supprimé')
    setTimeout(logout, 1000)
  } catch { toast('Erreur suppression') }
}

// HELPERS
function planningItem(e) {
  return `<div class="planning-item">
    ${planningDate(e.date_debut)}
    <div class="planning-info">
      <div class="name">${e.titre}</div>
      <div class="sub">${e.format} · ${e.nb_places} places</div>
    </div>
  </div>`
}

function planningDate(d) {
  const dt = new Date(d)
  return `<div class="planning-date">
    <div class="day">${dt.getDate()}</div>
    <div class="month">${dt.toLocaleString('fr-FR',{month:'short'})}</div>
  </div>`
}

function openModal(id)  { document.getElementById(id).classList.add('open') }
function closeModal(id, e) {
  if (!e || e.target.id === id) document.getElementById(id).classList.remove('open')
}

function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.style.display = 'block'
  setTimeout(() => t.style.display = 'none', 2500)
}

window.addEventListener('load', loadSession)
