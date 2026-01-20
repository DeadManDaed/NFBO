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

// --- 1. MODIFICATION DE LA SÉLECTION DU LOT ---
async function onAdmissionLotChange() {
    const lotId = document.getElementById('adm-lot-select').value;
    const unitSelect = document.getElementById('adm-unit');
    const zoneNotation = document.getElementById('zone-evaluation-qualite'); // Nouveau conteneur HTML à ajouter

    if (!lotId) return;

    try {
        const res = await fetch(`/api/lots/${lotId}`);
        activeLotData = await res.json();

        // Affichage des infos de base
        document.getElementById('lot-prix-display').innerText = activeLotData.prix_ref || 0;
        document.getElementById('lot-categorie-display').innerText = activeLotData.categorie || '-';
        document.getElementById('lot-info-preview').style.display = 'block';

        // Gestion des unités (identique à ton code actuel)
        let unitesArray = Array.isArray(activeLotData.unites_admises) 
            ? activeLotData.unites_admises 
            : JSON.parse(activeLotData.unites_admises || "[]");
        
        unitSelect.innerHTML = unitesArray.map(u => `<option value="${u}">${u}</option>`).join('');

        // --- NOUVEAUTÉ : GÉNÉRATION DES CRITÈRES DE NOTATION ---
        genererGrilleEvaluation(activeLotData.criteres_admission);

    } catch (err) {
        console.error("Erreur lot change:", err);
    }
}

// --- 2. GÉNÉRATION DYNAMIQUE DES CRITÈRES (Inspiré de admin.js) ---
function genererGrilleEvaluation(criteresRaw) {
    const container = document.getElementById('zone-evaluation-qualite');
    if (!container) return;

    let criteres = [];
    try {
        criteres = typeof criteresRaw === 'string' ? JSON.parse(criteresRaw) : criteresRaw;
    } catch (e) { criteres = []; }

    if (!criteres || criteres.length === 0) {
        container.innerHTML = `<p style="color:orange; font-size:12px;">⚠️ Aucun critère qualité défini pour ce lot.</p>`;
        return;
    }

    let html = `<h4 style="margin-bottom:10px; border-bottom:1px solid #eee;">Évaluation Qualité (Note de 1 à 10)</h4>`;
    
    criteres.forEach((c, index) => {
        if (c.type === 'notes') return; // On ignore les notes textuelles pour le calcul
        
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:4px;">
                <label style="font-size:13px; flex:1;">${c.critere} ${c.obligatoire ? '<span style="color:red">*</span>' : ''}</label>
                <input type="number" class="note-critere" data-index="${index}" 
                       min="1" max="10" value="10" oninput="calculerGradeAutomatique()"
                       style="width:50px; padding:5px; text-align:center; border:1px solid #ccc; border-radius:4px;">
            </div>
        `;
    });

    // Zone d'affichage du résultat du calcul
    html += `
        <div id="resultat-grade-auto" style="margin-top:15px; padding:10px; background:var(--primary); color:white; border-radius:6px; text-align:center;">
            Grade Calculé : <strong id="grade-label">A</strong> (Coef: <span id="grade-coef">1.0</span>)
        </div>
    `;

    container.innerHTML = html;
    calculerGradeAutomatique(); // Premier calcul
}

// --- 3. CALCUL AUTOMATIQUE DU GRADE ---
function calculerGradeAutomatique() {
    const notes = Array.from(document.querySelectorAll('.note-critere')).map(input => parseFloat(input.value) || 0);
    
    if (notes.length === 0) return;

    const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
    let grade = "D";
    let coef = 0.7;

    // Hiérarchie selon tes critères (Moyenne sur 10)
    if (moyenne >= 9) { grade = "A"; coef = 1.0; }
    else if (moyenne >= 7.5) { grade = "B"; coef = 0.9; }
    else if (moyenne >= 6) { grade = "C"; coef = 0.8; }
    else { grade = "D"; coef = 0.7; }

    // Mise à jour visuelle
    document.getElementById('grade-label').innerText = grade;
    document.getElementById('grade-coef').innerText = coef;
    
    // Mise à jour de la valeur cachée ou du select existant pour calculateInternalFinance
    const qualityInput = document.getElementById('adm-quality');
    if (qualityInput) {
        qualityInput.value = coef.toFixed(1);
    }

    calculateInternalFinance(); // Recalcul financier immédiat
}


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