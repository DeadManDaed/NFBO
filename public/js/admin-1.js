<script>


// 2. Chargement des données (API)
async function refreshAdminTable() {
    const wrapper = document.getElementById('admin-table-wrapper');
    wrapper.innerHTML = "Chargement...";
    
    let endpoint;
    let errorMessage;
    
    // Mapping précis des sections vers les endpoints API
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
            wrapper.innerHTML = `<p style='color:orange; padding:20px;'>
                ⚠️ Section "${currentSection}" non reconnue.<br>
                Veuillez contacter l'administrateur système.
            </p>`;
            console.error(`Section admin inconnue : ${currentSection}`);
            return; // On sort de la fonction
    }
    
    try {
        const res = await fetch(endpoint);
        
        // Gestion des codes HTTP d'erreur
        if (!res.ok) {
            if (res.status === 404) {
                throw new Error(`Endpoint ${endpoint} introuvable (404)`);
            } else if (res.status === 403) {
                throw new Error(`Accès refusé (403). Droits insuffisants.`);
            } else if (res.status === 500) {
                throw new Error(`Erreur serveur (500)`);
            } else {
                throw new Error(`Erreur HTTP ${res.status}`);
            }
        }
        
        const data = await res.json();
        
        // Vérification que les données sont bien un tableau
        if (!Array.isArray(data)) {
            throw new Error('Format de données invalide (tableau attendu)');
        }
        
        renderAdminTable(data);
        
    } catch (err) {
        console.error('Erreur refreshAdminTable:', err);
        
        wrapper.innerHTML = `
            <div style='background:#ffebee; padding:20px; border-radius:8px; border-left:4px solid #d32f2f;'>
                <h4 style='color:#c62828; margin-top:0;'>
                    <i class="fa-solid fa-triangle-exclamation"></i> ${errorMessage}
                </h4>
                <p style='color:#555; font-size:14px; margin:10px 0;'>
                    <strong>Détails techniques :</strong> ${err.message}
                </p>
                <button class="btn" onclick="refreshAdminTable()" style="background:#d32f2f; color:white; margin-top:10px;">
                    <i class="fa-solid fa-rotate"></i> Réessayer
                </button>
            </div>
        `;
        
        // Log pour l'analyse système
        logDeploymentError(`Admin-Load-${currentSection}`, err);
    }
}
    // Toujours garder le bouton visible et actif
const btnAdd = document.getElementById('btn-add-admin');

// pas besoin de switch ici, le bouton appelle toujours showAdminForm()

// 3. Rendu du tableau dynamique
function renderAdminTable(data) {
    const wrapper = document.getElementById('admin-table-wrapper');
    if(!data || data.length === 0) {
        wrapper.innerHTML = "Aucune donnée trouvée.";
        return;
    }

    const headers = Object.keys(data[0]);
    let html = `<table class="admin-table"><thead><tr>`;
    headers.forEach(h => html += `<th>${h.replace('_', ' ')}</th>`);
    html += `<th>Actions</th></tr></thead><tbody>`;
    
    data.forEach(row => {
        html += `<tr>`;
        headers.forEach(h => html += `<td>${row[h] || ''}</td>`);
        html += `<td><button onclick="deleteItem('${currentSection}', ${row.id})">🗑️</button></td></tr>`;
    });
    
    html += `</tbody></table>`;
    wrapper.innerHTML = html;
}

// 4. Formulaire avec CASCADE GEOGRAPHIQUE
// 4. Formulaire dynamique selon la section
function showAdminForm() {
    const wrapper = document.getElementById('admin-table-wrapper');
    
    switch(currentSection) {
        case 'magasins':
            showFormMagasins(wrapper);
            break;
        case 'users':
        case 'utilisateurs':
            showFormUsers(wrapper);
            break;
        case 'employers':
        case 'employes':
            showFormEmployers(wrapper);
            break;
        case 'producteurs':
            showFormProducteurs(wrapper);
            break;
        case 'lots':
            showFormLots(wrapper);
            break;
        case 'validations':
            wrapper.innerHTML = `<p style="padding:20px; color:#666;">Les validations ne nécessitent pas de création manuelle.</p>`;
            break;
        default:
            wrapper.innerHTML = `<p style="padding:20px; color:orange;">⚠️ Formulaire "${currentSection}" non implémenté.</p>`;
    }
}

