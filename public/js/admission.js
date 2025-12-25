/**
 * admission.js - Logique corrigée
 */

let activeLotData = null;

// 1. INITIALISATION
function initModuleAdmission() {
    console.log('🔵 Initialisation module Admission');
    activeLotData = null;

    chargerLots();
    chargerProducteurs();
    chargerMagasins();

    // Reset des affichages financiers
    document.getElementById('val-due').innerText = '0 FCFA';
    document.getElementById('val-profit').innerText = '0 FCFA';
}

// 2. CHARGEMENT (CORRECTIONS DES TESTS DE CACHE)
async function chargerLots() {
    const select = document.getElementById('adm-lot-select');
    if (!select) return;
    try {
        const res = await fetch('/api/lots');
        const lots = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
            lots.map(lot => `<option value="${lot.id}">${lot.description || 'Lot'} (${lot.categorie || ''})</option>`).join('');
    } catch (err) { console.error('Erreur lots:', err); }
}

async function chargerProducteurs() {
    const select = document.getElementById('adm-producer-select');
    if (!select) return;
    try {
        const res = await fetch('/api/producteurs');
        const producteurs = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner un producteur --</option>' +
            producteurs.map(p => `<option value="${p.id}">${p.nom_producteur || p.nom}</option>`).join('');
    } catch (err) { console.error('Erreur producteurs:', err); }
}

async function chargerMagasins() {
    const select = document.getElementById('adm-magasin-select');
    if (!select) return;
    try {
        const res = await fetch('/api/magasins');
        const magasins = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner un magasin --</option>' +
            magasins.map(m => `<option value="${m.id}">${m.nom} (${m.code})</option>`).join('');
    } catch (err) { console.error('Erreur magasins:', err); }
}

// 3. LOGIQUE SÉLECTION LOT (FIX UNITÉS)
async function onAdmissionLotChange() {
    const lotId = document.getElementById('adm-lot-select').value;
    const unitSelect = document.getElementById('adm-unit');
    
    if (!lotId) return;

    try {
        const res = await fetch(`/api/lots/${lotId}`);
        activeLotData = await res.json();

        // Affichage des infos de base
        document.getElementById('lot-prix-display').innerText = parseFloat(activeLotData.prix_ref || 0).toLocaleString();
        document.getElementById('lot-categorie-display').innerText = activeLotData.categorie || '-';
        document.getElementById('lot-info-preview').style.display = 'block';

        // --- GESTION DES UNITÉS (SÉCURISÉE) ---
        let unitesArray = [];
        let rawUnites = activeLotData.unites_admises;

        if (typeof rawUnites === 'string') {
            try {
                // On tente de parser si c'est du JSON ["kg","sac"]
                unitesArray = JSON.parse(rawUnites);
            } catch (e) {
                // Si c've n'est pas du JSON, on split par la virgule "kg, sac"
                unitesArray = rawUnites.split(',').map(u => u.trim());
            }
        } else if (Array.isArray(rawUnites)) {
            unitesArray = rawUnites;
        }

        // Remplissage du select des unités
        if (unitSelect) {
            unitSelect.innerHTML = unitesArray.map(u => `<option value="${u}">${u}</option>`).join('');
            document.getElementById('lot-unites-display').innerText = unitesArray.join(', ');
        }

        calculateInternalFinance();

    } catch (err) {
        console.error('❌ Erreur détails lot:', err);
    }
}

// 4. CALCULS FINANCIERS (FIX AFFICHAGE)
function calculateInternalFinance() {
    if (!activeLotData) return;

    const qty = parseFloat(document.getElementById('adm-qty').value) || 0;
    const qualityCoef = parseFloat(document.getElementById('adm-quality').value) || 1;
    const prixRef = parseFloat(activeLotData.prix_ref) || 0;

    // Formule : (Quantité * Prix * Qualité) - 5% frais
    const totalTheorique = qty * prixRef;
    const taxeGestion = 0.05; 
    
    const versementReel = (qty * prixRef * qualityCoef) * (1 - taxeGestion);
    const profitVirtuel = totalTheorique - versementReel;

    // Mise à jour immédiate du DOM
    document.getElementById('val-due').innerText = Math.round(versementReel).toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('val-profit').innerText = Math.round(profitVirtuel).toLocaleString('fr-FR') + ' FCFA';
}
