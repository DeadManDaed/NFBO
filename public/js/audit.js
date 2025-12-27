/**
 * audit.js - Module d'Audit & Performance NBFO
 * Version corrigée avec API complète
 */

// Variable globale pour stocker les données de performance
let performanceData = [];

// Récupération des informations utilisateur
function getCurrentUser() {
    // Essayer de récupérer depuis la variable globale (si définie dans app.js)
    if (typeof window.user !== 'undefined' && window.user) {
    return window.user;
    }
    
    // Sinon, récupérer depuis localStorage
    return {
        username: localStorage.getItem('username') || 'anonyme',
        nom: localStorage.getItem('nom') || localStorage.getItem('username') || 'Utilisateur',
        role: localStorage.getItem('role') || 'guest'
    };
}

/**
 * Initialisation du module audit
 */
async function initModuleAudit() {
    const currentUser = getCurrentUser();
    
    // ✅ ATTENDRE que le DOM soit prêt (augmente le délai)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // ✅ Charger les stats APRÈS le DOM
    await loadGlobalStats();
    await refreshAuditData();
    
    if (currentUser.role === 'auditeur' || currentUser.role === 'admin' || currentUser.role === 'superadmin') {
        await checkPendingValidations();
    }
}

/**
 * Charge et affiche toutes les données d'audit
 */
async function refreshAuditData() {
    const currentUser = getCurrentUser();
     console.log('👤 User actuel:', currentUser); // AJOUTE   
    // ✅ ATTENDRE que le DOM soit prêt
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
        // Chargement parallèle des données
        const [perfRes, logsRes] = await Promise.all([
            fetch('/api/audit/performance-by-store', {
                headers: { 'x-user-role': currentUser.role }                
        
            }),
           /* console.log('📊 Perf status:', perfRes.status); // AJOUTE
        console.log('📋 Logs status:', logsRes.status); // AJOUTE
        
        performanceData = await perfRes.json();
        console.log('📊 Performance data:', performanceData); // AJOUTE*/
            fetch('/api/audit/recent-logs', {
                headers: { 'x-user-role': currentUser.role }
            })
        ]);

        // Vérification des permissions
        if (perfRes.status === 403 || logsRes.status === 403) {
            throw new Error("Accès non autorisé à la source de données.");
        }
   
        performanceData = await perfRes.json();
        const logsData = await logsRes.json();

        // Rendu des composants
        renderPerformanceChart(performanceData);
        renderAuditLogs(logsData);

    } catch (err) {
        console.error('❌ Erreur audit:', err);
        logDeploymentError('Audit-Performance-Render', err);
        
        document.getElementById('performance-chart-container').innerHTML = 
            `<p style="color:red; padding:20px;">⚠️ ${err.message}</p>`;
    }
}

/**
 * Charge les statistiques globales dans les cartes
 */
async function loadGlobalStats() {
    const currentUser = getCurrentUser();
    
    // ✅ ATTENDRE que les éléments existent dans le DOM
    await waitForElements(['audit-total-profit', 'audit-total-qty', 'audit-alerts']);
    
    try {
        const res = await fetch('/api/audit/global-stats', {
            headers: { 'x-user-role': currentUser.role }
        });
        
        if (!res.ok) throw new Error('Erreur chargement stats');
        
        const stats = await res.json();
        
        console.log('📊 Stats reçues:', stats);
        
        // Maintenant on est sûr que les éléments existent
        document.getElementById('audit-total-profit').textContent = 
            Math.round(parseFloat(stats.profit_total || 0)).toLocaleString('fr-FR');
        document.getElementById('audit-total-qty').textContent = 
            Math.round(parseFloat(stats.quantite_totale || 0)).toLocaleString('fr-FR');
        document.getElementById('audit-alerts').textContent = 
            stats.alertes_qualite || 0;
        
        console.log('✅ Stats affichées');
        
    } catch (err) {
        console.error('❌ Erreur stats globales:', err);
    }
}

