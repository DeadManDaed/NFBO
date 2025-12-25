<script>
// --- LOGIQUE AUDIT (API-based) ---

async function refreshAuditData() {
    try {
        // Appel à l'API filtrée par le rôle utilisateur
        const res = await fetch('/api/audit/performance-by-store');
        
        if (res.status === 403) {
            throw new Error("Accès non autorisé à la source de données.");
        }

        const data = await res.json();
        renderPerformanceChart(data); // Génère le visuel
        renderAuditLogs(data);        // Remplit le tableau détaillé
        
    } catch (err) {
        // En cas d'erreur de déploiement ou de droit, on logue l'incident
        logDeploymentError('Audit-Performance-Render', err);
        document.getElementById('performance-chart-container').innerHTML = 
            `<p style="color:red;">Erreur lors du chargement des performances.</p>`;
    }
}

/**
 * Transforme les données de la source "Performance by Store" en graphique
 * @param {Array} data - Résultat de la requête SQL vue_performance_magasins
 */
function renderPerformanceChart(data) {
    const container = document.getElementById('performance-chart-container');
    const role = user.role;

    // Sécurité : Vérification du rôle avant rendu
    if (role !== 'admin' && role !== 'auditeur') {
        container.innerHTML = `<p style="color:red; padding:20px;">Accès refusé : Droits insuffisants.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p>Aucune donnée de performance disponible.</p>";
        return;
    }

    // Calcul de la valeur maximale pour l'échelle du graphique
    const maxProfit = Math.max(...data.map(d => parseFloat(d.profit_virtuel_genere)));

    let html = `<div style="display: flex; align-items: flex-end; gap: 15px; height: 100%; padding: 20px;">`;

    data.forEach(store => {
        const profit = parseFloat(store.profit_virtuel_genere);
        const heightPercentage = (profit / maxProfit) * 100;
        
        html += `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; group">
                <div style="font-size: 10px; margin-bottom: 5px; font-weight: bold;">
                    ${Math.round(profit).toLocaleString()}
                </div>
                <div style="
                    width: 100%; 
                    height: ${heightPercentage}%; 
                    background: ${profit > 0 ? 'var(--primary)' : '#d32f2f'}; 
                    border-radius: 4px 4px 0 0;
                    transition: height 0.5s ease;
                    cursor: pointer;"
                    title="Admissions: ${store.nombre_admissions}">
                </div>
                <div style="
                    font-size: 11px; 
                    margin-top: 8px; 
                    text-align: center; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                    width: 60px;">
                    ${store.nom_magasin}
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}
    /**
 * Génère un rapport d'audit au format PDF/Impression
 * Basé sur les données de performance par magasin
 */
function exportAuditPDF() {
    const role = user.role;
    
    // Vérification de sécurité finale
    if (role !== 'admin' && role !== 'auditeur') {
        alert("Action non autorisée.");
        return;
    }

    const content = document.getElementById('module-audit').innerHTML;
    const printWindow = window.open('', '_blank', 'height=800,width=1000');

    printWindow.document.write(`
        <html>
            <head>
                <title>Rapport d'Audit NBFO - ${new Date().toLocaleDateString()}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    .stat-card { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .no-print { display: none; }
                    h1 { color: #1565c0; }
                </style>
            </head>
            <body>
                <h1>Rapport de Performance par Magasin</h1>
                <p>Généré le : ${new Date().toLocaleString()}</p>
                <p>Auditeur : ${user.nom}</p>
                <hr>
                ${content}
            </body>
        </html>
    `);

    printWindow.document.close();
    
    // Petite pause pour laisser le temps au rendu de s'afficher
    setTimeout(() => {
        printWindow.print();
    }, 500);
}
// Fonction qui vérifie les validations en attente pour l'auditeur
async function checkPendingValidations() {
    if (user.role !== 'auditeur' && user.role !== 'admin') return;

    const res = await fetch('/api/transferts/pending-audit');
    const pendingTransfers = await res.json();

    const container = document.getElementById('audit-validation-queue');
    
    if (pendingTransfers.length > 0) {
        // Le formulaire apparaît précisément ici
        container.innerHTML = pendingTransfers.map(t => `
            <div class="audit-card-urgent">
                <h4>⚠️ Validation Requise : Transfert d'Urgence #${t.id}</h4>
                <p>De: ${t.magasinDepart} ➔ Vers: ${t.magasinDest}</p>
                <p>Produit: ${t.produit} | Qté: ${t.quantite}</p>
                <div class="actions">
                    <button onclick="approveTransfer('${t.id}')">AUTORISER</button>
                    <button onclick="rejectTransfer('${t.id}')">BLOQUER</button>
                </div>
            </div>
        `).join('');
        container.style.display = 'block';
        notif.style.display = 'block';
    } else {
        container.style.display = 'none';
        notif.style.display = 'none';
    }
}
function renderAuditLogs(logs) {
    const list = document.getElementById('audit-log-list');
    if(!logs || logs.length === 0) {
        list.innerHTML = "Aucune transaction récente.";
        return;
    }

    list.innerHTML = logs.map(log => `
        <div style="padding:10px 0; border-bottom:1px solid #f5f5f5;">
            <div style="display:flex; justify-content:space-between;">
                <strong>${log.type}</strong>
                <span style="color:var(--primary)">+${log.montant}</span>
            </div>
            <div style="font-size:11px; color:#888;">${new Date(log.date).toLocaleString()} - ${log.magasin}</div>
        </div>
    `).join('');
}
</script>
