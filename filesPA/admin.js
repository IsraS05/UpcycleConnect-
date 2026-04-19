const API = 'http://localhost:8081'

const titles = {
  dashboard:   'Dashboard',
  validations: 'Validations',
  users:       'Utilisateurs',
  prestations: 'Prestations',
  categories:  'Categories',
  events:      'Evenements',
  annonces:    'Annonces',
  conteneurs:  'Conteneurs',
  finances:    'Revenus'
}

// Navigation
function go(page, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + page).classList.add('active')
  document.getElementById('page-title').textContent = titles[page] || page
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  if (el) el.classList.add('active')
  document.querySelector('.content').scrollTop = 0

  // Charger les données selon la page
  if (page === 'dashboard')   loadDashboard()
  if (page === 'users')       loadUsers()
  if (page === 'categories')  loadCategories()
  if (page === 'annonces')    loadAnnonces()
  if (page === 'events')      loadEvenements()
  if (page === 'validations') loadValidations()
  if (page === 'conteneurs')  loadConteneurs()
  if (page === 'finances')    loadCommandes()
}

// ── DASHBOARD ──
async function loadDashboard() {
  try {
    const [users, annonces, evenements] = await Promise.all([
      fetch(`${API}/admin/users`).then(r => r.json()),
      fetch(`${API}/admin/annonces`).then(r => r.json()),
      fetch(`${API}/admin/evenements`).then(r => r.json()),
    ])

    document.getElementById('kpi-users').textContent    = users ? users.length : 0
    document.getElementById('kpi-annonces').textContent = annonces ? annonces.length : 0
    document.getElementById('kpi-events').textContent   = evenements ? evenements.length : 0

    // Validations en attente
    const enAttente = [
      ...(annonces || []).filter(a => a.statut_validation === 'En attente'),
      ...(evenements || []).filter(e => e.statut_validation === 'En attente'),
    ]
    renderValidationsWidget(enAttente)
  } catch (e) {
    console.error('Dashboard error:', e)
  }
}

function renderValidationsWidget(items) {
  const container = document.getElementById('validations-widget')
  if (!container) return
  if (!items.length) {
    container.innerHTML = '<div class="placeholder">Aucune validation en attente</div>'
    return
  }
  container.innerHTML = items.slice(0, 3).map(item => `
    <div class="vrow">
      <div class="vrow-icon">${item.titre ? 'E' : 'A'}</div>
      <div class="vrow-info">
        <div class="name">${item.titre || 'Sans titre'}</div>
        <div class="meta">${item.statut_validation}</div>
      </div>
      <div class="vrow-btns">
        <button class="btn btn-sm btn-dark" onclick="validateItem('${item.titre ? 'event' : 'annonce'}', ${item.id_event || item.id_annonce})">Valider</button>
        <button class="btn btn-sm btn-red"  onclick="refuseItem('${item.titre ? 'event' : 'annonce'}', ${item.id_event || item.id_annonce})">Refuser</button>
      </div>
    </div>
  `).join('')
}

// ── UTILISATEURS ──
async function loadUsers() {
  try {
    const users = await fetch(`${API}/admin/users`).then(r => r.json())
    renderUsers(users || [])
  } catch (e) {
    console.error('loadUsers error:', e)
    toast('Erreur chargement utilisateurs')
  }
}