// ✅ Fonction helper pour attendre que les éléments existent
function waitForElements(elementIds, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkElements = setInterval(() => {
            attempts++;
            
            const allExist = elementIds.every(id => document.getElementById(id) !== null);
            
            if (allExist) {
                console.log(`✅ Tous les éléments trouvés après ${attempts} tentatives`);
                clearInterval(checkElements);
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error(`❌ Timeout: éléments non trouvés après ${attempts} tentatives`);
                clearInterval(checkElements);
                reject(new Error('Elements not found'));
            }
        }, 100); // Vérifie toutes les 100ms
    });
}

/**
 * Génère le graphique de performance par magasin
 */
function renderPerformanceChart(data) {
    const container = document.getElementById('performance-chart-container');
    const currentUser = getCurrentUser();

    // Vérification de sécurité
    if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin' && currentUser.role !== 'auditeur') {
        container.innerHTML = `<p style="color:red; padding:20px;">⛔ Accès refusé : Droits insuffisants.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div style="width:100%; text-align:center; padding:50px; color:#999;">
                <i class="fa-solid fa-chart-simple" style="font-size:48px; margin-bottom:15px;"></i>
                <p>Aucune donnée de performance disponible pour les 30 derniers jours.</p>
            </div>`;
        return;
    }

    // Calcul de la valeur maximale pour l'échelle
    const maxProfit = Math.max(...data.map(d => parseFloat(d.profit_virtuel_genere) || 0), 1);

    let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; padding: 10px 0;">`;

    data.forEach(store => {
    const profit = parseFloat(store.profit_virtuel_genere) || 0;
    const color = profit > 0 ? 'var(--primary, #1565c0)' : '#d32f2f';
    const quantite = parseFloat(store.quantite_totale) || 0;
    
    html += `
        <div style="
            background: white; 
            border: 2px solid ${color}20; 
            border-radius: 12px; 
            padding: 20px; 
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);"
            onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';"
            title="Quantité: ${Math.round(quantite).toLocaleString('fr-FR')} unités">
            
            <!-- Nom du magasin -->
            <div style="
                font-size: 13px; 
                font-weight: 600; 
                margin-bottom: 12px; 
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;">
                ${store.nom_magasin}
            </div>
            
            <!-- Profit (valeur principale) -->
            <div style="
                font-size: 22px; 
                font-weight: bold; 
                color: ${color}; 
                margin-bottom: 8px;">
                ${Math.round(profit).toLocaleString('fr-FR')}
            </div>
            
            <!-- Label FCFA -->
            <div style="font-size: 10px; color: #999; margin-bottom: 10px;">
                FCFA
            </div>
            
            <!-- Nombre d'admissions -->
            <div style="
                font-size: 11px; 
                color: #666; 
                padding: 6px 12px; 
                background: ${color}10; 
                border-radius: 20px;
                display: inline-block;">
                📦 ${store.nombre_admissions} admission${store.nombre_admissions > 1 ? 's' : ''}
            </div>
        </div>`;
});

html += `</div>`;
    container.innerHTML = html;
}

/**
 * Affiche les logs d'audit récents
 */
