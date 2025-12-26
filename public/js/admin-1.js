/**
 * admin-1.js - Logique de gestion de la console d'administration
 * Gère les tableaux dynamiques et les formulaires (Magasins, Users, Lots, etc.)
 */

// 1. VARIABLES GLOBALES ET ÉTAT
let currentSection = 'magasins';
let critereCounter = 0;

// 2. INITIALISATION AU CHARGEMENT DE LA PAGE
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin module chargé.");
    
    // Initialiser le bouton "Ajouter" principal
    const btnAdd = document.getElementById('btn-add-admin');
    if (btnAdd) {
        btnAdd.addEventListener('click', showAdminForm);
    }

    // Charger la section par défaut au démarrage
    refreshAdminTable();
});

// 3. NAVIGATION ET CHARGEMENT DES DONNÉES
async function loadAdminSection(section, event) {
    currentSection = section;
    
    // Gestion visuelle des boutons de navigation
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // Mise à jour du titre
    const titleElem = document.getElementById('admin-title');
    if (titleElem) {
        titleElem.innerText = section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    await refreshAdminTable();
}

async function refreshAdminTable() {
    const wrapper = document.getElementById('admin-table-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `<div style="padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>`;
    
    let endpoint;
    let errorMessage;
    
    // Mapping des sections
    switch(currentSection) {
        case 'magasins':
            endpoint = '/api/magasins';
            errorMessage = 'Impossible de charger la liste des magasins.';
            break;
        case 'users':
        case 'utilisateurs':
            endpoint = '/api/users';
            errorMessage = 'Impossible de charger la liste des utilisateurs.';
            break;
        case 'employers':
        case 'employes':
            endpoint = '/api/employers';
            errorMessage = 'Impossible de charger la liste des employés.';
            break;
        case 'producteurs':
            endpoint = '/api/producteurs';
            errorMessage = 'Impossible de charger la liste des producteurs.';
            break;
        case 'lots':
            endpoint = '/api/lots';
            errorMessage = 'Impossible de charger le référentiel des lots.';
            break;
        case 'validations':
            endpoint = '/api/validations';
            errorMessage = 'Impossible de charger les validations en attente.';
            break;
        default:
            wrapper.innerHTML = `<p style='color:orange; padding:20px;'>⚠️ Section "${currentSection}" non reconnue.</p>`;
            return;
    }
    
    try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Format de données invalide');
        
        renderAdminTable(data);
    } catch (err) {
        console.error('Erreur refreshAdminTable:', err);
        wrapper.innerHTML = `
            <div style='background:#ffebee; padding:20px; border-radius:8px; border-left:4px solid #d32f2f;'>
                <h4 style='color:#c62828; margin-top:0;'>⚠️ ${errorMessage}</h4>
                <p>${err.message}</p>
                <button class="btn" onclick="refreshAdminTable()" style="background:#d32f2f; color:white; margin-top:10px;">Réessayer</button>
            </div>`;
        
        if (typeof logDeploymentError === 'function') {
            logDeploymentError(`Admin-Load-${currentSection}`, err);
        }
    }
}

// 4. RENDU DU TABLEAU (Version Intelligente)
function renderAdminTable(data) {
    const wrapper = document.getElementById('admin-table-wrapper');
    
    if(!data || data.length === 0) {
        wrapper.innerHTML = "<div style='padding:40px; text-align:center; color:#888;'><i class='fa-solid fa-inbox fa-2x'></i><br>Aucune donnée disponible pour le moment.</div>";
        return;
    }

    // A. DÉFINITION DES COLONNES PAR SECTION
    // Cela permet de ne pas afficher les mots de passe ou les ID techniques
    const columnsConfig = {
        'users': [
            { key: 'username', label: 'Utilisateur' },
            { key: 'role', label: 'Rôle', type: 'badge' },
            { key: 'magasin_id', label: 'Magasin' },
            { key: 'statut', label: 'Statut' }
        ],
        'lots': [
            { key: 'categorie', label: 'Catégorie', type: 'badge' },
            { key: 'description', label: 'Désignation' },
            { key: 'prix_ref', label: 'Prix Réf.', type: 'money' },
            { key: 'unites_admises', label: 'Unités', type: 'json_list' }, // Spécial pour nos arrays
            { key: 'stock_disponible', label: 'Stock' }
        ],
        // Fallback pour les sections simples (magasins, etc.)
        'default': Object.keys(data[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').toUpperCase() }))
    };

    // Choix de la config ou fallback automatique
    const columns = columnsConfig[currentSection] || columnsConfig['default'];

    // B. CONSTRUCTION HTML
    let html = `<table class="admin-table"><thead><tr>`;
    columns.forEach(col => html += `<th>${col.label}</th>`);
    html += `<th style="width:100px; text-align:center;">Actions</th></tr></thead><tbody>`;
    
    data.forEach(row => {
        html += `<tr>`;
        columns.forEach(col => {
            let value = row[col.key];

            // C. FORMATAGE INTELLIGENT
            if (col.type === 'badge') {
                value = `<span class="badge-${value}">${value}</span>`;
            } 
            else if (col.type === 'money') {
                value = value ? `${parseFloat(value).toLocaleString('fr-FR')} FCFA` : '0 FCFA';
            }
            else if (col.type === 'json_list') {
                // Gestion spécifique pour vos colonnes JSONB (Lots)
                if (Array.isArray(value)) {
                    value = value.join(', ');
                } else if (typeof value === 'object' && value !== null) {
                    value = Object.keys(value).length + ' éléments';
                } else {
                    value = '-';
                }
            }
            // Gestion des valeurs nulles
            else if (value === null || value === undefined) {
                value = '-';
            }

            html += `<td>${value}</td>`;
        });
        
        // Bouton supprimer avec ID sécurisé
        html += `
            <td style="text-align:center;">
                <button class="btn-icon delete" onclick="deleteItem('${currentSection}', ${row.id})" title="Supprimer">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    
    // Ajout d'un petit compteur en bas
    html += `<div style="margin-top:10px; font-size:12px; color:#666; text-align:right;">${data.length} enregistrements trouvés</div>`;

    wrapper.innerHTML = html;
}

// 5. GESTION DES FORMULAIRES DYNAMIQUES
function showAdminForm() {
    const wrapper = document.getElementById('admin-table-wrapper');
    if (!wrapper) return;
    
    switch(currentSection) {
        case 'magasins': showFormMagasins(wrapper); break;
        case 'users':
        case 'utilisateurs': showFormUsers(wrapper); break;
        case 'employers':
        case 'employes': showFormEmployers(wrapper); break;
        case 'producteurs': showFormProducteurs(wrapper); break;
        case 'lots': showFormLots(wrapper); break;
        default:
            wrapper.innerHTML = `<p style="padding:20px; color:orange;">⚠️ Formulaire non implémenté.</p>`;
    }
}

// --- FORMULAIRE MAGASINS ---
function showFormMagasins(wrapper) {
    wrapper.innerHTML = `
        <form id="form-magasin" class="admin-form">
            <h3>Nouveau Magasin</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Nom du magasin *</label>
                    <input type="text" id="magasin-nom" required>
                </div>
                <div class="form-group">
                    <label>Code *</label>
                    <input type="text" id="magasin-code" placeholder="Ex: YDE001" required maxlength="10">
                </div>
                <div class="form-group">
                    <label>Région</label>
                    <select id="magasin-region"><option value="">-- Sélectionner --</option></select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="refreshAdminTable()">Annuler</button>
                    <button type="submit" class="btn btn-save">Enregistrer</button>
                </div>
            </div>
        </form>`;
    
    if (typeof loadReference === 'function') loadReference('regions', 'magasin-region');

    document.getElementById('form-magasin').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nom: document.getElementById('magasin-nom').value.trim(),
            code: document.getElementById('magasin-code').value.trim().toUpperCase(),
            region_id: document.getElementById('magasin-region').value || null
        };
        await submitForm('/api/magasins', payload);
    };
}

// --- FORMULAIRE LOTS (PRODUITS) ---
function showFormLots(wrapper) {
    wrapper.innerHTML = `
        <form id="form-lot" class="admin-form-large">
            <h3>Nouveau Lot (Produit)</h3>
            <div class="form-grid-3">
                <div class="form-group">
                    <label>Catégorie *</label>
                    <select id="lot-categorie" required onchange="chargerCriteresParCategorie()">
                        <option value="">Sélectionner</option>
                        <option value="frais">Produits frais</option>
                        <option value="secs">Produits secs</option>
                        <option value="manufactures_alim">Alimentaire transformé</option>
                        <option value="sensibles">Produits sensibles</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="lot-description" required>
                </div>
                <div class="form-group">
                    <label>Prix Ref (FCFA) *</label>
                    <input type="number" id="lot-prix-ref" required>
                </div>
            </div>

            <div class="form-section">
                <label><strong>Unités admises *</strong></label>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="unite" value="kg"> kg</label>
                    <label><input type="checkbox" name="unite" value="litres"> Litres</label>
                    <label><input type="checkbox" name="unite" value="unites"> Unités</label>
                    <label><input type="checkbox" name="unite" value="sacs"> Sacs</label>
                </div>
            </div>

            <div class="form-section">
                <div class="flex-between">
                    <h4>Critères Qualité</h4>
                    <button type="button" class="btn-small" onclick="ajouterCriterePersonnalise()">+ Ajouter</button>
                </div>
                <div id="zone-criteres-auto" class="criteres-suggere" style="display:none;">
                    <div id="liste-criteres-auto"></div>
                </div>
                <div id="zone-criteres-personnalises"></div>
                <textarea id="lot-criteres-notes" placeholder="Notes ou instructions..."></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn" onclick="refreshAdminTable()">Annuler</button>
                <button type="submit" class="btn btn-save">Enregistrer le Lot</button>
            </div>
        </form>`;

    document.getElementById('form-lot').onsubmit = async (e) => {
        e.preventDefault();
        const unitesChecked = Array.from(document.querySelectorAll('input[name="unite"]:checked')).map(cb => cb.value);
        if (unitesChecked.length === 0) return alert('Sélectionnez au moins une unité.');

        const criteresAuto = Array.from(document.querySelectorAll('#liste-criteres-auto input:checked'))
            .map(cb => ({ type: 'standard', critere: cb.value, obligatoire: true }));
        
        const criteresPerso = Array.from(document.querySelectorAll('.critere-personnalise'))
            .map(div => ({
                type: 'personnalise',
                critere: div.querySelector('input').value,
                obligatoire: div.querySelector('select').value === 'obligatoire'
            })).filter(c => c.critere.trim() !== '');

        const payload = {
            categorie: document.getElementById('lot-categorie').value,
            description: document.getElementById('lot-description').value,
            prix_ref: parseFloat(document.getElementById('lot-prix-ref').value),
            unites_admises: unitesChecked,
            criteres_admission: [...criteresAuto, ...criteresPerso]
        };
        await submitForm('/api/lots', payload);
    };
}

// 6. FONCTIONS UTILITAIRES INTERNES
async function submitForm(url, payload) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        alert('✅ Enregistrement réussi !');
        refreshAdminTable();
    } catch (err) {
        alert('❌ Erreur : ' + err.message);
    }
}

function chargerCriteresParCategorie() {
    const categorie = document.getElementById('lot-categorie').value;
    const zoneAuto = document.getElementById('zone-criteres-auto');
    const listeAuto = document.getElementById('liste-criteres-auto');
    
    if (!categorie) { zoneAuto.style.display = 'none'; return; }
    
    const base = {
        'frais': ['Aspect visuel', 'Absence de moisissure', 'Fermeté'],
        'secs': ['Humidité < 14%', 'Absence d\'insectes', 'Grains sains'],
        'sensibles': ['Certificat vétérinaire', 'Chaîne du froid', 'Traçabilité']
    };

    const criteres = base[categorie] || [];
    listeAuto.innerHTML = criteres.map(c => `
        <label class="check-item"><input type="checkbox" value="${c}" checked> ${c}</label>
    `).join('');
    zoneAuto.style.display = criteres.length ? 'block' : 'none';
}

function ajouterCriterePersonnalise() {
    const zone = document.getElementById('zone-criteres-personnalises');
    const div = document.createElement('div');
    div.className = 'critere-personnalise';
    div.innerHTML = `
        <input type="text" placeholder="Critère spécifique">
        <select><option value="obligatoire">Obligatoire</option><option value="recommande">Optionnel</option></select>
        <button type="button" onclick="this.parentElement.remove()">❌</button>`;
    zone.appendChild(div);
}

async function deleteItem(section, id) {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.")) return;

    // Mapping pour s'assurer que 'users' tape bien sur '/api/users'
    // Utile si section s'appelle 'utilisateurs' mais l'api 'users'
    const apiMap = {
        'utilisateurs': 'users',
        'employes': 'employers',
        'magasins': 'magasins',
        'lots': 'lots'
    };
    
    const endpoint = apiMap[section] || section;

    try {
        const res = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
        
        if (res.ok) {
            // Animation visuelle de suppression (optionnel mais sympa)
            refreshAdminTable(); // On recharge le tableau
        } else {
            const err = await res.json();
            alert("Erreur: " + (err.message || "Impossible de supprimer"));
        }
    } catch (error) {
        console.error("Erreur delete:", error);
        alert("Erreur serveur lors de la suppression.");
    }
}
