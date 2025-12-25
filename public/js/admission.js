/**
 * admission.js - Logique du Module d'Admission des Produits
 * Gère la réception, le contrôle qualité et le calcul financier
 */

let activeLotData = null;

// 1. INITIALISATION DU MODULE
// Cette fonction doit être appelée par ton gestionnaire de navigation principal
function initModuleAdmission() {
    console.log('🔵 Initialisation module Admission');
    
    // On réinitialise l'état
    activeLotData = null;
    
    // Chargement des listes déroulantes
    chargerLots();
    chargerProducteurs();
    chargerMagasins();

    // Attacher les écouteurs d'événements pour le calcul dynamique
    const qtyInput = document.getElementById('adm-qty');
    const qualityInput = document.getElementById('adm-quality');
    const lotSelect = document.getElementById('adm-lot-select');

    if (qtyInput) qtyInput.addEventListener('input', calculateInternalFinance);
    if (qualityInput) qualityInput.addEventListener('change', calculateInternalFinance);
    if (lotSelect) lotSelect.addEventListener('change', onAdmissionLotChange);
}

// 2. CHARGEMENT DES RÉFÉRENTIELS (LOTS, PRODUCTEURS, MAGASINS)
async function chargerLots() {
    // Si déjà en cache, on gagne du temps
    if (AppCache.lots.length > 0) {
        renderLotsSelect(AppCache.lots); 
        return;
    }
    const select = document.getElementById('adm-lot-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Chargement des lots... --</option>';
    
    try {
        const res = await fetch('/api/lots');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const lots = await res.json();
        
        if (!Array.isArray(lots) || lots.length === 0) {
            select.innerHTML = '<option value="">⚠️ Aucun lot disponible</option>';
            return;
        }
        
        select.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
            lots.map(lot => {
                const desc = lot.description || 'Sans description';
                const cat = lot.categorie || '';
                const prix = lot.prix_ref ? ` (${parseFloat(lot.prix_ref).toLocaleString()} FCFA)` : '';
                return `<option value="${lot.id}">${desc} ${cat ? '- ' + cat : ''}${prix}</option>`;
            }).join('');
        
    } catch (err) {
        console.error('❌ Erreur chargement lots:', err);
        select.innerHTML = '<option value="">❌ Erreur de chargement</option>';
    }
}

async function chargerProducteurs() {
    const select = document.getElementById('adm-producer-select');
    if (!select) return;
    
    try {
        const res = await fetch('/api/producteurs');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const producteurs = await res.json();
        
        select.innerHTML = '<option value="">-- Sélectionner un producteur --</option>' +
            producteurs.map(p => {
                const nom = p.nom_producteur || p.nom || 'Sans nom';
                const tel = p.tel_producteur ? ` (${p.tel_producteur})` : '';
                return `<option value="${p.id}">${nom}${tel}</option>`;
            }).join('');
    } catch (err) {
        console.error('❌ Erreur producteurs:', err);
    }
}

async function chargerMagasins() {
    const select = document.getElementById('adm-magasin-select');
    if (!select) return;
    
    try {
        const res = await fetch('/api/magasins');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const magasins = await res.json();
        
        select.innerHTML = '<option value="">-- Sélectionner un magasin --</option>' +
            magasins.map(m => `<option value="${m.id}">${m.nom || 'Magasin'} (${m.code || '?'})</option>`).join('');
    } catch (err) {
        console.error('❌ Erreur magasins:', err);
    }
}

// 3. LOGIQUE LORS DE LA SÉLECTION D'UN LOT
async function onAdmissionLotChange() {
    const lotId = document.getElementById('adm-lot-select').value;
    const infoPreview = document.getElementById('lot-info-preview');
    const unitSelect = document.getElementById('adm-unit');
    const qualityCard = document.getElementById('criteres-qualite-card');
    
    if (!lotId) {
        activeLotData = null;
        if (infoPreview) infoPreview.style.display = 'none';
        if (qualityCard) qualityCard.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`/api/lots/${lotId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        activeLotData = await res.json();
        
        // Mise à jour de l'affichage des infos de référence
        document.getElementById('lot-prix-display').innerText = parseFloat(activeLotData.prix_ref || 0).toLocaleString();
        document.getElementById('lot-categorie-display').innerText = activeLotData.categorie || '-';
        
        // Gestion des unités (désérialisation du JSON si nécessaire)
        let unites = activeLotData.unites_admises;
        if (typeof unites === 'string') unites = JSON.parse(unites);
        
        document.getElementById('lot-unites-display').innerText = Array.isArray(unites) ? unites.join(', ') : 'Non défini';
        
        if (unitSelect && Array.isArray(unites)) {
            unitSelect.innerHTML = unites.map(u => `<option value="${u}">${u}</option>`).join('');
        }

        // Affichage dynamique de la checklist Qualité
        let criteres = activeLotData.criteres_admission;
        if (typeof criteres === 'string') criteres = JSON.parse(criteres);

        if (Array.isArray(criteres) && criteres.length > 0) {
            document.getElementById('checklist-criteres').innerHTML = criteres.map(c => `
                <label style="display:flex; align-items:center; gap:10px; padding:8px; background:#f9f9f9; border-radius:4px; margin-bottom:5px; border:1px solid #eee;">
                    <input type="checkbox" ${c.obligatoire ? 'required' : ''}>
                    <span style="flex:1; font-size:14px;">${c.critere} ${c.obligatoire ? '<b style="color:red;">*</b>' : ''}</span>
                </label>
            `).join('');
            if (qualityCard) qualityCard.style.display = 'block';
        } else {
            if (qualityCard) qualityCard.style.display = 'none';
        }
        
        if (infoPreview) infoPreview.style.display = 'block';
        calculateInternalFinance();
        
    } catch (err) {
        console.error('❌ Erreur détails lot:', err);
    }
}

// 4. CALCULS FINANCIERS DYNAMIQUES
function calculateInternalFinance() {
    if (!activeLotData) return;

    const qty = parseFloat(document.getElementById('adm-qty').value) || 0;
    const qualityCoef = parseFloat(document.getElementById('adm-quality').value) || 0;
    const prixRef = parseFloat(activeLotData.prix_ref) || 0;

    // Calcul : Prix unitaire ajusté par la qualité
    // Note : On applique ici ta formule de gestion 
    const totalTheorique = qty * prixRef;
    const taxeGestion = 0.05; // 5% de frais de structure
    
    // Montant à payer au producteur (ajusté qualité - frais)
    const versementReel = (qty * prixRef * qualityCoef) * (1 - taxeGestion);
    
    // Profit virtuel (Différence entre valeur théorique et versement réel)
    const profitVirtuel = totalTheorique - versementReel;

    document.getElementById('val-due').innerText = Math.round(versementReel).toLocaleString() + ' FCFA';
    document.getElementById('val-profit').innerText = Math.round(profitVirtuel).toLocaleString() + ' FCFA';
}

// 5. SOUMISSION DU FORMULAIRE
const admissionForm = document.getElementById('admissionForm');
if (admissionForm) {
    admissionForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // On récupère les valeurs numériques propres
        const montantDue = parseFloat(document.getElementById('val-due').innerText.replace(/[^0-9]/g, ''));
        const profitVirtuel = parseFloat(document.getElementById('val-profit').innerText.replace(/[^0-9]/g, ''));

        const payload = {
            lot_id: document.getElementById('adm-lot-select').value,
            producteur_id: document.getElementById('adm-producer-select').value,
            magasin_id: document.getElementById('adm-magasin-select').value,
            quantite: parseFloat(document.getElementById('adm-qty').value),
            unite: document.getElementById('adm-unit').value,
            qualite: parseFloat(document.getElementById('adm-quality').value),
            montant_du: montantDue,
            profit_virtuel: profitVirtuel,
            date_admission: new Date().toISOString()
        };
        
        try {
            const res = await fetch('/api/admissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error(await res.text());
            
            alert('✅ Admission enregistrée avec succès !');
            admissionForm.reset();
            activeLotData = null;
            document.getElementById('lot-info-preview').style.display = 'none';
            
            // Si tu as une fonction pour fermer la modale/le module
            if (typeof closeModule === 'function') closeModule();
            
        } catch (err) {
            console.error('❌ Erreur:', err);
            alert('❌ Erreur : ' + err.message);
        }
    };
}