function renderAuditLogs(logs) {
    const list = document.getElementById('audit-log-list');
    
    if (!logs || logs.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:30px; color:#999;">
                <i class="fa-solid fa-clipboard-list" style="font-size:32px; margin-bottom:10px;"></i>
                <p>Aucune transaction récente.</p>
            </div>`;
        return;
    }

    list.innerHTML = logs.map(log => {
        const date = new Date(log.date);
        const actionType = log.action.includes('admission') ? 'Admission' : 
                          log.action.includes('vente') ? 'Vente' : 
                          log.action.includes('transfert') ? 'Transfert' : 'Système';
        
        const icon = actionType === 'Admission' ? 'fa-box' :
                     actionType === 'Vente' ? 'fa-cash-register' :
                     actionType === 'Transfert' ? 'fa-truck' : 'fa-gear';
        
        return `
            <div style="padding:12px 0; border-bottom:1px solid #f5f5f5; transition: background 0.2s;"
                 onmouseover="this.style.background='#f9f9f9'"
                 onmouseout="this.style.background='white'">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid ${icon}" style="color:var(--primary); font-size:14px;"></i>
                        <strong style="font-size:12px;">${actionType}</strong>
                    </div>
                    ${log.montant > 0 ? 
                        `<span style="color:#2e7d32; font-weight:bold; font-size:12px;">+${Math.round(log.montant).toLocaleString('fr-FR')} FCFA</span>` 
                        : ''}
                </div>
                <div style="font-size:10px; color:#666; margin-top:4px; margin-left:22px;">
                    ${date.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})} 
                    • ${log.utilisateur}
                    ${log.magasin ? ` • ${log.magasin}` : ''}
                </div>
            </div>`;
    }).join('');
}

/**
 * Vérifie les transferts en attente de validation
 */
async function checkPendingValidations() {
    const currentUser = getCurrentUser();
    
    if (currentUser.role !== 'auditeur' && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') return;

    try {
        const res = await fetch('/api/transferts/pending-audit');
        if (!res.ok) throw new Error('Erreur chargement validations');
        
        const pendingTransfers = await res.json();
        const container = document.getElementById('audit-validation-queue');
        const notif = document.getElementById('notif');

        if (pendingTransfers.length > 0) {
            container.innerHTML = pendingTransfers.map(t => `
                <div class="audit-card-urgent" style="
                    background:#fff3e0; 
                    border-left:4px solid #f57c00; 
                    padding:15px; 
                    margin:10px 0; 
                    border-radius:6px;">
                    <h4 style="margin:0 0 10px 0; color:#e65100;">
                        <i class="fa-solid fa-triangle-exclamation"></i> 
                        Validation Requise : Transfert #${t.id}
                    </h4>
                    <p style="margin:5px 0; font-size:13px;">
                        <strong>De:</strong> ${t.magasinDepart} 
                        <i class="fa-solid fa-arrow-right" style="margin:0 8px;"></i> 
                        <strong>Vers:</strong> ${t.magasinDest}
                    </p>
                    <p style="margin:5px 0; font-size:13px;">
                        <strong>Produit:</strong> ${t.produit} | 
                        <strong>Qté:</strong> ${t.quantite}
                    </p>
                    <div style="display:flex; gap:10px; margin-top:12px;">
                        <button onclick="approveTransfer('${t.id}')" 
                                style="background:#2e7d32; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            <i class="fa-solid fa-check"></i> AUTORISER
                        </button>
                        <button onclick="rejectTransfer('${t.id}')" 
                                style="background:#c62828; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            <i class="fa-solid fa-times"></i> BLOQUER
                        </button>
                    </div>
                </div>
            `).join('');
            
            notif.innerHTML = `<span style="background:#f57c00; color:white; padding:4px 12px; border-radius:12px; font-size:11px; font-weight:bold;">
                ${pendingTransfers.length} en attente
            </span>`;
            notif.style.display = 'inline-block';
        } else {
            container.innerHTML = '';
            notif.style.display = 'none';
        }
    } catch (err) {
        console.error('❌ Erreur pending validations:', err);
    }
}

/**
 * Exporte le rapport d'audit en PDF/Impression
 */
function exportAuditPDF() {
    const currentUser = getCurrentUser();
    
    if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin' && currentUser.role !== 'auditeur') {
        alert("⛔ Action non autorisée.");
        return;
    }

    const stats = {
        profit: document.getElementById('audit-total-profit').textContent,
        qty: document.getElementById('audit-total-qty').textContent,
        alerts: document.getElementById('audit-alerts').textContent
    };

    const printWindow = window.open('', '_blank', 'height=800,width=1000');

    printWindow.document.write(`
        <html>
            <head>
                <title>Rapport d'Audit NBFO - ${new Date().toLocaleDateString('fr-FR')}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 40px; 
                        line-height: 1.6;
                    }
                    .header {
                        border-bottom: 3px solid #1565c0;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    h1 { color: #1565c0; margin: 0; }
                    .meta { color: #666; font-size: 13px; margin-top: 10px; }
                    .stat-card { 
                        border: 1px solid #ddd; 
                        padding: 15px; 
                        margin: 15px 0; 
                        border-radius: 8px;
                        background: #f9f9f9;
                    }
                    .stat-card h3 { margin: 0 0 8px 0; color: #333; font-size: 14px; }
                    .stat-card .value { font-size: 24px; font-weight: bold; color: #1565c0; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 30px; 
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 12px 8px; 
                        text-align: left; 
                        font-size: 12px;
                    }
                    th { 
                        background-color: #1565c0; 
                        color: white;
                        font-weight: 600;
                    }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .footer {
                        margin-top: 50px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        color: #999;
                        font-size: 11px;
                    }
                    @media print {
                        body { padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Rapport de Performance par Magasin</h1>
                    <div class="meta">
                        <strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}<br>
                        <strong>Auditeur:</strong> ${currentUser.nom || currentUser.username}<br>
                        <strong>Période:</strong> 30 derniers jours
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                    <div class="stat-card">
                        <h3>💰 Profit Virtuel Total</h3>
                        <div class="value">${stats.profit} FCFA</div>
                    </div>
                    <div class="stat-card">
                        <h3>📦 Flux Admissions</h3>
                        <div class="value">${stats.qty} Unités</div>
                    </div>
                    <div class="stat-card">
                        <h3>⚠️ Alertes Qualité</h3>
                        <div class="value">${stats.alerts}</div>
                    </div>
                </div>

                <h2 style="margin-top:40px; color:#333;">Détails par Magasin</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Magasin</th>
                            <th>Admissions</th>
                            <th>Quantité (unités)</th>
                            <th>Profit (FCFA)</th>
                            <th>Alertes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${performanceData.map(store => `
                            <tr>
                                <td><strong>${store.nom_magasin}</strong></td>
                                <td>${store.nombre_admissions}</td>
                                <td>${Math.round(store.quantite_totale).toLocaleString('fr-FR')}</td>
                                <td style="color:#2e7d32; font-weight:bold;">
                                    ${Math.round(store.profit_virtuel_genere).toLocaleString('fr-FR')}
                                </td>
                                <td>${store.alertes_qualite || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Document confidentiel - NBFO System - ${new Date().getFullYear()}</p>
                </div>
            </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// Fonctions de validation de transferts (si elles n'existent pas déjà)
async function approveTransfer(transferId) {
    const currentUser = getCurrentUser();
    
    try {
        const res = await fetch(`/api/transferts/${transferId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auditeur: currentUser.username })
        });
        
        if (res.ok) {
            alert('✅ Transfert autorisé');
            await checkPendingValidations();
        } else {
            alert('❌ Erreur lors de l\'autorisation');
        }
    } catch (err) {
        console.error('Erreur approve:', err);
        alert('Erreur réseau');
    }
}

async function rejectTransfer(transferId) {
    const currentUser = getCurrentUser();
    const raison = prompt('Raison du blocage:');
    if (!raison) return;
    
    try {
        const res = await fetch(`/api/transferts/${transferId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auditeur: currentUser.username, raison })
        });
        
        if (res.ok) {
            alert('🚫 Transfert bloqué');
            await checkPendingValidations();
        } else {
            alert('❌ Erreur lors du blocage');
        }
    } catch (err) {
        console.error('Erreur reject:', err);
        alert('Erreur réseau');
    }
}

// Fonction helper pour logger les erreurs de déploiement
function logDeploymentError(context, error) {
    console.error(`[DEPLOYMENT ERROR - ${context}]:`, error);
    // Tu peux aussi envoyer à un service de monitoring si tu en as un
}
