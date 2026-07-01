const API = 'http://localhost:8081'

const titles = {
  dashboard:    'Dashboard',
  validations:  'Validations',
  users:        'Utilisateurs',
  categories:   'Categories',
  events:       'Evenements',
  annonces:     'Annonces',
  conteneurs:   'Conteneurs',
  finances:     'Revenus',
  abonnements:  'Abonnements',
  plans:        'Plans d\'abonnement'
}

let _abonnementsCache = []

//NAVIGATION
function go(page, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('screen-' + page).classList.add('active')
  document.getElementById('page-title').textContent = titles[page] || page
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'))
  if (el) el.classList.add('active')
  document.querySelector('.content').scrollTop = 0

  if (page === 'dashboard')    loadDashboard()
  if (page === 'users')        loadUsers()
  if (page === 'categories')   loadCategories()
  if (page === 'annonces')     loadAnnonces()
  if (page === 'events')       loadEvenements()
  if (page === 'validations')  loadValidations()
  if (page === 'conteneurs')   loadConteneurs()
  if (page === 'finances')     loadCommandes()
  if (page === 'abonnements')  loadAbonnements()
  if (page === 'plans')        loadPlans()
}

//DASHBOARD
async function loadDashboard() {
  try {
    const [users, annonces, evenements, abonnements, stats] = await Promise.all([
      fetch(`${API}/admin/users`).then(r => r.json()),
      fetch(`${API}/admin/annonces`).then(r => r.json()),
      fetch(`${API}/admin/evenements`).then(r => r.json()),
      fetch(`${API}/admin/abonnements`).then(r => r.json()),
      fetch(`${API}/admin/stats`).then(r => r.json()),
    ])


    document.getElementById('kpi-users').textContent       = users      ? users.length      : 0
    document.getElementById('kpi-annonces').textContent    = annonces   ? annonces.length   : 0
    document.getElementById('kpi-events').textContent      = evenements ? evenements.length : 0
    document.getElementById('kpi-abonnements').textContent = (abonnements || []).filter(a => a.statut === 'Actif').length

    // Stats financières
    if (stats) {
      document.getElementById('stat-mois').textContent         = stats.revenus_du_mois.toFixed(2) + ' €'
      document.getElementById('stat-total').textContent        = stats.total_revenus.toFixed(2) + ' €'
      document.getElementById('stat-commissions').textContent  = stats.total_commissions.toFixed(2) + ' €'
      document.getElementById('stat-commandes').textContent    = stats.nb_commandes
      document.getElementById('stat-abos-mois').textContent    = stats.nb_abonnements_actifs
      document.getElementById('stat-abos-revenus').textContent = stats.revenus_abonnements_mois.toFixed(2) + ' €'
    }

    // Widgets
    const enAttente = [
      ...(annonces   || []).filter(a => a.statut_validation === 'En attente').map(a => ({...a, _type: 'annonce'})),
      ...(evenements || []).filter(e => e.statut_validation === 'En attente').map(e => ({...e, _type: 'event'})),
    ]
    renderValidationsWidget(enAttente)
    renderAbonnementsWidget(abonnements || [])
  } catch (e) { console.error('Dashboard error:', e) }
}

function renderValidationsWidget(items) {
  const container = document.getElementById('validations-widget')
  if (!container) return
  if (!items.length) { container.innerHTML = '<div class="placeholder">Aucune validation en attente</div>'; return }
  container.innerHTML = items.slice(0, 3).map(item => `
    <div class="vrow">
      <div class="vrow-icon">${item._type === 'event' ? 'E' : 'A'}</div>
      <div class="vrow-info">
        <div class="name">${item.titre || 'Sans titre'}</div>
        <div class="meta">${item.statut_validation}</div>
      </div>
      <div class="vrow-btns">
        <button class="btn btn-sm btn-dark" onclick="validateItem('${item._type}', ${item.id_event || item.id_annonce})">Valider</button>
        <button class="btn btn-sm btn-red"  onclick="refuseItem('${item._type}', ${item.id_event || item.id_annonce})">Refuser</button>
      </div>
    </div>
  `).join('')
}