// === FORMULAIRE MAGASINS ===
function showFormMagasins(wrapper) {
    wrapper.innerHTML = `
        <form id="form-magasin" style="background:white; padding:20px; border-radius:8px; max-width:600px;">
            <h3 style="margin-top:0; color:var(--admin);">Nouveau Magasin</h3>
            <div style="display:grid; gap:15px;">
                <div class="form-group">
                    <label>Nom du magasin *</label>
                    <input type="text" id="magasin-nom" placeholder="Ex: Magasin Central Yaoundé" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Code *</label>
                    <input type="text" id="magasin-code" placeholder="Ex: YDE001" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;" maxlength="10">
                </div>
                <div class="form-group">
                    <label>Région</label>
                    <select id="magasin-region" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Sélectionner une région --</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee;">Annuler</button>
                    <button type="submit" class="btn" style="background:var(--admin); color:white;">Enregistrer</button>
                </div>
            </div>
        </form>
    `;
    
    // Charger les régions
    loadReference('regions', 'magasin-region');
    
    // Soumission
    document.getElementById('form-magasin').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nom: document.getElementById('magasin-nom').value.trim(),
            code: document.getElementById('magasin-code').value.trim().toUpperCase(),
            region_id: document.getElementById('magasin-region').value || null
        };
        
        try {
            const res = await fetch('/api/magasins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error(await res.text());
            
            alert('✅ Magasin créé avec succès !');
            await refreshAdminTable();
        } catch (err) {
            alert('❌ Erreur : ' + err.message);
        }
    });
}

// === FORMULAIRE UTILISATEURS ===
function showFormUsers(wrapper) {
    wrapper.innerHTML = `
        <form id="form-user" style="background:white; padding:20px; border-radius:8px; max-width:900px;">
            <h3 style="margin-top:0; color:var(--admin);">Nouvel Utilisateur</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
                <div class="form-group">
                    <label>Prénom *</label>
                    <input type="text" id="user-prenom" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="user-nom" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Nom d'utilisateur *</label>
                    <input type="text" id="user-username" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Mot de passe *</label>
                    <input type="password" id="user-password" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Rôle *</label>
                    <select id="user-role" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Choisir un rôle --</option>
                        <option value="superadmin">Superadmin</option>
                        <option value="admin">Admin</option>
                        <option value="auditeur">Auditeur</option>
                        <option value="caisse">Caisse</option>
                        <option value="stock">Stock</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="user-email" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="user-telephone" placeholder="+237 6XX XX XX XX" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Magasin d'affectation</label>
                    <select id="user-magasin-select" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Choisir un magasin --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="user-statut" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                    </select>
                </div>
                <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
                    <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee;">Annuler</button>
                    <button type="submit" class="btn" style="background:var(--admin); color:white;">Créer l'utilisateur</button>
                </div>
            </div>
        </form>
    `;

    loadReference('magasins', 'user-magasin-select', null, m => `${m.nom} (${m.code})`);

    document.getElementById('form-user').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('user-username').value.trim(),
            password: document.getElementById('user-password').value,
            role: document.getElementById('user-role').value,
            prenom: document.getElementById('user-prenom').value.trim(),
            nom: document.getElementById('user-nom').value.trim(),
            email: document.getElementById('user-email').value.trim() || null,
            telephone: document.getElementById('user-telephone').value.trim() || null,
            magasin_id: document.getElementById('user-magasin-select').value || null,
            statut: document.getElementById('user-statut').value || 'actif'
        };

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(await res.text());

            alert('✅ Utilisateur créé avec succès !');
            await refreshAdminTable();
        } catch (err) {
            alert('❌ Erreur : ' + err.message);
        }
    });
}

