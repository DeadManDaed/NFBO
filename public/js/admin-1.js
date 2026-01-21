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
// On s'assure que la fonction est globale
window.loadAdminSection = async function(section, event) {
    currentSection = section; // Utilise la variable déjà définie dans votre code
    
    console.log("Chargement de la section admin :", section);

    // Votre logique existante de gestion visuelle
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    
    // Si l'event est passé, on active le bouton
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        // Fallback si l'event n'est pas passé (appel direct)
        const btn = document.querySelector(`button[onclick*="'${section}'"]`);
        if (btn) btn.classList.add('active');
    }
    
    const titleElem = document.getElementById('admin-title');
    if (titleElem) {
        titleElem.innerText = section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    // Appel de votre fonction de rafraîchissement déjà existante
    await refreshAdminTable();
};

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
        { key: 'id', label: 'Matricule/ID' }, // Affichera l'ID généré par le trigger
        { key: 'username', label: 'Login' },
        { key: 'role', label: 'Rôle', type: 'badge' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'statut', label: 'Statut' }
    ],
        'lots': [
            { key: 'categorie', label: 'Catégorie', type: 'badge' },
            { key: 'description', label: 'Désignation' },
            { key: 'prix_ref', label: 'Prix Réf.', type: 'money' },
            { key: 'unites_admises', label: 'Unités', type: 'json_list' }, // Spécial pour nos arrays
            { key: 'stock_disponible', label: 'Stock' }
        ],
    // ... vos autres configs (users, lots) ...
    
    'producteurs': [
        { key: 'matricule', label: 'Matricule' },
        { key: 'nom_producteur', label: 'Nom / Organisation' },
        { key: 'type_producteur', label: 'Type', type: 'badge' },
        { key: 'telephone', label: 'Contact' },
        { key: 'localite', label: 'Localité' },
        { key: 'solde', label: 'Solde (FCFA)', type: 'money' },
        { key: 'statut', label: 'Statut', type: 'badge' }
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

// --- FORMULAIRE PRODUCTEURS ---
/**
 * Formulaire Producteurs avec Géographie en Cascade
 */
function showFormProducteurs(wrapper) {
    wrapper.innerHTML = `
        <form id="form-producteur" class="admin-form" style="background:white; padding:25px; border-radius:8px;">
            <h3 style="margin-top:0; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:10px;">
                <i class="fa-solid fa-address-card"></i> Fiche Nouveau Producteur
            </h3>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
                <div class="form-group">
                    <label>Nom / Raison Sociale *</label>
                    <input type="text" id="p-nom" required placeholder="Ex: Jean Planteur">
                </div>
                <div class="form-group">
                    <label>Téléphone *</label>
                    <input type="tel" id="p-tel" required placeholder="6XXXXXXXX">
                </div>
                <div class="form-group">
                    <label>Type *</label>
                    <select id="p-type" required>
                        <option value="individuel">Individuel</option>
                        <option value="agriculteur">Agriculteur</option>
                        <option value="éleveur">Éleveur</option>
                        <option value="pêcheur">Pêcheur</option>
                        <option value="artisan">Artisan</option>
                        <option value="coopérative">Coopérative</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Carte Membre</label>
                    <select id="p-carte">
                        <option value="false">Non Membre</option>
                        <option value="true">Membre Actif</option>
                    </select>
                </div>
            </div>

            <fieldset style="margin-top:20px; border:1px solid #ddd; padding:15px; border-radius:8px;">
                <legend style="padding:0 10px; font-weight:bold;">Localisation Géographique</legend>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
                    <div class="form-group">
                        <label>Région *</label>
                        <select id="p-region" required onchange="chargerGeographie('departements', this.value, 'p-departement')">
                            <option value="">Chargement...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Département *</label>
                        <select id="p-departement" required onchange="chargerGeographie('arrondissements', this.value, 'p-arrondissement')">
                            <option value="">-- Choisir Région --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Arrondissement *</label>
                        <select id="p-arrondissement" required>
                            <option value="">-- Choisir Dept --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Localité spécifique</label>
                        <input type="text" id="p-localite" placeholder="Village, Quartier...">
                    </div>
                </div>
            </fieldset>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:25px;">
                <button type="button" class="btn" onclick="refreshAdminTable()">Annuler</button>
                <button type="submit" class="btn btn-save" style="background:#27ae60; color:white;">
                    VALIDER L'INSCRIPTION
                </button>
            </div>
        </form>
    `;

    // Chargement initial des régions
    fetch('/api/geo/api/regions')
        .then(res => res.json())
        .then(data => {
            const sel = document.getElementById('p-region');
            sel.innerHTML = '<option value="">-- Sélectionner --</option>';
            data.forEach(r => sel.innerHTML += `<option value="${r.id}">${r.nom}</option>`);
        });

    document.getElementById('form-producteur').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nom_producteur: document.getElementById('p-nom').value,
            tel_producteur: document.getElementById('p-tel').value,
            type_producteur: document.getElementById('p-type').value,
            carte_membre: document.getElementById('p-carte').value === 'true',
            region_id: parseInt(document.getElementById('p-region').value),
            departement_id: parseInt(document.getElementById('p-departement').value),
            arrondissement_id: parseInt(document.getElementById('p-arrondissement').value),
            localite: document.getElementById('p-localite').value,
            statut: 'actif'
        };
        await submitForm('/api/producteurs', payload);
    };
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
// --- FROMULAIRE DES UTILISATEURS ---
/**
 * Affiche le formulaire de création d'un utilisateur
 * @param {HTMLElement} wrapper - Le conteneur où injecter le formulaire
 */