function renderAbonnementsWidget(abonnements) {
  const container = document.getElementById('abonnements-widget')
  if (!container) return
  const actifs = abonnements.filter(a => a.statut === 'Actif').slice(0, 4)
  if (!actifs.length) { container.innerHTML = '<div class="placeholder">Aucun abonnement actif</div>'; return }
  container.innerHTML = actifs.map(a => `
    <div class="vrow">
      <div class="avatar">${a.nom[0]}${a.prenom[0]}</div>
      <div class="vrow-info">
        <div class="name">${a.nom} ${a.prenom}</div>
        <div class="meta">${a.nom_plan} · expire le ${new Date(a.date_fin).toLocaleDateString('fr-FR')}</div>
      </div>
      <span class="badge badge-ok">Actif</span>
    </div>
  `).join('')
}

function validateItem(type, id) { if (type === 'annonce') validateAnnonce(id); else validateEvenement(id) }
function refuseItem(type, id)   { if (type === 'annonce') refuseAnnonce(id);   else refuseEvenement(id) }

//UTILISATEURS
async function loadUsers() {
  try {
    const users = await fetch(`${API}/admin/users`).then(r => r.json())
    renderUsers(users || [])
  } catch (e) { toast('Erreur chargement utilisateurs') }
}

function renderUsers(users) {
  const tbody = document.querySelector('#screen-users tbody')
  if (!tbody) return
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa">Aucun utilisateur</td></tr>'; return }
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
  const nom = document.getElementById('user-nom').value, prenom = document.getElementById('user-prenom').value
  const email = document.getElementById('user-email').value, role = document.getElementById('user-role').value
  const mdp = document.getElementById('user-mdp').value
  try {
    const res = await fetch(`${API}/admin/users/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, prenom, email, role, mot_de_passe: mdp }) })
    if (res.ok) { toast('Utilisateur créé'); closeModal('modal-user'); loadUsers() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

async function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return
  await fetch(`${API}/admin/users/delete/${id}`, { method: 'DELETE' })
  toast('Utilisateur supprimé'); loadUsers()
}

function openEditUser(id, nom, prenom, email, role) {
  document.getElementById('user-nom').value = nom; document.getElementById('user-prenom').value = prenom
  document.getElementById('user-email').value = email; document.getElementById('user-role').value = role
  document.getElementById('user-save-btn').onclick = () => updateUser(id)
  openModal('modal-user')
}

async function updateUser(id) {
  const nom = document.getElementById('user-nom').value, prenom = document.getElementById('user-prenom').value
  const email = document.getElementById('user-email').value, role = document.getElementById('user-role').value
  try {
    const res = await fetch(`${API}/admin/users/modify/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, prenom, email, role }) })
    if (res.ok) { toast('Utilisateur modifié'); closeModal('modal-user'); loadUsers() }
    else toast('Erreur modification')
  } catch (e) { toast('Erreur serveur') }
}

//CATEGORIES
async function loadCategories() {
  try {
    const cats = await fetch(`${API}/admin/categories`).then(r => r.json())
    renderCategories(cats || [])
  } catch (e) { console.error(e) }
}

