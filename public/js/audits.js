/**
 * audit.js - Module d'Audit & Performance NBFO
 * Version unifiée : Performance, Logs et Drill-down (Détail Magasin)
 */

let performanceData = [];
let activeStoreData = null; // Stockage temporaire pour le détail magasin

// --- 1. UTILITAIRES ---
function getCurrentUser() {
    if (typeof window.user !== 'undefined' && window.user) return window.user;
    return {
        username: localStorage.getItem('username') || 'anonyme',
        nom: localStorage.getItem('nom') || 'Utilisateur',
        role: localStorage.getItem('role') || 'guest'
    };
}

// --- 2. INITIALISATION ---
async function initModuleAudit() {
    const currentUser = getCurrentUser();
    
    // Délai de sécurité pour le DOM
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Chargement des données
    await refreshAuditData();

    // Vérification des validations en attente (Auditeurs seulement)
    if (['auditeur', 'admin', 'superadmin'].includes(currentUser.role)) {
        await checkPendingValidations();
    }
}
// --- 3. CHARGEMENT DES DONNÉES ---
async function refreshAuditData() {
    const currentUser = getCurrentUser();
    const container = document.getElementById('performance-chart-container');
    
    try {
        const [perfRes, logsRes] = await Promise.all([
            fetch('/api/audit/performance-by-store', { headers: { 'x-user-role': currentUser.role } }),
            fetch('/api/audit/recent-logs', { headers: { 'x-user-role': currentUser.role } })
        ]);

        if (perfRes.status === 403 || logsRes.status === 403) throw new Error("Accès non autorisé.");

        performanceData = await perfRes.json();
        const logsData = await logsRes.json();

        // Affichage
        renderPerformanceChart(performanceData);
        renderAuditLogs(logsData);
        updateGlobalStatsFromData(performanceData);

    } catch (err) {
        console.error('❌ Erreur audit:', err);
        if (container) {
            container.innerHTML = `<p style="color:red; padding:20px;">⚠️ Erreur de chargement: ${err.message}</p>`;
        }
    }
}

function updateGlobalStatsFromData(data) {
    if (!data) return;
    const totalProfit = data.reduce((sum, s) => sum + (parseFloat(s.profit_virtuel_genere) || 0), 0);
    const totalQty = data.reduce((sum, s) => sum + (parseFloat(s.quantite_totale) || 0), 0);
    const totalAlerts = data.reduce((sum, s) => sum + (parseInt(s.alertes_qualite) || 0), 0);

    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    
    setVal('audit-total-profit', Math.round(totalProfit).toLocaleString('fr-FR'));
    setVal('audit-total-qty', Math.round(totalQty).toLocaleString('fr-FR'));
    setVal('audit-alerts', totalAlerts);
}