function renderUsers(users) {
  const tbody = document.querySelector('#screen-users tbody')
  if (!tbody) return
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa">Aucun utilisateur</td></tr>'
    return
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.nom} ${u.prenom}</strong></td>
      <td style="color:#888">${u.email}</td>
      <td><span class="badge badge-ok">${u.role}</span></td>
      <td><span class="badge badge-ok">Actif</span></td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm" onclick="openEditUser(${u.id_user}, '${u.nom}', '${u.prenom}', '${u.email}', '${u.role}')">Modifier</button>
        <button class="btn btn-sm btn-red" onclick="deleteUser(${u.id_user})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function createUser() {
  const nom    = document.getElementById('user-nom').value
  const prenom = document.getElementById('user-prenom').value
  const email  = document.getElementById('user-email').value
  const role   = document.getElementById('user-role').value
  const mdp    = document.getElementById('user-mdp').value

  try {
    const res = await fetch(`${API}/admin/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, email, role, mot_de_passe: mdp })
    })
    if (res.ok) {
      toast('Utilisateur créé')
      closeModal('modal-user')
      loadUsers()
    } else {
      const err = await res.text()
      toast('Erreur : ' + err)
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

async function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return
  try {
    await fetch(`${API}/admin/users/delete/${id}`, { method: 'DELETE' })
    toast('Utilisateur supprimé')
    loadUsers()
  } catch (e) {
    toast('Erreur suppression')
  }
}

function openEditUser(id, nom, prenom, email, role) {
  document.getElementById('user-nom').value    = nom
  document.getElementById('user-prenom').value = prenom
  document.getElementById('user-email').value  = email
  document.getElementById('user-role').value   = role
  document.getElementById('user-save-btn').onclick = () => updateUser(id)
  openModal('modal-user')
}

async function updateUser(id) {
  const nom    = document.getElementById('user-nom').value
  const prenom = document.getElementById('user-prenom').value
  const email  = document.getElementById('user-email').value
  const role   = document.getElementById('user-role').value

  try {
    const res = await fetch(`${API}/admin/users/modify/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prenom, email, role })
    })
    if (res.ok) {
      toast('Utilisateur modifié')
      closeModal('modal-user')
      loadUsers()
    } else {
      toast('Erreur modification')
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

// ── CATEGORIES ──
async function loadCategories() {
  try {
    const cats = await fetch(`${API}/admin/categories`).then(r => r.json())
    renderCategories(cats || [])
  } catch (e) {
    console.error('loadCategories error:', e)
  }
}

function renderCategories(cats) {
  const tbody = document.querySelector('#screen-categories tbody')
  if (!tbody) return
  tbody.innerHTML = cats.map(c => `
    <tr>
      <td>${c.id_categorie}</td>
      <td>${c.libelle}</td>
      <td>
        <button class="btn btn-sm btn-red" onclick="deleteCategorie(${c.id_categorie})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function createCategorie() {
  const libelle = document.getElementById('cat-libelle').value
  try {
    const res = await fetch(`${API}/admin/categories/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libelle })
    })
    if (res.ok) {
      toast('Catégorie créée')
      closeModal('modal-cat')
      loadCategories()
    } else {
      const err = await res.text()
      toast('Erreur : ' + err)
    }
  } catch (e) {
    toast('Erreur serveur')
  }
}

async function deleteCategorie(id) {
  if (!confirm('Supprimer cette catégorie ?')) return
  try {
    await fetch(`${API}/admin/categories/delete/${id}`, { method: 'DELETE' })
    toast('Catégorie supprimée')
    loadCategories()
  } catch (e) {
    toast('Erreur suppression')
  }
}

// ── ANNONCES ──
async function loadAnnonces() {
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    renderAnnonces(annonces || [])
  } catch (e) {
    console.error('loadAnnonces error:', e)
  }
}

function renderAnnonces(annonces) {
  const tbody = document.querySelector('#screen-annonces tbody')
  if (!tbody) return
  tbody.innerHTML = annonces.map(a => `
    <tr>
      <td><strong>${a.titre}</strong></td>
      <td>${a.nom} ${a.prenom}</td>
      <td>${a.categorie}</td>
      <td><span class="badge ${a.statut_validation === 'Valide' ? 'badge-ok' : 'badge-wait'}">${a.statut_validation}</span></td>
      <td style="display:flex;gap:5px">
        ${a.statut_validation === 'En attente' ? `
          <button class="btn btn-sm btn-dark" onclick="validateAnnonce(${a.id_annonce})">Valider</button>
          <button class="btn btn-sm btn-red"  onclick="refuseAnnonce(${a.id_annonce})">Refuser</button>
        ` : ''}
      </td>
    </tr>
  `).join('')
}

async function validateAnnonce(id) {
  await fetch(`${API}/admin/annonces/validate/${id}`, { method: 'PUT' })
  toast('Annonce validée')
  loadAnnonces()
}

async function refuseAnnonce(id) {
  await fetch(`${API}/admin/annonces/refuse/${id}`, { method: 'PUT' })
  toast('Annonce refusée')
  loadAnnonces()
}