function renderCategories(cats) {
  const tbody = document.querySelector('#screen-categories tbody')
  if (!tbody) return
  tbody.innerHTML = cats.map(c => `
    <tr>
      <td>${c.id_categorie}</td>
      <td>${c.libelle}</td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm" onclick="openEditCategorie(${c.id_categorie}, '${c.libelle}')">Modifier</button>
        <button class="btn btn-sm btn-red" onclick="deleteCategorie(${c.id_categorie})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function createCategorie() {
  const libelle = document.getElementById('cat-libelle').value
  try {
    const res = await fetch(`${API}/admin/categories/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ libelle }) })
    if (res.ok) { toast('Catégorie créée'); closeModal('modal-cat'); resetCatModal(); loadCategories() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

function openEditCategorie(id, libelle) {
  document.getElementById('cat-libelle').value = libelle
  const btn = document.getElementById('cat-save-btn')
  btn.textContent = 'Modifier'; btn.onclick = () => updateCategorie(id)
  openModal('modal-cat')
}

async function updateCategorie(id) {
  const libelle = document.getElementById('cat-libelle').value
  try {
    const res = await fetch(`${API}/admin/categories/modify/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ libelle }) })
    if (res.ok) { toast('Catégorie modifiée'); closeModal('modal-cat'); resetCatModal(); loadCategories() }
    else toast('Erreur modification')
  } catch (e) { toast('Erreur serveur') }
}

function resetCatModal() {
  document.getElementById('cat-libelle').value = ''
  const btn = document.getElementById('cat-save-btn')
  btn.textContent = 'Creer'; btn.onclick = createCategorie
}

async function deleteCategorie(id) {
  if (!confirm('Supprimer cette catégorie ?')) return
  await fetch(`${API}/admin/categories/delete/${id}`, { method: 'DELETE' })
  toast('Catégorie supprimée'); loadCategories()
}

//ANNONCES
async function loadAnnonces() {
  try {
    const annonces = await fetch(`${API}/admin/annonces`).then(r => r.json())
    renderAnnonces(annonces || [])
  } catch (e) { console.error(e) }
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
        <button class="btn btn-sm btn-red" onclick="deleteAnnonce(${a.id_annonce})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function validateAnnonce(id) { await fetch(`${API}/admin/annonces/validate/${id}`, { method: 'PUT' }); toast('Annonce validée'); loadAnnonces() }
async function refuseAnnonce(id)   { await fetch(`${API}/admin/annonces/refuse/${id}`, { method: 'PUT' });   toast('Annonce refusée'); loadAnnonces() }
async function deleteAnnonce(id) {
  if (!confirm('Supprimer cette annonce ?')) return
  await fetch(`${API}/admin/annonces/delete/${id}`, { method: 'DELETE' })
  toast('Annonce supprimée'); loadAnnonces()
}

// EVENEMENTS
async function loadEvenements() {
  try {
    const events = await fetch(`${API}/admin/evenements`).then(r => r.json())
    renderEvenements(events || [])
  } catch (e) { console.error(e) }
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
        <button class="btn btn-sm btn-red" onclick="deleteEvenement(${e.id_event})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function validateEvenement(id) { await fetch(`${API}/admin/evenements/validate/${id}`, { method: 'PUT' }); toast('Evenement validé');  loadEvenements() }
async function refuseEvenement(id)   { await fetch(`${API}/admin/evenements/refuse/${id}`,   { method: 'PUT' }); toast('Evenement refusé');  loadEvenements() }
async function deleteEvenement(id) {
  if (!confirm('Supprimer cet événement ?')) return
  await fetch(`${API}/admin/evenements/delete/${id}`, { method: 'DELETE' })
  toast('Evenement supprimé'); loadEvenements()
}

//VALIDATIONS
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
  } catch (e) { console.error(e) }
}

function renderValidationsAnnonces(items) {
  const c = document.getElementById('val-annonces'); if (!c) return
  c.innerHTML = items.length ? items.map(a => `
    <div class="vrow">
      <div class="vrow-icon">A</div>
      <div class="vrow-info"><div class="name">${a.titre}</div><div class="meta">${a.nom} ${a.prenom} · ${a.categorie}</div></div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="validateAnnonce(${a.id_annonce})">Valider</button>
        <button class="btn btn-red"  onclick="refuseAnnonce(${a.id_annonce})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucune annonce en attente</div>'
}

function renderValidationsEvents(items) {
  const c = document.getElementById('val-events'); if (!c) return
  c.innerHTML = items.length ? items.map(e => `
    <div class="vrow">
      <div class="vrow-icon">E</div>
      <div class="vrow-info"><div class="name">${e.titre}</div><div class="meta">${new Date(e.date_debut).toLocaleDateString('fr-FR')} · ${e.format}</div></div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="validateEvenement(${e.id_event})">Valider</button>
        <button class="btn btn-red"  onclick="refuseEvenement(${e.id_event})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucun evenement en attente</div>'
}

function renderValidationsUsers(items) {
  const c = document.getElementById('val-users'); if (!c) return
  c.innerHTML = items.length ? items.map(u => `
    <div class="vrow">
      <div class="avatar">${u.nom[0]}${u.prenom[0]}</div>
      <div class="vrow-info"><div class="name">${u.nom} ${u.prenom}</div><div class="meta">${u.email}</div></div>
      <div class="vrow-btns">
        <button class="btn btn-dark" onclick="toast('Compte active')">Activer</button>
        <button class="btn btn-red"  onclick="deleteUser(${u.id_user})">Refuser</button>
      </div>
    </div>
  `).join('') : '<div class="placeholder">Aucun compte en attente</div>'
}

//CONTENEURS
async function loadConteneurs() {
  try {
    const conteneurs = await fetch(`${API}/admin/conteneurs`).then(r => r.json())
    renderConteneurs(conteneurs || [])
  } catch (e) { console.error(e) }
}

function renderConteneurs(conteneurs) {
  const tbody = document.querySelector('#screen-conteneurs tbody'); if (!tbody) return
  tbody.innerHTML = conteneurs.map(c => `
    <tr>
      <td>${c.id_box}</td>
      <td>${c.localisation}</td>
      <td><span class="badge ${c.etat === 'Disponible' ? 'badge-ok' : 'badge-wait'}">${c.etat}</span></td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm" onclick="openEditConteneur(${c.id_box}, '${c.localisation}', '${c.etat}')">Modifier</button>
        <button class="btn btn-sm btn-red" onclick="deleteConteneur(${c.id_box})">Supprimer</button>
      </td>
    </tr>
  `).join('')
}

async function createConteneur() {
  const localisation = document.getElementById('cont-localisation').value
  const etat         = document.getElementById('cont-etat').value
  if (!localisation) { toast('La localisation est obligatoire'); return }
  try {
    const res = await fetch(`${API}/admin/conteneurs/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localisation, etat })
    })
    if (res.ok) { toast('Conteneur créé'); closeModal('modal-cont'); loadConteneurs() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

function openEditConteneur(id, localisation, etat) {
  document.getElementById('cont-localisation').value = localisation
  document.getElementById('cont-etat').value = etat
  document.getElementById('cont-save-btn').onclick = () => updateConteneur(id)
  openModal('modal-cont')
}

async function updateConteneur(id) {
  const localisation = document.getElementById('cont-localisation').value
  const etat = document.getElementById('cont-etat').value
  try {
    const res = await fetch(`${API}/admin/conteneurs/modify/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ localisation, etat }) })
    if (res.ok) { toast('Conteneur modifié'); closeModal('modal-cont'); loadConteneurs() }
    else toast('Erreur modification')
  } catch (e) { toast('Erreur serveur') }
}

async function deleteConteneur(id) {
  if (!confirm('Supprimer ce conteneur ?')) return
  await fetch(`${API}/admin/conteneurs/delete/${id}`, { method: 'DELETE' })
  toast('Conteneur supprimé'); loadConteneurs()
}

//COMMANDES 
async function loadCommandes() {
  try {
    const commandes = await fetch(`${API}/admin/commandes`).then(r => r.json())
    renderCommandes(commandes || [])
  } catch (e) { console.error(e) }
}

function renderCommandes(commandes) {
  const tbody = document.querySelector('#screen-finances tbody'); if (!tbody) return
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

// ABONNEMENTS 
async function loadAbonnements() {
  try {
    const abonnements = await fetch(`${API}/admin/abonnements`).then(r => r.json())
    _abonnementsCache = abonnements || []
    updateAbonnementsKpis(_abonnementsCache)
    renderAbonnements(_abonnementsCache)
  } catch (e) { toast('Erreur chargement abonnements') }
}

function updateAbonnementsKpis(abonnements) {
  document.getElementById('abo-kpi-total').textContent  = abonnements.length
  document.getElementById('abo-kpi-actif').textContent  = abonnements.filter(a => a.statut === 'Actif').length
  document.getElementById('abo-kpi-expire').textContent = abonnements.filter(a => a.statut === 'Expire').length
  document.getElementById('abo-kpi-annule').textContent = abonnements.filter(a => a.statut === 'Annule').length
}

function renderAbonnements(abonnements) {
  const tbody = document.getElementById('abonnements-tbody'); if (!tbody) return
  if (!abonnements.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa">Aucun abonnement</td></tr>'; return }
  tbody.innerHTML = abonnements.map(a => {
    const badgeClass    = a.statut === 'Actif' ? 'badge-ok' : a.statut === 'Expire' ? 'badge-off' : 'badge-wait'
    const joursRestants = Math.ceil((new Date(a.date_fin) - new Date()) / (1000 * 60 * 60 * 24))
    const alerteFin     = a.statut === 'Actif' && joursRestants <= 7 ? `<span style="font-size:10px;color:#f57f17;margin-left:4px">(expire dans ${joursRestants}j)</span>` : ''
    return `
      <tr>
        <td style="color:#888">#${a.id_abonnement}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar">${a.nom[0]}${a.prenom[0]}</div><strong>${a.nom} ${a.prenom}</strong></div></td>
        <td><span class="badge badge-pro">${a.nom_plan}</span></td>
        <td>${new Date(a.date_debut).toLocaleDateString('fr-FR')}</td>
        <td>${new Date(a.date_fin).toLocaleDateString('fr-FR')}${alerteFin}</td>
        <td><span class="badge ${badgeClass}">${a.statut}</span></td>
        <td style="display:flex;gap:5px">
          <button class="btn btn-sm" onclick="openEditAbonnement(${a.id_abonnement}, '${a.statut}')">Statut</button>
          <button class="btn btn-sm btn-red" onclick="deleteAbonnement(${a.id_abonnement})">Supprimer</button>
        </td>
      </tr>
    `
  }).join('')
}

function filterAbonnements(el, statut) {
  el.closest('.tabs').querySelectorAll('button').forEach(b => { b.className = b === el ? 'btn btn-dark btn-sm' : 'btn btn-sm' })
  renderAbonnements(statut === '' ? _abonnementsCache : _abonnementsCache.filter(a => a.statut === statut))
}

function openEditAbonnement(id, statutActuel) {
  document.getElementById('abo-statut').value     = statutActuel
  document.getElementById('abo-save-btn').onclick = () => updateAbonnementStatut(id)
  openModal('modal-abo')
}

async function updateAbonnementStatut(id) {
  const statut = document.getElementById('abo-statut').value
  try {
    const res = await fetch(`${API}/admin/abonnements/statut/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) })
    if (res.ok) { toast('Statut mis à jour'); closeModal('modal-abo'); loadAbonnements() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

async function deleteAbonnement(id) {
  if (!confirm('Supprimer cet abonnement ?')) return
  await fetch(`${API}/admin/abonnements/delete/${id}`, { method: 'DELETE' })
  toast('Abonnement supprimé'); loadAbonnements()
}

//PLANS D'ABONNEMENT
let _plansCache = []

async function loadPlans() {
  try {
    const plans = await fetch(`${API}/admin/plans`).then(r => r.json())
    _plansCache = plans || []

    // Charger aussi les abonnements pour compter les actifs par plan
    const abonnements = await fetch(`${API}/admin/abonnements`).then(r => r.json())
    renderPlans(_plansCache, abonnements || [])
  } catch (e) {
    toast('Erreur chargement plans')
  }
}

function renderPlans(plans, abonnements) {
  const tbody = document.getElementById('plans-tbody')
  if (!tbody) return
  if (!plans.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa">Aucun plan</td></tr>'
    return
  }
  tbody.innerHTML = plans.map(p => {
    const actifs = abonnements.filter(a => a.nom_plan === p.nom && a.statut === 'Actif').length
    return `
      <tr>
        <td style="color:#888">#${p.id_plan}</td>
        <td><strong>${p.nom}</strong></td>
        <td>${p.prix.toFixed(2)} €</td>
        <td>${p.duree_mois} mois</td>
        <td><span class="badge ${actifs > 0 ? 'badge-ok' : 'badge-off'}">${actifs} actif${actifs > 1 ? 's' : ''}</span></td>
        <td style="display:flex;gap:5px">
          <button class="btn btn-sm" onclick="openEditPlan(${p.id_plan}, '${p.nom}', ${p.prix}, ${p.duree_mois})">Modifier</button>
          <button class="btn btn-sm btn-red" onclick="deletePlan(${p.id_plan})">Supprimer</button>
        </td>
      </tr>
    `
  }).join('')
}

async function createPlan() {
  const nom       = document.getElementById('plan-nom').value
  const prix      = parseFloat(document.getElementById('plan-prix').value)
  const duree     = parseInt(document.getElementById('plan-duree').value)

  if (!nom || isNaN(prix) || isNaN(duree)) { toast('Tous les champs sont obligatoires'); return }

  try {
    const res = await fetch(`${API}/admin/plans/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prix, duree_mois: duree })
    })
    if (res.ok) { toast('Plan créé'); closeModal('modal-plan'); resetPlanModal(); loadPlans() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

function openEditPlan(id, nom, prix, duree) {
  document.getElementById('plan-nom').value   = nom
  document.getElementById('plan-prix').value  = prix
  document.getElementById('plan-duree').value = duree
  const btn = document.getElementById('plan-save-btn')
  btn.textContent = 'Modifier'
  btn.onclick = () => updatePlan(id)
  openModal('modal-plan')
}

async function updatePlan(id) {
  const nom   = document.getElementById('plan-nom').value
  const prix  = parseFloat(document.getElementById('plan-prix').value)
  const duree = parseInt(document.getElementById('plan-duree').value)

  try {
    const res = await fetch(`${API}/admin/plans/modify/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, prix, duree_mois: duree })
    })
    if (res.ok) { toast('Plan modifié'); closeModal('modal-plan'); resetPlanModal(); loadPlans() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur serveur') }
}

async function deletePlan(id) {
  if (!confirm('Supprimer ce plan ?')) return
  try {
    const res = await fetch(`${API}/admin/plans/delete/${id}`, { method: 'DELETE' })
    if (res.ok) { toast('Plan supprimé'); loadPlans() }
    else toast('Erreur : ' + await res.text())
  } catch (e) { toast('Erreur suppression') }
}

function resetPlanModal() {
  document.getElementById('plan-nom').value   = ''
  document.getElementById('plan-prix').value  = ''
  document.getElementById('plan-duree').value = ''
  const btn = document.getElementById('plan-save-btn')
  btn.textContent = 'Creer'
  btn.onclick = createPlan
}

// HELPERS
function openModal(id)  { document.getElementById(id).classList.add('open') }
function closeModal(id, e) { if (!e || e.target.id === id) document.getElementById(id).classList.remove('open') }
function filterTab(el) {
  el.closest('.tabs').querySelectorAll('button').forEach(b => { b.className = b === el ? 'btn btn-dark btn-sm' : 'btn btn-sm' })
}
function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg; t.style.display = 'block'
  setTimeout(() => t.style.display = 'none', 2500)
}

window.addEventListener('load', () => loadDashboard())
