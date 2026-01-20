//public/js/admin.js
const API_BASE = "https://nbfo-coop.onrender.com/api";
// 1. Navigation entre les sections Admin
async function loadAdminSection(section) {
    currentSection = section;
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('admin-title').innerText = section.charAt(0).toUpperCase() + section.slice(1);
    
    await refreshAdminTable();
}

async function loadGeo() {
  try {
    const regionsResp = await fetch(`${API_BASE}/regions`);
    const regions = await regionsResp.json();
    document.getElementById('region').innerHTML =
      regions.map(r => `<option value="${r.id}">${r.nom}</option>`).join('');

    document.getElementById('region').addEventListener('change', async (e) => {
      const depResp = await fetch(`${API_BASE}/departements?region_id=${e.target.value}`);
      const deps = await depResp.json();
      document.getElementById('departement').innerHTML =
        deps.map(d => `<option value="${d.id}">${d.nom}</option>`).join('');
    });

    document.getElementById('departement').addEventListener('change', async (e) => {
      const arrResp = await fetch(`${API_BASE}/arrondissements?departement_id=${e.target.value}`);
      const arrs = await arrResp.json();
      document.getElementById('arrondissement').innerHTML =
        arrs.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');
    });
  } catch (err) {
    console.error("Erreur chargement géo", err);
  }
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
    const cat = document.getElementById('lot-categorie').value;
    const zoneAuto = document.getElementById('zone-criteres-auto');
    const listeAuto = document.getElementById('liste-criteres-auto');
    
    if (!categorie) {
        zoneAuto.style.display = 'none';
        return;
    }
    
    // Base de critères par catégorie
     const categoriesMapping = {
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
        ],
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
            ]
    };
    listeAuto.innerHTML = "";
    if (categoriesMapping[cat]) {
        zoneAuto.style.display = 'block';
        categoriesMapping[cat].forEach(critere => {
            const div = document.createElement('div');
            div.innerHTML = `
                <label style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:4px; border:1px solid #e0e0e0; cursor:pointer;">
                    <input type="checkbox" value="${critere}" checked> 
                    <span>${critere}</span>
                    <span style="margin-left:auto; font-size:10px; color:#888;">(Obligatoire)</span>
                </label>
            `;
            listeAuto.appendChild(div);
        });
    } else {
        zoneAuto.style.display = 'none';
    }
    window.COOP_CRITERIA = categoriesMapping;
}

// === FONCTION : AJOUTER UN CRITÈRE PERSONNALISÉ ===
let critereCounter = 0;
function ajouterCriterePersonnalise() {
    const zone = document.getElementById('zone-criteres-personnalises');
    const div = document.createElement('div');
    div.className = 'critere-personnalise';
    div.style = "display:flex; gap:10px; align-items:center;";
    div.innerHTML = `
        <input type="text" placeholder="Nom du critère spécifique..." style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
        <select style="padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="obligatoire">Obligatoire</option>
            <option value="optionnel">Optionnel</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="color:red; border:none; background:none; cursor:pointer;">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    zone.appendChild(div);
}
loadGeo();