// ── EVENEMENTS ──
async function loadEvenements() {
  try {
    const events = await fetch(`${API}/admin/evenements`).then(r => r.json())
    renderEvenements(events || [])
  } catch (e) {
    console.error('loadEvenements error:', e)
  }
}

function renderEvenements(events) {
  const tbody = document.querySelector('#screen-events tbody')
  if (!tbody) return
  tbody.innerHTML = events.map(e => `
    <tr>
      <td><strong>${e.titre}</strong></td>
      <td>${new Date(e.date_debut).toLocaleDateString('fr-FR')}</td>
      <td>${e.format}</td>
      <td>${e.nb_places}</td>
      <td><span class="badge ${e.statut_validation === 'Valide' ? 'badge-ok' : 'badge-wait'}">${e.statut_validation}</span></td>
      <td style="display:flex;gap:5px">
        ${e.statut_validation === 'En attente' ? `
          <button class="btn btn-sm btn-dark" onclick="validateEvenement(${e.id_event})">Valider</button>
          <button class="btn btn-sm btn-red"  onclick="refuseEvenement(${e.id_event})">Refuser</button>
        ` : ''}
      </td>
    </tr>
  `).join('')
}

async function validateEvenement(id) {
  await fetch(`${API}/admin/evenements/validate/${id}`, { method: 'PUT' })
  toast('Evenement validé')
  loadEvenements()
}

async function refuseEvenement(id) {
  await fetch(`${API}/admin/evenements/refuse/${id}`, { method: 'PUT' })
  toast('Evenement refusé')
  loadEvenements()
}

// ── VALIDATIONS (hub central) ──
async function loadValidations() {
  try {
    const [annonces, events, users] = await Promise.all([
      fetch(`${API}/admin/annonces`).then(r => r.json()),
      fetch(`${API}/admin/evenements`).then(r => r.json()),
      fetch(`${API}/admin/users`).then(r => r.json()),
    ])

    renderValidationsAnnonces((annonces || []).filter(a => a.statut_validation === 'En attente'))
    renderValidationsEvents((events || []).filter(e => e.statut_validation === 'En attente'))
    renderValidationsUsers((users || []).filter(u => u.role === 'Particulier'))
  } catch (e) {
    console.error('loadValidations error:', e)
  }
}