function showFormUsers(wrapper) {
    wrapper.innerHTML = `
        <div class="form-container" style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
            <h3 style="margin-top:0;"><i class="fa-solid fa-user-plus"></i> Créer un nouvel utilisateur</h3>
            <form id="form-user-creation">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    
                    <div class="form-group">
                        <label>Nom d'utilisateur (Identifiant de connexion) *</label>
                        <input type="text" id="u-username" name="username" required placeholder="ex: jdoe">
                    </div>

                    <div class="form-group">
                        <label>Mot de passe *</label>
                        <input type="password" id="u-password" name="password" required>
                    </div>

                    <div class="form-group">
                        <label>Rôle Système *</label>
                        <select id="u-role" name="role" required>
                            <option value="stock">Agent de Stock (Admission)</option>
                            <option value="caisse">Agent de Caisse</option>
                            <option value="admin">Gestionnaire de Magasin</option>
                            <option value="auditeur">Auditeur (Lecture seule)</option>
                            <option value="superadmin">Super-Administrateur</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Magasin d'affectation</label>
                        <select id="u-magasin" name="magasin_id">
                            <option value="">-- Aucun (Utilisateur Central) --</option>
                            </select>
                    </div>

                    <div class="form-group">
                        <label>Prénom</label>
                        <input type="text" id="u-prenom" name="prenom">
                    </div>

                    <div class="form-group">
                        <label>Nom</label>
                        <input type="text" id="u-nom" name="nom">
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="u-email" name="email">
                    </div>

                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="tel" id="u-telephone" name="telephone">
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn" onclick="refreshAdminTable()">Annuler</button>
                    <button type="submit" class="btn btn-save" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Enregistrer l'utilisateur
                    </button>
                </div>
            </form>
        </div>
    `;

    // Charger dynamiquement les magasins dans le select
    fetchMagasinsForSelect('u-magasin');

    // Gestion de la soumission
    document.getElementById('form-user-creation').onsubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            username: document.getElementById('u-username').value,
            password: document.getElementById('u-password').value,
            role: document.getElementById('u-role').value,
            magasin_id: document.getElementById('u-magasin').value || null,
            prenom: document.getElementById('u-prenom').value,
            nom: document.getElementById('u-nom').value,
            email: document.getElementById('u-email').value,
            telephone: document.getElementById('u-telephone').value,
            statut: 'actif'
        };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Utilisateur créé avec succès !');
                refreshAdminTable(); // Recharge le tableau des utilisateurs
            } else {
                const err = await response.json();
                alert('Erreur : ' + err.error);
            }
        } catch (error) {
            console.error('Erreur soumission utilisateur:', error);
        }
    };
}

