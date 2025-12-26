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
//const unitSelect = document.getElementById('adm-unit');
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
    if (!activeLotData) return;

    const qty = parseFloat(document.getElementById('adm-qty').value) || 0;
    const qualityCoef = parseFloat(document.getElementById('adm-quality').value) || 1;
    const prixRef = parseFloat(activeLotData.prix_ref) || 0;
    const modePaiement = document.getElementById('adm-payment-mode').value;
    const expiryDate = document.getElementById('adm-expiry').value;

    // 1. Base du montant brut selon qualité
    const montantBrutQualite = qty * prixRef * qualityCoef;

    // 2. Calcul de la Taxe Dynamique (Simulant le Trigger SQL)
    let tauxTaxe = 0.05; // 5% de base

    // Pénalité Mobile Money (+2%)
    if (modePaiement === 'mobile_money') {
        tauxTaxe += 0.02;
    }

    // Pénalité Fraîcheur (si < 30 jours avant expiration)
    if (expiryDate) {
        const today = new Date();
        const exp = new Date(expiryDate);
        const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            const joursManquants = 30 - Math.max(diffDays, 0);
            tauxTaxe += (0.005 * joursManquants); // +0.5% par jour sous les 30j
        }
    }

    const montantTaxe = montantBrutQualite * tauxTaxe;
    const versementReel = montantBrutQualite - montantTaxe;
    const profitVirtuel = montantTaxe; // Dans votre système, la taxe = le bénéfice espéré

    // Affichage
    document.getElementById('val-due').innerText = Math.round(versementReel).toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('val-profit').innerText = Math.round(profitVirtuel).toLocaleString('fr-FR') + ' FCFA';
    
    // On affiche le taux appliqué pour transparence
    console.log(`Taux appliqué : ${(tauxTaxe * 100).toFixed(2)}%`);
    console.log("Calcul effectué:", { qty, prixRef, versementReel });
}
/**
 * Gère l'envoi des données d'admission au serveur
 */
// 1. Définition de la table de correspondance
const MAP_GRADES = {
    "1.0": { grade: "A", coef: 1.0 },
    "0.9": { grade: "B", coef: 0.9 },
    "0.8": { grade: "C", coef: 0.8 },
    "0.7": { grade: "D", coef: 0.7 }
};

async function soumettreAdmission(event) {
    event.preventDefault();
    
    // 2. Récupération de la clé sélectionnée (le value de l'option)
    const selectedKey = document.getElementById('adm-quality').value;
    const infoQualite = MAP_GRADES[selectedKey] || { grade: "D", coef: 0.7 };

    const payload = {
        lot_id: parseInt(document.getElementById('adm-lot-select').value),
        producteur_id: parseInt(document.getElementById('adm-producer-select').value),
        magasin_id: parseInt(document.getElementById('adm-magasin-select').value),
        quantite: parseFloat(document.getElementById('adm-qty').value),
        unite: document.getElementById('adm-unit').value,
        
        // 3. Utilisation de la table de correspondance
        coef_qualite: infoQualite.coef,     // Ira dans numeric(4,2)
       // grade_qualite: infoQualite.grade,   // Ira dans varchar(1)
        
        prix_ref: parseFloat(document.getElementById('lot-prix-display').innerText),
        date_reception: new Date().toISOString().split('T')[0],
        date_expiration: document.getElementById('adm-expiry').value || null,
        mode_paiement: document.getElementById('adm-payment-mode').value,
        utilisateur: localStorage.getItem('username') || 'agent_system'
    };

    console.log("📤 Envoi de l'admission :", payload);

    try {
        const response = await fetch('/api/admissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("✅ Admission réussie ! Le stock et le solde producteur ont été mis à jour.");
            event.target.reset(); // Vide le formulaire
            if(typeof refreshAdminTable === 'function') refreshAdminTable('admissions');
        } else {
            const error = await response.json();
            alert("❌ Erreur : " + error.details || error.error);
        }
    } catch (err) {
        console.error("Erreur réseau :", err);
        alert("Impossible de contacter le serveur.");
    }
}

// Liaison de l'événement au chargement du script
const formAdmission = document.getElementById('admissionForm');
if (formAdmission) {
    formAdmission.onsubmit = soumettreAdmission;
}