// === FORMULAIRE EMPLOYÉS ===
function showFormEmployers(wrapper) {
    wrapper.innerHTML = `
        <form id="form-employer" style="background:white; padding:20px; border-radius:8px; max-width:700px;">
            <h3 style="margin-top:0; color:var(--admin);">Nouvel Employé</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group">
                    <label>Nom complet *</label>
                    <input type="text" id="employer-nom" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Rôle *</label>
                    <select id="employer-role" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Choisir un rôle --</option>
                        <option value="manutentionnaire">Manutentionnaire</option>
                        <option value="securite">Sécurité</option>
                        <option value="chauffeur">Chauffeur</option>
                        <option value="caissier">Caissier</option>
                        <option value="magasinier">Magasinier</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="nettoyage">Nettoyage</option>
                        <option value="logistique">Logistique</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Contact</label>
                    <input type="tel" id="employer-contact" placeholder="+237 6XX XX XX XX" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Magasin d'affectation</label>
                    <select id="employer-magasin" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Choisir un magasin --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Matricule</label>
                    <input type="text" id="employer-matricule" placeholder="Ex: EMP-001" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="employer-statut" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                    </select>
                </div>
                <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee;">Annuler</button>
                    <button type="submit" class="btn" style="background:var(--admin); color:white;">Enregistrer</button>
                </div>
            </div>
        </form>
    `;

    loadReference('magasins', 'employer-magasin', null, m => `${m.nom} (${m.code})`);

    document.getElementById('form-employer').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nom: document.getElementById('employer-nom').value.trim(),
            role: document.getElementById('employer-role').value,
            contact: document.getElementById('employer-contact').value.trim() || null,
            magasin_id: document.getElementById('employer-magasin').value || null,
            matricule: document.getElementById('employer-matricule').value.trim() || null,
            statut: document.getElementById('employer-statut').value || 'actif',
            date_embauche: new Date().toISOString().split('T')[0]
        };

        try {
            const res = await fetch('/api/employers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(await res.text());

            alert('✅ Employé créé avec succès !');
            await refreshAdminTable();
        } catch (err) {
            alert('❌ Erreur : ' + err.message);
        }
    });
}

// === FORMULAIRE PRODUCTEURS (VERSION CORRIGÉE) ===
function showFormProducteurs(wrapper) {
    wrapper.innerHTML = `
        <form id="form-producteur" style="background:white; padding:20px; border-radius:8px; max-width:800px;">
            <h3 style="margin-top:0; color:var(--admin);">Nouveau Producteur</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="form-group">
                    <label>Nom complet *</label>
                    <input type="text" id="prod-nom" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Téléphone *</label>
                    <input type="tel" id="prod-tel" required placeholder="+237 6XX XX XX XX" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Type de producteur *</label>
                    <select id="prod-type" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Sélectionner --</option>
                        <option value="Agriculteur">Agriculteur</option>
                        <option value="Éleveur">Éleveur</option>
                        <option value="Pêcheur">Pêcheur</option>
                        <option value="Transformateur">Transformateur</option>
                        <option value="Collecteur">Collecteur</option>
                        <option value="Coopérative">Coopérative</option>
                        <option value="Autre">Autre</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Matricule</label>
                    <input type="text" id="prod-matricule" placeholder="Ex: PROD-001" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="form-group">
                    <label>Région *</label>
                    <select id="prod-region" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Chargement... --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Département *</label>
                    <select id="prod-departement" disabled required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Sélectionner d'abord une région --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Arrondissement</label>
                    <select id="prod-arrondissement" disabled style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">-- Sélectionner d'abord un département --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Localité</label>
                    <input type="text" id="prod-localite" placeholder="Village, quartier..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee;">Annuler</button>
                    <button type="submit" class="btn" style="background:var(--admin); color:white;">Enregistrer</button>
                </div>
            </div>
        </form>
    `;

    // Charger les régions au démarrage
    loadReference('regions', 'prod-region');

    // Gestion de la cascade Région → Département
    document.getElementById('prod-region').addEventListener('change', function() {
        const regionId = this.value;
        const depSelect = document.getElementById('prod-departement');
        const arrSelect = document.getElementById('prod-arrondissement');
        
        if (!regionId) {
            depSelect.disabled = true;
            depSelect.innerHTML = '<option value="">-- Sélectionner d\'abord une région --</option>';
            arrSelect.disabled = true;
            arrSelect.innerHTML = '<option value="">-- Sélectionner d\'abord un département --</option>';
            return;
        }
        
        // Charger les départements de cette région
        loadReference('departements', 'prod-departement', regionId);
        
        // Réinitialiser les arrondissements
        arrSelect.disabled = true;
        arrSelect.innerHTML = '<option value="">-- Sélectionner d\'abord un département --</option>';
    });

    // Gestion de la cascade Département → Arrondissement
    document.getElementById('prod-departement').addEventListener('change', function() {
        const departementId = this.value;
        const arrSelect = document.getElementById('prod-arrondissement');
        
        if (!departementId) {
            arrSelect.disabled = true;
            arrSelect.innerHTML = '<option value="">-- Sélectionner d\'abord un département --</option>';
            return;
        }
        
        // Charger les arrondissements de ce département
        loadReference('arrondissements', 'prod-arrondissement', departementId);
    });

    // Soumission du formulaire
    document.getElementById('form-producteur').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            nom_producteur: document.getElementById('prod-nom').value.trim(),
            tel_producteur: document.getElementById('prod-tel').value.trim(),
            type_producteur: document.getElementById('prod-type').value,
            matricule: document.getElementById('prod-matricule').value.trim() || null,
            region_id: document.getElementById('prod-region').value || null,
            departement_id: document.getElementById('prod-departement').value || null,
            arrondissement_id: document.getElementById('prod-arrondissement').value || null,
            localite: document.getElementById('prod-localite').value.trim() || null,
            statut: 'actif'
        };

        try {
            const res = await fetch('/api/producteurs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            alert('✅ Producteur créé avec succès !');
            await refreshAdminTable();
        } catch (err) {
            console.error('Erreur création producteur:', err);
            alert('❌ Erreur : ' + err.message);
        }
    });
} 