/**
 * Charge les magasins depuis l'API pour remplir un <select>
 */
async function fetchMagasinsForSelect(selectId) {
    try {
        const res = await fetch('/api/magasins');
        const magasins = await res.json();
        const select = document.getElementById(selectId);
        magasins.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.nom} (${m.code})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Impossible de charger les magasins', err);
    }
}
// --- FORMULAIRE LOTS (PRODUITS) ---
function showFormLots(wrapper) {
    wrapper.innerHTML = `
        <form id="form-lot" style="background:white; padding:25px; border-radius:8px; max-width:1000px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top:0; color:var(--admin); border-bottom:2px solid #eee; padding-bottom:10px;">
                <i class="fa-solid fa-box-open"></i> Référentiel Produit : Création d'un Lot
            </h3>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Catégorie *</label>
                    <select id="lot-categorie" required style="width:100%; padding:12px; border-radius:6px; border:1px solid #ddd;">
                        <option value="">-- Sélectionner une catégorie --</option>
                        
                        <optgroup label="Agriculture & Nature">
                            <option value="frais">Produits Frais (Vivres frais)</option>
                            <option value="secs">Céréales, Grains et Légumineuses</option>
                            <option value="huiles_liquides">Huiles et Produits Liquides</option>
                            <option value="produits_foret">Produits de la Forêt (PFNL / NTFP)</option>
                        </optgroup>
                    
                        <optgroup label="Artisanat & Objets">
                            <option value="artisanat_utilitaire">Artisanat Utilitaire (Meubles, Poterie, Paniers)</option>
                            <option value="artisanat_art">Artisanat d'Art & Décoration</option>
                            <option value="ustensiles_traditionnels">Ustensiles & Outils de fabrication (Forge, Bois)</option>
                        </optgroup>
                    
                        <optgroup label="Transformés & Manufacturés">
                            <option value="cosmetiques_locaux">Savonnerie & Cosmétiques (Beurre de Karité/Moringa)</option>
                            <option value="manufactures_alim">Manufacturés Alimentaires (Conserves, Farines)</option>
                            <option value="manufactures_non_alim">Manufacturés Non Alimentaires</option>
                        </optgroup>
                    
                        <optgroup label="Gestion Spécifique">
                            <option value="sensibles">Produits de Haute Valeur / Sensibles</option>
                        </optgroup>
                    </select>
                                    </div>

                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Description du produit *</label>
                    <input type="text" id="lot-description" placeholder="Ex: Huile de palme raffinée" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>

                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Prix de Référence (FCFA/Unité) *</label>
                    <input type="number" id="lot-prix-ref" step="0.01" min="0" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
            </div>

            <div style="margin-top:25px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">Unités de mesure admises *</label>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; background:#f8f9fa; padding:15px; border-radius:6px; border:1px solid #eee;">
                    ${['kg', 'gr', 'litres', 'unites', 'sacs', 'caisses', 'bottes', 'plateaux'].map(u => `
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                            <input type="checkbox" name="unite" value="${u}"> ${u === 'unites' ? 'Unités (pièces)' : u.charAt(0).toUpperCase() + u.slice(1)}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top:25px; border-top:2px solid #eee; padding-top:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0; color:#555;">
                        <i class="fa-solid fa-clipboard-check"></i> Critères de Contrôle Qualité (Admission)
                    </h4>
                    <button type="button" onclick="ajouterCriterePersonnalise()" style="background:#f0f0f0; padding:6px 12px; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:13px;">
                        <i class="fa-solid fa-plus"></i> Critère personnalisé
                    </button>
                </div>
                
                <div id="zone-criteres-auto" style="background:#f1f8e9; padding:15px; border-radius:6px; border-left:4px solid #4caf50; margin-bottom:15px; display:none;">
                    <div style="font-size:11px; font-weight:bold; color:#2e7d32; margin-bottom:10px; text-transform:uppercase;">
                        📋 Critères standards recommandés
                    </div>
                    <div id="liste-criteres-auto" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;"></div>
                </div>

                <div id="zone-criteres-personnalises" style="display:grid; gap:10px;"></div>

                <textarea id="lot-criteres-notes" placeholder="Instructions spéciales pour les agents de réception..." style="width:100%; height:70px; padding:10px; border:1px solid #ddd; border-radius:4px; margin-top:15px; font-family:inherit; resize:vertical;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:25px; padding-top:20px; border-top:1px solid #eee;">
                <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee; padding:12px 25px; border:none; border-radius:6px; cursor:pointer;">Annuler</button>
                <button type="submit" class="btn" style="background:var(--admin); color:white; padding:12px 35px; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
                    <i class="fa-solid fa-save"></i> ENREGISTRER LE PRODUIT
                </button>
            </div>
        </form>
    `;

    document.getElementById('form-lot').onsubmit = async (e) => {
        e.preventDefault();
        const unitesChecked = Array.from(document.querySelectorAll('input[name="unite"]:checked')).map(cb => cb.value);
        if (unitesChecked.length === 0) return alert('❌ Sélectionnez au moins une unité.');
        
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
            description: document.getElementById('lot-description').value.trim(),
            prix_ref: parseFloat(document.getElementById('lot-prix-ref').value),
            unites_admises: unitesChecked,
            criteres_admission: [...criteresAuto, ...criteresPerso],
            notes: document.getElementById('lot-criteres-notes').value.trim()
        };

        await submitForm('/api/lots', payload);
    };
} // <--- C'est CETTE ACCOLADE qui manquait !

// === FONCTION : CHARGEMENT DES CRITÈRES PAR CATÉGORIE ===
function chargerCriteresParCategorie() {
    const cat = document.getElementById('lot-categorie').value;
    const zoneAuto = document.getElementById('zone-criteres-auto');
    const listeAuto = document.getElementById('liste-criteres-auto');
    
const categoriesMapping = {
    // ... catégories existantes (frais, secs, etc.) ...
    
    'produits_foret': [
        'Identification correcte de l\'espèce',
        'Séchage ou état de conservation',
        'Absence de moisissures/parasites',
        'Pureté (absence d\'écorces étrangères)',
        'Conditionnement (sacs propres)'
    ],
    'ustensiles_traditionnels': [
        'Qualité de la forge ou de la taille',
        'Solidité des manches et fixations',
        'Sécurité d\'utilisation (pas de bords tranchants imprévus)',
        'Absence de corrosion (pour le métal)',
        'Ergonomie et poids'
    ],
    'cosmetiques_locaux': [
        'Texture et homogénéité',
        'Odeur caractéristique (absence de rancissement)',
        'Étanchéité du contenant',
        'Date de fabrication/péremption visible',
        'Clarté des instructions d\'usage'
    ],
    // Rappel des catégories artisanat demandées précédemment
    'artisanat_utilitaire': [
        'Solidité et assemblage (stabilité)',
        'Finition des surfaces (ponçage, vernis)',
        'Absence de fissures ou défauts majeurs',
        'Conformité aux dimensions/usage',
        'Esthétique globale et symétrie'
    ],
    'artisanat_art': [
        'Qualité des matériaux de base',
        'Finesse des détails et ornements',
        'Authenticité du style/technique',
        'Absence de fragilité excessive',
        'Propreté et présentation finale'
    ],
        'frais': [
            'Aspect visuel (couleur, fermeté)',
            'Absence de moisissure ou pourriture',
            'Absence d\'insectes ou parasites',
            'Odeur normale (pas de fermentation)',
            'Température de conservation respectée',
            'Date de récolte < 48h',
            'Conditionnement propre et intact'
        ],
        'court': [
            'Fraîcheur apparente',
            'Absence de flétrissement',
            'Feuillage vert et turgescent',
            'Racines ou tiges non endommagées',
            'Absence de terre excessive',
            'Calibrage homogène',
            'Emballage aéré et propre'
        ],
        'secs': [
            'Taux d\'humidité conforme (< 14%)',
            'Absence de moisissure',
            'Grains entiers et sains',
            'Absence d\'insectes (charançons, etc.)',
            'Couleur uniforme et typique',
            'Absence d\'odeur de fermentation',
            'Absence de corps étrangers',
            'Conditionnement étanche et sec'
        ],
        'manufactures_alim': [
            'Date de péremption valide',
            'Emballage intact (non percé, non gonflé)',
            'Étiquetage conforme et lisible',
            'Absence de rouille (conserves)',
            'Température de stockage respectée',
            'Numéro de lot visible',
            'Certification sanitaire valide'
        ],
        'manufactures_non_alim': [
            'Emballage intact et scellé',
            'Étiquetage présent et lisible',
            'Date de fabrication visible',
            'Absence de dommages physiques',
            'Conformité aux normes',
            'Certificat de qualité (si applicable)',
            'Stockage approprié (T°, humidité)'
        ],
        'sensibles': [
            '⚠️ Contrôle sanitaire obligatoire',
            'Certificat vétérinaire ou phytosanitaire',
            'Traçabilité complète (origine, lot)',
            'Chaîne du froid respectée',
            'Analyses de laboratoire récentes',
            'Conditionnement conforme (hermétique)',
            'Étiquetage de danger (si applicable)',
            'Autorisation de transport'
        ]
    };
window.COOP_CRITERIA = categoriesMapping;
    listeAuto.innerHTML = "";
    if (categoriesMapping[cat]) {
        zoneAuto.style.display = 'block';
        categoriesMapping[cat].forEach(critere => {
            const div = document.createElement('div');
            div.innerHTML = `
                <label style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:4px; border:1px solid #e0e0e0; cursor:pointer; font-size:13px;">
                    <input type="checkbox" value="${critere}" checked> 
                    <span>${critere}</span>
                </label>
            `;
            listeAuto.appendChild(div);
        });
    } else {
        zoneAuto.style.display = 'none';
    }
}

function ajouterCriterePersonnalise() {
    const zone = document.getElementById('zone-criteres-personnalises');
    const div = document.createElement('div');
    div.className = 'critere-personnalise';
    div.style = "display:flex; gap:10px; margin-bottom:10px; align-items:center; background:#fff; padding:5px; border-radius:4px;";
    div.innerHTML = `
        <input type="text" placeholder="Nouveau critère..." style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:13px;">
        <select style="padding:8px; border:1px solid #ddd; border-radius:4px; width:110px; font-size:12px;">
            <option value="obligatoire">Obligatoire</option>
            <option value="optionnel">Optionnel</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:18px;">&times;</button>
    `;
    zone.appendChild(div);
}

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

/**
 * Charge les données géographiques en cascade depuis geo.js
 */
async function chargerGeographie(type, parentId, targetSelectId) {
    const select = document.getElementById(targetSelectId);
    if (!parentId) {
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        return;
    }

    // On définit le nom du paramètre en fonction du type (region_id ou departement_id)
    const paramName = (type === 'departements') ? 'region_id' : 'departement_id';

    try {
        const res = await fetch(`/api/geo/api/${type}?${paramName}=${parentId}`);
        const data = await res.json();
        
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.nom;
            select.appendChild(opt);
        });
        
        // Si on change de région, on réinitialise aussi les arrondissements
        if (type === 'departements') {
            const arrSelect = document.getElementById('p-arrondissement');
            if (arrSelect) arrSelect.innerHTML = '<option value="">-- Choisir Dept --</option>';
        }
    } catch (err) {
        console.error(`❌ Erreur chargement ${type}:`, err);
    }
}

async function deleteItem(section, id) {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    const apiMap = { 'utilisateurs': 'users', 'employes': 'employers', 'magasins': 'magasins', 'lots': 'lots' };
    const endpoint = apiMap[section] || section;

    try {
        const res = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
        if (res.ok) refreshAdminTable();
        else {
            const err = await res.json();
            alert("Erreur: " + (err.message || "Impossible de supprimer"));
        }
    } catch (error) {
        console.error("Erreur delete:", error);
    }
}