// --- 4. RENDU DES PERFORMANCES (C'est ici que c'était cassé) ---
function renderPerformanceChart(data) {
    const container = document.getElementById('performance-chart-container');
    const currentUser = getCurrentUser();

    if (!['superadmin', 'admin', 'auditeur'].includes(currentUser.role)) {
        container.innerHTML = `<p style="color:red;">⛔ Accès refusé.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#999;">Aucune donnée disponible.</p>`;
        return;
    }

    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">`;

    data.forEach(store => {
        const profit = parseFloat(store.profit_virtuel_genere) || 0;
        const color = profit >= 0 ? '#1565c0' : '#d32f2f'; // Bleu ou Rouge
        
        // LA CARTE (Corrigée)
        html += `
        <div onclick="ouvrirDetailMagasin('${store.magasin_id}', '${store.nom_magasin.replace(/'/g, "\\'")}')"
            style="
            background: white; border: 2px solid ${color}20; border-radius: 12px; padding: 20px; 
            text-align: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.05);"
            onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.1)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.05)';"
            title="Cliquez pour analyser ${store.nom_magasin}">
            
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${store.nom_magasin}
            </div>
            
            <div style="font-size: 20px; font-weight: bold; color: ${color}; margin-bottom: 5px;">
                ${Math.round(profit).toLocaleString('fr-FR')} <span style="font-size:10px; color:#999">FCFA</span>
            </div>
            
            <div style="font-size: 11px; color: #666; background: ${color}10; padding: 4px 10px; border-radius: 15px; display: inline-block;">
                📦 ${store.nombre_admissions} op.
            </div>

            <div style="font-size:10px; color:#1565c0; margin-top:10px; text-decoration:underline;">
                Analyser <i class="fa-solid fa-magnifying-glass"></i>
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// --- 5. LOGS D'AUDIT ---
function renderAuditLogs(logs) {
    const list = document.getElementById('audit-log-list');
    if (!logs || logs.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#999;">Aucune transaction récente.</p>`;
        return;
    }

    list.innerHTML = logs.map(log => {
        const isPositive = log.montant > 0;
        return `
        <div style="padding:10px 0; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong style="font-size:12px; display:block;">${log.action} <span style="font-weight:normal; color:#666;">- ${log.produit || '?'}</span></strong>
                <span style="font-size:10px; color:#999;">${new Date(log.date).toLocaleString()} • ${log.utilisateur}</span>
            </div>
            <div style="font-weight:bold; font-size:12px; color:${isPositive ? 'green' : '#d32f2f'};">
                ${isPositive ? '+' : ''}${Math.round(log.montant).toLocaleString()}
            </div>
        </div>`;
    }).join('');
}

// --- 6. VALIDATIONS (AUDITEUR) ---
async function checkPendingValidations() {
    try {
        const res = await fetch('/api/transferts/pending-audit');
        if(!res.ok) return;
        const pending = await res.json();
        
        const container = document.getElementById('audit-validation-queue');
        const notif = document.getElementById('notif'); // Assure-toi d'avoir cet ID dans ton HTML

        if (pending.length > 0 && container) {
            container.innerHTML = pending.map(t => `
                <div style="background:#fff3e0; border-left:4px solid orange; padding:10px; margin-bottom:10px; font-size:12px;">
                    <strong>Transfert #${t.id}</strong>: ${t.produit} (${t.quantite})<br>
                    De: ${t.magasinDepart} ➔ Vers: ${t.magasinDest}<br>
                    <div style="margin-top:5px; display:flex; gap:10px;">
                        <button onclick="approveTransfer('${t.id}')" style="background:#4caf50; color:white; border:none; padding:4px 8px; cursor:pointer;">Autoriser</button>
                        <button onclick="rejectTransfer('${t.id}')" style="background:#f44336; color:white; border:none; padding:4px 8px; cursor:pointer;">Refuser</button>
                    </div>
                </div>
            `).join('');
            if(notif) {
                notif.style.display = 'inline-block';
                notif.innerText = pending.length;
            }
        } else if (container) {
            container.innerHTML = '';
            if(notif) notif.style.display = 'none';
        }
    } catch (e) { console.error("Erreur validations", e); }
}

async function approveTransfer(id) { /* ... logique API existante ... */ }
async function rejectTransfer(id) { /* ... logique API existante ... */ }


// --- 7. NOUVEAU : DÉTAIL MAGASIN & MODALE ---

// --- MISE À JOUR DE LA FONCTION D'OUVERTURE POUR MIEUX FILTRER ---
async function ouvrirDetailMagasin(magasinId, nomMagasin) {
    if (!document.getElementById('modal-detail-store')) {
        document.body.insertAdjacentHTML('beforeend', getModalHTML());
    }
    
    const modal = document.getElementById('modal-detail-store');
    document.getElementById('modal-store-title').innerText = `Analyse : ${nomMagasin}`;
    modal.style.display = 'flex';
    document.getElementById('store-tab-content').innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des données...</div>';

    try {
        // On récupère les stocks et les logs
        const [stockRes, logsRes] = await Promise.all([
            fetch(`/api/magasins/${magasinId}/stock`),
            // On s'assure que la route des logs reçoit bien l'ID du magasin
            fetch(`/api/audit/recent-logs?magasin_id=${magasinId}`) 
        ]);

        const stocks = await stockRes.json();
        let logs = await logsRes.json();

        // Sécurité supplémentaire : si l'API renvoie tous les logs, on filtre ici
        if (Array.isArray(logs)) {
            logs = logs.filter(l => 
                String(l.magasin_id) === String(magasinId) || 
                l.nom_magasin === nomMagasin
            );
        }

        activeStoreData = { stocks, logs, analyse: {} };

        // Intelligence de stock (b.1, b.2, b.3)
        if (typeof window.StockIntelligence !== 'undefined') {
            activeStoreData.analyse = window.StockIntelligence.analyserInventaire(stocks, logs);
        }

        // Affichage par défaut sur les transactions pour vérifier la correction
        switchTab('transactions');

    } catch (e) {
        console.error("Erreur drill-down:", e);
        document.getElementById('store-tab-content').innerHTML = `<p style="color:red; text-align:center;">Erreur: ${e.message}</p>`;
    }
}

// --- FONCTION DE RENDU DES TRANSACTIONS CORRIGÉE ---
function renderTransactionsTable(logs) {
    if (!logs || logs.length === 0) return '<p style="text-align:center; padding:20px;">Aucune transaction détaillée trouvée.</p>';
    
    return `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
            <tr style="background:#f8f9fa; text-align:left; border-bottom:2px solid #dee2e6;">
                <th style="padding:10px;">Date</th>
                <th style="padding:10px;">Action</th>
                <th style="padding:10px;">Produit</th>
                <th style="padding:10px; text-align:right;">Qté</th>
            </tr>
        </thead>
        <tbody>
            ${logs.map(l => {
                // Gestion des noms de propriétés flexibles (mapping)
                const date = l.date || l.date_creation || l.created_at;
                const action = l.action || `Admission #${l.id}`;
                const produit = l.produit || l.nom_produit || l.description || 'Non spécifié';
                const qte = l.quantite || l.quantite_totale || l.quantite_brute || 0;
                
                return `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${date ? new Date(date).toLocaleDateString('fr-FR') : '--'}</td>
                    <td style="padding:10px; font-weight:500;">${action}</td>
                    <td style="padding:10px;">${produit}</td>
                    <td style="padding:10px; text-align:right; font-weight:bold;">${Math.round(qte).toLocaleString('fr-FR')}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

function renderHealthDashboard(analyse) {
    if (!analyse || (!analyse.stars.length && !analyse.rupture.length && !analyse.peremption.length)) {
        return '<p style="text-align:center; padding:20px; color:green;">✅ Rien à signaler. Stock sain.</p>';
    }
    return `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div style="background:#fff3e0; padding:10px; border-radius:4px;">
            <strong style="color:#e65100">📉 Ruptures (${analyse.rupture.length})</strong>
            <ul style="margin:5px 0 0 15px; font-size:11px;">${analyse.rupture.map(p => `<li>${p.nom} (Reste: ${p.stock_actuel})</li>`).join('')}</ul>
        </div>
        <div style="background:#ffebee; padding:10px; border-radius:4px;">
            <strong style="color:#c62828">⚠️ Péremption (${analyse.peremption.length})</strong>
            <ul style="margin:5px 0 0 15px; font-size:11px;">${analyse.peremption.map(p => `<li>${p.nom} (${p.status})</li>`).join('')}</ul>
        </div>
    </div>`;
}

function getModalHTML() {
    return `
    <div id="modal-detail-store" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;">
        <div style="background:white; width:90%; max-width:600px; height:80%; border-radius:8px; display:flex; flex-direction:column; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
            <div style="padding:15px; background:#1565c0; color:white; display:flex; justify-content:space-between;">
                <h3 id="modal-store-title" style="margin:0; font-size:16px;">Détail</h3>
                <button onclick="document.getElementById('modal-detail-store').style.display='none'" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex; border-bottom:1px solid #ddd;">
                <button id="btn-health" class="tab-btn" onclick="switchTab('health')" style="flex:1; padding:10px; border:none; cursor:pointer;">Santé Stock</button>
                <button id="btn-transactions" class="tab-btn" onclick="switchTab('transactions')" style="flex:1; padding:10px; border:none; cursor:pointer;">Transactions</button>
            </div>
            <div id="store-tab-content" style="flex:1; overflow-y:auto; padding:15px;"></div>
        </div>
    </div>`;
}
// --- Gestion des onglets de la modale détail magasin ---
function switchTab(tab) {
    const content = document.getElementById('store-tab-content');
    if (!content || !activeStoreData) return;

    // Réinitialiser le style des boutons
    document.querySelectorAll('#modal-detail-store .tab-btn').forEach(btn => {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.fontWeight = 'normal';
    });

    // Activer le bouton sélectionné
    const activeBtn = document.getElementById(`btn-${tab}`);
    if (activeBtn) {
        activeBtn.style.background = '#1565c0';
        activeBtn.style.color = 'white';
        activeBtn.style.fontWeight = 'bold';
    }

    // Afficher le contenu correspondant
    if (tab === 'transactions') {
        content.innerHTML = renderTransactionsTable(activeStoreData.logs);
    } else if (tab === 'health') {
        content.innerHTML = renderHealthDashboard(activeStoreData.analyse);
    } else {
        content.innerHTML = `<p style="text-align:center; padding:20px;">Onglet inconnu.</p>`;
    }
}