// // === FORMULAIRE LOTS AVEC CRITÈRES AUTOMATIQUES ===
function showFormLots(wrapper) {
    wrapper.innerHTML = `
        <form id="form-lot" style="background:white; padding:25px; border-radius:8px; max-width:1000px;">
            <h3 style="margin-top:0; color:var(--admin);">Nouveau Lot (Produit)</h3>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
                <div class="form-group">
                    <label>Catégorie *</label>
                    <select id="lot-categorie" required onchange="chargerCriteresParCategorie()" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                        <option value="">Sélectionner une catégorie</option>
                        <option value="frais">Produits frais</option>
                        <option value="court">Cycle court</option>
                        <option value="secs">Produits secs</option>
                        <option value="manufactures_alim">Manufacturés alimentaires</option>
                        <option value="manufactures_non_alim">Manufacturés non alimentaires</option>
                        <option value="sensibles">Produits sensibles</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Description *</label>
                    <input type="text" id="lot-description" placeholder="Ex: Maïs jaune sec" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>

                <div class="form-group">
                    <label>Prix de Référence (FCFA/Unité) *</label>
                    <input type="number" id="lot-prix-ref" step="0.01" min="0" required style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px;">
                </div>
            </div>

            <div style="margin-top:25px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">Unités admises *</label>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; background:#f8f9fa; padding:15px; border-radius:6px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="kg"> Kilogrammes (kg)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="gr"> Grammes (gr)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="litres"> Litres (L)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="unites"> Unités (pièces)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="sacs"> Sacs
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="caisses"> Caisses
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="bottes"> Bottes
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" name="unite" value="plateaux"> Plateaux
                    </label>
                </div>
            </div>

            <div style="margin-top:25px; border-top:2px solid #eee; padding-top:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0; color:#555;">
                        <i class="fa-solid fa-clipboard-check"></i> Critères d'admission (contrôle qualité)
                    </h4>
                    <button type="button" onclick="ajouterCriterePersonnalise()" style="background:#eee; padding:6px 12px; border:none; border-radius:4px; cursor:pointer; font-size:13px;">
                        + Ajouter un critère
                    </button>
                </div>
                
                <div id="zone-criteres-auto" style="background:#f1f8e9; padding:15px; border-radius:6px; border-left:4px solid var(--primary); margin-bottom:15px; display:none;">
                    <div style="font-size:12px; font-weight:bold; color:var(--primary); margin-bottom:10px;">
                        📋 CRITÈRES SUGGÉRÉS POUR CETTE CATÉGORIE
                    </div>
                    <div id="liste-criteres-auto" style="display:grid; gap:8px;">
                        <!-- Les critères seront insérés ici automatiquement -->
                    </div>
                </div>

                <div id="zone-criteres-personnalises" style="display:grid; gap:10px;">
                    <!-- Les critères personnalisés apparaîtront ici -->
                </div>

                <textarea id="lot-criteres-notes" placeholder="Notes supplémentaires ou instructions spéciales..." style="width:100%; height:80px; padding:10px; border:1px solid #ddd; border-radius:4px; margin-top:15px; font-family:inherit; resize:vertical;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:25px; padding-top:20px; border-top:1px solid #eee;">
                <button type="button" class="btn" onclick="refreshAdminTable()" style="background:#eee; padding:12px 25px;">Annuler</button>
                <button type="submit" class="btn" style="background:var(--admin); color:white; padding:12px 35px; font-weight:bold;">
                    <i class="fa-solid fa-save"></i> ENREGISTRER LE LOT
                </button>
            </div>
        </form>
    `;

    // Soumission du formulaire
    document.getElementById('form-lot').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Récupérer les unités cochées
        const unitesChecked = Array.from(document.querySelectorAll('input[name="unite"]:checked'))
            .map(cb => cb.value);
        
        if (unitesChecked.length === 0) {
            alert('❌ Veuillez sélectionner au moins une unité admise.');
            return;
        }
        
        // Récupérer tous les critères (auto + personnalisés)
        const criteresAuto = Array.from(document.querySelectorAll('#liste-criteres-auto input[type="checkbox"]:checked'))
            .map(cb => ({
                type: 'standard',
                critere: cb.value,
                obligatoire: true
            }));
        
        const criteresPerso = Array.from(document.querySelectorAll('.critere-personnalise'))
            .map(div => ({
                type: 'personnalise',
                critere: div.querySelector('input').value,
                obligatoire: div.querySelector('select').value === 'obligatoire'
            }))
            .filter(c => c.critere.trim() !== '');
        
        const tousCriteres = [...criteresAuto, ...criteresPerso];
        
        // Ajouter les notes si présentes
        const notes = document.getElementById('lot-criteres-notes').value.trim();
        if (notes) {
            tousCriteres.push({
                type: 'notes',
                critere: notes,
                obligatoire: false
            });
        }
        
        const payload = {
            categorie: document.getElementById('lot-categorie').value,
            description: document.getElementById('lot-description').value.trim(),
            prix_ref: parseFloat(document.getElementById('lot-prix-ref').value),
            unites_admises: unitesChecked,
            criteres_admission: tousCriteres
        };

        try {
            const res = await fetch('/api/lots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            alert('✅ Lot créé avec succès !');
            await refreshAdminTable();
        } catch (err) {
            console.error('Erreur création lot:', err);
            alert('❌ Erreur : ' + err.message);
        }
    });
}