function renderValidationsAnnonces(items) {
  const c = document.getElementById('val-annonces')
  if (!c) return
  c.innerHTML = items.length ? items.map(a => `
    <div class="vrow">
      <div class="vrow-icon">A</div>
      <div class="vrow-info">
        <div class="name">${a.titre}</div>
        <div class="meta">${a.nom} ${a.prenom} · ${a.categorie}</div>
      </div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="validateAnnonce(${a.id_annonce})">Valider</button>
        <button class="btn btn-red"  onclick="refuseAnnonce(${a.id_annonce})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucune annonce en attente</div>'
}

function renderValidationsEvents(items) {
  const c = document.getElementById('val-events')
  if (!c) return
  c.innerHTML = items.length ? items.map(e => `
    <div class="vrow">
      <div class="vrow-icon">E</div>
      <div class="vrow-info">
        <div class="name">${e.titre}</div>
        <div class="meta">${new Date(e.date_debut).toLocaleDateString('fr-FR')} · ${e.format}</div>
      </div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="validateEvenement(${e.id_event})">Valider</button>
        <button class="btn btn-red"  onclick="refuseEvenement(${e.id_event})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucun evenement en attente</div>'
}

function renderValidationsUsers(items) {
  const c = document.getElementById('val-users')
  if (!c) return
  c.innerHTML = items.length ? items.map(u => `
    <div class="vrow">
      <div class="avatar">${u.nom[0]}${u.prenom[0]}</div>
      <div class="vrow-info">
        <div class="name">${u.nom} ${u.prenom}</div>
        <div class="meta">${u.email}</div>
      </div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="toast('Compte active')">Activer</button>
        <button class="btn btn-red"  onclick="deleteUser(${u.id_user})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucun compte en attente</div>'
}

// ── CONTENEURS ──
async function loadConteneurs() {
  try {
    const [conteneurs, depots] = await Promise.all([
      fetch(`${API}/admin/conteneurs`).then(r => r.json()),
      fetch(`${API}/admin/depots`).then(r => r.json()),
    ])

    // Tableau conteneurs
    const tbodyC = document.querySelector('#screen-conteneurs tbody')
    if (tbodyC) {
      tbodyC.innerHTML = (conteneurs || []).map(c => `
        <tr>
          <td>${c.id_box}</td>
          <td>${c.localisation}</td>
          <td><span class="badge ${c.etat === 'Disponible' ? 'badge-ok' : 'badge-wait'}">${c.etat}</span></td>
          <td>
            <button class="btn btn-sm" onclick="toast('Modification')">Modifier</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align:center;color:#aaa">Aucun conteneur</td></tr>'
    }

    // Tableau dépôts
    const tbodyD = document.getElementById('depot-tbody')
    if (tbodyD) {
      tbodyD.innerHTML = (depots || []).map(d => `
        <tr>
          <td>${d.id_depot}</td>
          <td>${d.nom} ${d.prenom}</td>
          <td>${d.id_box}</td>
          <td><span class="badge badge-wait">En attente</span></td>
          <td>
            <button class="btn btn-sm btn-dark" onclick="validateDepot(${d.id_depot})">Valider</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">Aucune demande</td></tr>'
    }

  } catch (e) {
    console.error('loadConteneurs error:', e)
  }
}

async function validateDepot(id) {
  await fetch(`${API}/admin/depots/validate/${id}`, { method: 'PUT' })
  toast('Dépôt validé')
  loadConteneurs()
}

function renderConteneurs(conteneurs) {
  const tbody = document.querySelector('#screen-conteneurs tbody')
  if (!tbody) return
  tbody.innerHTML = conteneurs.map(c => `
    <tr>
      <td>${c.id_box}</td>
      <td>${c.localisation}</td>
      <td><span class="badge ${c.etat === 'Disponible' ? 'badge-ok' : 'badge-wait'}">${c.etat}</span></td>
      <td>
        <button class="btn btn-sm" onclick="toast('Modification')">Modifier</button>
      </td>
    </tr>
  `).join('')
}

// ── COMMANDES ──
async function loadCommandes() {
  try {
    const commandes = await fetch(`${API}/admin/commandes`).then(r => r.json())
    renderCommandes(commandes || [])
  } catch (e) {
    console.error('loadCommandes error:', e)
  }
}

function renderCommandes(commandes) {
  const tbody = document.querySelector('#screen-finances tbody')
  if (!tbody) return
  tbody.innerHTML = commandes.map(c => `
    <tr>
      <td>${c.id_commande}</td>
      <td>${c.nom} ${c.prenom}</td>
      <td>${c.montant_total} EUR</td>
      <td>${c.commission} EUR</td>
      <td>${new Date(c.date_commande).toLocaleDateString('fr-FR')}</td>
    </tr>
  `).join('')
}

// ── HELPERS ──
function openModal(id) {
  document.getElementById(id).classList.add('open')
}

function closeModal(id, e) {
  if (!e || e.target.id === id) {
    document.getElementById(id).classList.remove('open')
  }
}

function filterTab(el) {
  el.closest('.tabs').querySelectorAll('button').forEach(b => {
    b.className = b === el ? 'btn btn-dark btn-sm' : 'btn btn-sm'
  })
}

function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.style.display = 'block'
  setTimeout(() => t.style.display = 'none', 2500)
}

async function loadDepots() {
    try {
        const depots = await fetch(`${API}/admin/depots`).then(r => r.json())
        const tbody = document.querySelector('#depot-tbody')
        if (!tbody) return
        tbody.innerHTML = (depots || []).map(d => `
            <tr>
                <td>${d.id_depot}</td>
                <td>${d.nom} ${d.prenom}</td>
                <td>${d.id_box}</td>
                <td><span class="badge badge-wait">En attente</span></td>
                <td>
                    <button class="btn btn-sm btn-dark" onclick="validateDepot(${d.id_depot})">Valider</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa">Aucune demande</td></tr>'
    } catch (e) {
        console.error(e)
    }
}

async function validateDepot(id) {
    await fetch(`${API}/admin/depots/validate/${id}`, { method: 'PUT' })
    toast('Dépôt validé')
    loadDepots()
}
// Charger le dashboard au démarrage
window.addEventListener('load', () => loadDashboard())
