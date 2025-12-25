/**
 * admission.js - Version Mobile-Proof (Ultra-robuste)
 * Emplacement : Remplace tout le contenu de ton fichier admission.js actuel.
 */

let activeLotData = null;

// 1. INITIALISATION
function initModuleAdmission() {
    activeLotData = null;
    chargerLots();
    chargerProducteurs();
    chargerMagasins();
    
    // Reset forcé des affichages
    document.getElementById('val-due').innerText = '0 FCFA';
    document.getElementById('val-profit').innerText = '0 FCFA';
    
    // Liaison manuelle des événements pour être sûr qu'ils s'activent
    document.getElementById('adm-qty').oninput = calculateInternalFinance;
    document.getElementById('adm-quality').onchange = calculateInternalFinance;
}

// 2. CHARGEMENT DES RÉFÉRENTIELS (CORRIGÉ)
async function chargerLots() {
    const select = document.getElementById('adm-lot-select');
    try {
        const res = await fetch('/api/lots');
        const lots = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
            lots.map(l => `<option value="${l.id}">${l.description || l.nom_produit} (${l.prix_ref} FCFA)</option>`).join('');
    } catch (e) { select.innerHTML = '<option>Erreur chargement lots</option>'; }
}

async function chargerProducteurs() {
    const select = document.getElementById('adm-producer-select');
    try {
        const res = await fetch('/api/producteurs');
        const data = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner --</option>' +
            data.map(p => `<option value="${p.id}">${p.nom_producteur || p.nom}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function chargerMagasins() {
    const select = document.getElementById('adm-magasin-select');
    try {
        const res = await fetch('/api/magasins');
        const data = await res.json();
        select.innerHTML = '<option value="">-- Sélectionner --</option>' +
            data.map(m => `<option value="${m.id}">${m.nom}</option>`).join('');
    } catch (e) { console.error(e); }
}

// 3. LOGIQUE SÉLECTION LOT & UNITÉS (LA CORRECTION CRITIQUE)
async function onAdmissionLotChange() {
    const lotId = document.getElementById('adm-lot-select').value;
    const unitSelect = document.getElementById('adm-unit');
    if (!lotId) return;

    try {
        const res = await fetch(`/api/lots/${lotId}`);
        activeLotData = await res.json();

        // Affichage des infos
        document.getElementById('lot-prix-display').innerText = activeLotData.prix_ref || 0;
        document.getElementById('lot-categorie-display').innerText = activeLotData.categorie || '-';
        document.getElementById('lot-info-preview').style.display = 'block';

        // GESTION UNITÉS : On gère le format String ("kg, sac") ET le format JSON (["kg"])
        let unitesArray = [];
        let brute = activeLotData.unites_admises;

        if (brute) {
            if (typeof brute === 'string') {
                if (brute.startsWith('[')) {
                    try { unitesArray = JSON.parse(brute); } catch(e) { unitesArray = [brute]; }
                } else {
                    unitesArray = brute.split(',').map(s => s.trim());
                }
            } else if (Array.isArray(brute)) {
                unitesArray = brute;
            }
        }

        // Remplissage
        unitSelect.innerHTML = unitesArray.length > 0 
            ? unitesArray.map(u => `<option value="${u}">${u}</option>`).join('')
            : '<option value="">Aucune unité</option>';
            
        document.getElementById('lot-unites-display').innerText = unitesArray.join(', ') || 'N/A';

        calculateInternalFinance();
    } catch (err) {
        console.error("Erreur lot change:", err);
    }
// Force la suppression du blocage navigateur sur l'unité
const unitSelect = document.getElementById('adm-unit');
if (unitSelect) {
    unitSelect.removeAttribute('required');
    // On ajoute une option factice si c'est vide pour éviter l'erreur de sélection
    if (unitSelect.options.length === 0) {
        unitSelect.innerHTML = '<option value="N/A">Unité par défaut</option>';
    }
}

}

// 4. CALCULS FINANCIERS (MISE À JOUR RÉELLE)
/*function calculateInternalFinance() {
    if (!activeLotData) return;

    const qty = parseFloat(document.getElementById('adm-qty').value) || 0;
    const qualityCoef = parseFloat(document.getElementById('adm-quality').value) || 1;
    const prixRef = parseFloat(activeLotData.prix_ref) || 0;

    // Tes formules :
    const totalTheorique = qty * prixRef;
    const taxeGestion = 0.05; // 5%
    
    // Le versement au producteur tient compte de la qualité et retire les frais
    const versementReel = (qty * prixRef * qualityCoef) * (1 - taxeGestion);
    const profitVirtuel = totalTheorique - versementReel;

    // Mise à jour visuelle (arrondi pour la monnaie)
    document.getElementById('val-due').innerText = Math.round(versementReel).toLocaleString() + ' FCFA';
    document.getElementById('val-profit').innerText = Math.round(profitVirtuel).toLocaleString() + ' FCFA';
}
*/

function calculateInternalFinance() {
    // On essaie de récupérer les valeurs, sinon 0
    const qtyInput = document.getElementById('adm-qty');
    const qualityInput = document.getElementById('adm-quality');
    const prixDisplay = document.getElementById('lot-prix-display');

    const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;
    const qualityCoef = qualityInput ? parseFloat(qualityInput.value) || 1 : 1;
    
    // On nettoie le prix au cas où il contient "FCFA" ou des espaces
    let prixTexte = prixDisplay ? prixDisplay.innerText.replace(/[^0-9.]/g, '') : "0";
    const prixRef = parseFloat(prixTexte) || 0;

    // Calculs
    const totalTheorique = qty * prixRef;
    const taxeGestion = 0.05; // 5%
    
    const versementReel = (qty * prixRef * qualityCoef) * (1 - taxeGestion);
    const profitVirtuel = totalTheorique - versementReel;

    // Mise à jour visuelle forcée
    const dueEl = document.getElementById('val-due');
    const profitEl = document.getElementById('val-profit');

    if (dueEl) dueEl.innerText = Math.round(versementReel).toLocaleString('fr-FR') + ' FCFA';
    if (profitEl) profitEl.innerText = Math.round(profitVirtuel).toLocaleString('fr-FR') + ' FCFA';
    
    console.log("Calcul effectué:", { qty, prixRef, versementReel });
}
