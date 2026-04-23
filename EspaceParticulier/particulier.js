const API = 'http://localhost:8081'

let currentUser = null

const titles = {
  dashboard: 'Dashboard',
  annonces:  'Mes annonces',
  conteneur: 'Depot conteneur',
  score:     'Upcycling Score',
  catalogue: 'Formations & Evenements',
  planning:  'Mon planning',
}

//SESSION
function saveSession(user) {
  localStorage.setItem('uc_user', JSON.stringify(user))
}

function loadSession() {
  const saved = localStorage.getItem('uc_user')
  if (saved) {
    currentUser = JSON.parse(saved)
    showApp()
  }
}

//LOGIN
function switchTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('tab-connexion').style.display   = tab === 'connexion' ? '' : 'none'
  document.getElementById('tab-inscription').style.display = tab === 'inscription' ? '' : 'none'
  event.target.classList.add('active')
}

async function login() {
  const email = document.getElementById('login-email').value
  const mdp   = document.getElementById('login-mdp').value

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
  } catch (e) {
    toast('Erreur de connexion')
  }
}

async function register() {
  const nom    = document.getElementById('reg-nom').value
  const prenom = document.getElementById('reg-prenom').value
  const email  = document.getElementById('reg-email').value
  const mdp    = document.getElementById('reg-mdp').value

  try {
    const res = await fetch(`${API}/admin/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, email, mot_de_passe: mdp, role: 'Particulier' })
    })
    if (res.ok) {
      toast('Compte créé ! Connectez-vous.')
      switchTab('connexion')
    } else {
      const err = await res.text()
      toast('Erreur : ' + err)
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

function logout() {
  currentUser = null
  localStorage.removeItem('uc_user')

  // Vider les champs login
  document.getElementById('login-email').value = ''
  document.getElementById('login-mdp').value   = ''

  // Remettre le dashboard actif
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-dashboard').classList.add('active')
  document.getElementById('page-title').textContent = 'Dashboard'
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  document.querySelector('.sidebar nav a').classList.add('active')

  // Vider tout le contenu
  document.getElementById('dash-mes-annonces').innerHTML = '<div class="placeholder">Chargement...</div>'
  document.getElementById('dash-events-list').innerHTML  = '<div class="placeholder">Chargement...</div>'
  document.getElementById('liste-annonces').innerHTML    = '<div class="placeholder">Chargement...</div>'
  document.getElementById('liste-evenements').innerHTML  = '<div class="placeholder">Chargement...</div>'
  document.getElementById('liste-planning').innerHTML    = '<div class="placeholder">Aucune inscription</div>'
  document.getElementById('mes-depots') && (document.getElementById('mes-depots').innerHTML = '<div class="placeholder">Chargement...</div>')
  document.getElementById('user-name').textContent      = '—'
  document.getElementById('dash-annonces').textContent  = '0'
  document.getElementById('dash-score').textContent     = '0'
  document.getElementById('dash-events').textContent    = '0'
  document.getElementById('score-val').textContent      = '0'
  document.getElementById('score-kg').textContent       = '0'
  document.getElementById('score-objets').textContent   = '0'

  document.getElementById('login-page').style.display = 'flex'
  document.getElementById('app-page').style.display   = 'none'
}

function showApp() {
  document.getElementById('login-page').style.display = 'none'
  document.getElementById('app-page').style.display   = 'flex'
  document.getElementById('user-name').textContent    = currentUser.prenom + ' ' + currentUser.nom

  // Remettre sur dashboard à chaque connexion
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-dashboard').classList.add('active')
  document.getElementById('page-title').textContent = 'Dashboard'
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  document.querySelector('.sidebar nav a').classList.add('active')

  loadDashboard()
}

// NAVIGATION 
function go(page, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + page).classList.add('active')
  document.getElementById('page-title').textContent = titles[page] || page
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  if (el) el.classList.add('active')

  if (page === 'dashboard') loadDashboard()
  if (page === 'annonces')  loadMesAnnonces()
  if (page === 'catalogue') loadEvenements()
  if (page === 'conteneur'){
    loadConteneurs()
    loadMesDepots()
  } 
  if (page === 'score')     loadScore()
  if (page === 'planning')  loadPlanning()
}

// DASHBOARD 
async function loadDashboard() {
  try {
    const [annonces, evenements] = await Promise.all([
      fetch(`${API}/admin/annonces`).then(r => r.json()),
      fetch(`${API}/admin/evenements`).then(r => r.json()),
    ])

    const mesAnnonces = (annonces || []).filter(a => a.id_user === currentUser.id_user)
    document.getElementById('dash-annonces').textContent = mesAnnonces.length
    document.getElementById('dash-events').textContent   = (evenements || []).filter(e => e.statut_validation === 'Valide').length

    // Mes annonces
    const dashAnn = document.getElementById('dash-mes-annonces')
    dashAnn.innerHTML = mesAnnonces.slice(0, 3).map(a => `
      <div class="annonce-card">
        <div class="info">
          <div class="title">${a.titre}</div>
          <div class="meta">${a.type} · ${a.statut_validation}</div>
        </div>
        <span class="badge ${a.statut_validation === 'Valide' ? 'badge-ok' : 'badge-wait'}">${a.statut_validation}</span>
      </div>
    `).join('') || '<div class="placeholder">Aucune annonce</div>'

    // Prochains events
    const dashEv = document.getElementById('dash-events-list')
    const validEvents = (evenements || []).filter(e => e.statut_validation === 'Valide')
    dashEv.innerHTML = validEvents.slice(0, 3).map(e => `
      <div class="planning-item">
        <div class="planning-date">
          <div class="day">${new Date(e.date_debut).getDate()}</div>
          <div class="month">${new Date(e.date_debut).toLocaleString('fr-FR', {month:'short'})}</div>
        </div>
        <div class="planning-info">
          <div class="name">${e.titre}</div>
          <div class="sub">${e.format} · ${e.nb_places} places</div>
        </div>
      </div>
    `).join('') || '<div class="placeholder">Aucun événement</div>'

  } catch (e) {
    console.error(e)
  }
}

//MES ANNONCES 
async function loadMesAnnonces() {
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    const mesAnnonces = (annonces || []).filter(a => a.id_user === currentUser.id_user)
    const container = document.getElementById('liste-annonces')

    container.innerHTML = mesAnnonces.length ? mesAnnonces.map(a => `
      <div class="annonce-card">
        <div class="info">
          <div class="title">${a.titre}</div>
          <div class="meta">${a.type} · ${a.categorie} · ${a.ville || ''}</div>
        </div>
        <span class="badge ${a.statut_validation === 'Valide' ? 'badge-ok' : 'badge-wait'}">${a.statut_validation}</span>
      </div>
    `).join('') : '<div class="placeholder">Aucune annonce pour le moment</div>'
  } catch (e) {
    toast('Erreur chargement annonces')
  }
}

async function createAnnonce() {
  const ville = document.getElementById('ann-ville').value
  const cp    = document.getElementById('ann-cp').value

  const body = {
    titre:           document.getElementById('ann-titre').value,
    description:     document.getElementById('ann-desc').value,
    type:            document.getElementById('ann-type').value,
    prix:            parseFloat(document.getElementById('ann-prix').value) || 0,
    ville:           ville || null,
    code_postal:     cp || null,
    projet_potentiel: null,
    id_user:         currentUser.id_user,
    id_categorie:    1,
  }

  try {
    const res = await fetch(`${API}/particulier/annonces/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      toast('Annonce soumise, en attente de validation')
      closeModal('modal-annonce', null)
      loadMesAnnonces()
    } else {
      const err = await res.text()
      toast('Erreur : ' + err)
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

//EVENEMENTS
async function loadEvenements() {
  try {
    const events = await fetch(`${API}/admin/evenements`).then(r => r.json())
    const container = document.getElementById('liste-evenements')

    const valides = (events || []).filter(e => e.statut_validation === 'Valide')
    container.innerHTML = valides.length ? valides.map(e => `
      <div class="event-card">
        <h4>${e.titre}</h4>
        <div class="meta">
          ${new Date(e.date_debut).toLocaleDateString('fr-FR')} · ${e.format} · ${e.nb_places} places
        </div>
        <button class="btn btn-dark btn-sm" onclick="inscrire(${e.id_event})">S'inscrire</button>
      </div>
    `).join('') : '<div class="placeholder">Aucun événement disponible</div>'
  } catch (e) {
    toast('Erreur chargement événements')
  }
}

async function inscrire(idEvent) {
  try {
    const res = await fetch(`${API}/particulier/inscription/${idEvent}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_user: currentUser.id_user })
    })
    if (res.ok) {
      toast('Inscription enregistrée !')
    } else {
      const err = await res.text()
      toast(err)
    }
  } catch (e) {
    toast('Erreur inscription')
  }
}

//PLANNING 
async function loadPlanning() {
  try {
    const events = await fetch(`${API}/particulier/planning/${currentUser.id_user}`).then(r => r.json())
    const container = document.getElementById('liste-planning')

    container.innerHTML = (events || []).length ? (events || []).map(e => `
      <div class="planning-item">
        <div class="planning-date">
          <div class="day">${new Date(e.date_debut).getDate()}</div>
          <div class="month">${new Date(e.date_debut).toLocaleString('fr-FR', {month:'short'})}</div>
        </div>
        <div class="planning-info">
          <div class="name">${e.titre}</div>
          <div class="sub">${e.format} · Organisé par ${e.prenom_salarie} ${e.nom_salarie}</div>
        </div>
        <span class="badge badge-ok">Inscrit</span>
      </div>
    `).join('') : '<div class="placeholder">Aucune inscription pour le moment</div>'
  } catch (e) {
    toast('Erreur chargement planning')
  }
}

//CONTENEURS 
async function loadConteneurs() {
  try {
    const conteneurs = await fetch(`${API}/admin/conteneurs`).then(r => r.json())
    const sel = document.getElementById('depot-conteneur')
    sel.innerHTML = (conteneurs || []).map(c => `
      <option value="${c.id_box}">${c.localisation} (${c.etat})</option>
    `).join('')
  } catch (e) {
    console.error(e)
  }
}

async function loadMesDepots() {
    try {
        const depots = await fetch(`${API}/particulier/depots/${currentUser.id_user}`).then(r => r.json())
        const container = document.getElementById('mes-depots')
        if (!container) return
        container.innerHTML = (depots || []).length ? (depots || []).map(d => `
            <div class="annonce-card">
                <div class="info">
                    <div class="title">Dépôt #${d.id_depot} — Conteneur ${d.id_box}</div>
                    <div class="meta">Code ouverture : ${d.code_ouverture}</div>
                </div>
                <span class="badge badge-wait">En attente</span>
            </div>
        `).join('') : '<div class="placeholder">Aucune demande pour le moment</div>'
    } catch (e) {
        console.error(e)
    }
}

async function demandeDepot() {
  const titre = document.getElementById('depot-titre').value
  if (!titre) { toast('Remplissez tous les champs'); return }

  const idBox = parseInt(document.getElementById('depot-conteneur').value)

  try {
    const res = await fetch(`${API}/particulier/depot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code_ouverture:  Math.random().toString(36).substring(2, 8).toUpperCase(),
        code_barres_pro: Math.random().toString(36).substring(2, 10).toUpperCase(),
        id_user:         currentUser.id_user,
        id_box:          idBox,
      })
    })
    if (res.ok) {
      toast('Demande envoyée, en attente de validation')
      document.getElementById('depot-titre').value = ''
      document.getElementById('depot-desc').value  = ''
    } else {
      toast('Erreur lors de la demande')
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

//SCORE 
async function loadScore() {
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    const mes = (annonces || []).filter(a => a.id_user === currentUser.id_user && a.statut_validation === 'Valide')
    const score = mes.length * 20
    document.getElementById('score-val').textContent   = score
    document.getElementById('dash-score').textContent  = score
    document.getElementById('score-objets').textContent = mes.length
    document.getElementById('score-kg').textContent    = (mes.length * 8).toFixed(1)
  } catch (e) {
    console.error(e)
  }
}

//HELPERS 
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

//charger la session au démarrage
window.addEventListener('load', loadSession)