// === FONCTION : CHARGEMENT DES CRITÈRES PAR CATÉGORIE ===
function chargerCriteresParCategorie() {
    const categorie = document.getElementById('lot-categorie').value;
    const zoneAuto = document.getElementById('zone-criteres-auto');
    const listeAuto = document.getElementById('liste-criteres-auto');
    
    if (!categorie) {
        zoneAuto.style.display = 'none';
        return;
    }
    
    // Base de critères par catégorie
    const criteresParCategorie = {
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
    
    const criteres = criteresParCategorie[categorie] || [];
    
    if (criteres.length === 0) {
        zoneAuto.style.display = 'none';
        return;
    }
    
    // Afficher les critères suggérés
    listeAuto.innerHTML = criteres.map(c => `
        <label style="display:flex; align-items:center; gap:10px; padding:8px; background:white; border-radius:4px; cursor:pointer; border:1px solid #ddd;">
            <input type="checkbox" value="${c}" checked style="width:18px; height:18px;">
            <span style="flex:1; font-size:14px;">${c}</span>
        </label>
    `).join('');
    
    zoneAuto.style.display = 'block';
}

// === FONCTION : AJOUTER UN CRITÈRE PERSONNALISÉ ===
let critereCounter = 0;
function ajouterCriterePersonnalise() {
    const zone = document.getElementById('zone-criteres-personnalises');
    critereCounter++;
    
    const div = document.createElement('div');
    div.className = 'critere-personnalise';
    div.style.cssText = 'display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center; padding:10px; background:#fff3e0; border-radius:6px; border-left:4px solid #ff9800;';
    
    div.innerHTML = `
        <input type="text" placeholder="Ex: Certificat d'origine obligatoire" style="padding:8px; border:1px solid #ddd; border-radius:4px;">
        <select style="padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="obligatoire">Obligatoire</option>
            <option value="recommande">Recommandé</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="padding:8px 12px; background:#d32f2f; color:white; border:none; border-radius:4px; cursor:pointer;">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    
    zone.appendChild(div);
} 

let currentSection = 'magasins';

// 1. Navigation entre les sections Admin
async function loadAdminSection(section) {
    currentSection = section;
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('admin-title').innerText = section.charAt(0).toUpperCase() + section.slice(1);
    
    await refreshAdminTable();
}
    function closeModule() {
        document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
        document.getElementById('main-grid').style.display = 'grid';
    }
const user = JSON.parse(sessionStorage.getItem('user'||'{"role": "guest", "nom", "inconnu"}');
    window.onload = init;
</script>
        </div>
<script>
  function openModule(id) {
    document.getElementById('main-grid').style.display = 'none';
    document.getElementById('module-' + id).style.display = 'block';
    
    // Initialisation selon le module
    if (id === 'admission') initModuleAdmission();
    if (id === 'messages') loadInbox();
    if (id === 'admin') loadAdminSection('magasins');
    if (id === 'audit') refreshAuditData();
}
     </script>   
