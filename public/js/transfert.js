function switchTab(tab) {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(t => {
                t.style.background = '#eee';
                t.style.color = '#333';
                t.classList.remove('active');
            });
            event.target.style.background = 'var(--primary)';
            event.target.style.color = 'white';
            event.target.classList.add('active');

            if(tab === 'expedier') {
                document.getElementById('form-expedition').style.display = 'block';
               charlerLots(); document.getElementById('list-reception').style.display = 'none';
            } else {
                document.getElementById('form-expedition').style.display = 'none';
                document.getElementById('list-reception').style.display = 'block';
            }
        }

        async function validerReception(btn) {
            const row = btn.closest('tr');
            const qteEnvoyee = 100;
            const qteRecue = parseFloat(row.querySelector('input').value);
            
            if (qteRecue < qteEnvoyee) {
                const confirmLitige = confirm(`Écart détecté : ${qteEnvoyee - qteRecue} unités manquantes. Voulez-vous ouvrir un incident d'audit ?`);
                if(!confirmLitige) return;
            }

            try {
                const res = await fetch('/api/transferts/valider', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        id: 'TR-987',
                        qteRecue: qteRecue,
                        magasin_id: user.magasin_id
                    })
                });

                if(res.ok) {
                    alert("Réception validée. Le stock est désormais sous votre responsabilité.");
                    row.remove();
                }
            } catch (err) {
                logDeploymentError('Transfer-Reception-Fail', err);
            }
        }

        function imprimerBonTransfert(data) {
            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Bon de Transfert #TR-${data.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; border: 2px solid #000; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        .section { margin: 20px 0; display: flex; justify-content: space-between; }
                        .stamp { border: 2px solid #d32f2f; color: #d32f2f; padding: 10px; transform: rotate(-15deg); display: inline-block; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>BON DE MOUVEMENT DE STOCK INTER-MAGASINS</h2>
                        <p>Date : ${new Date().toLocaleString()}</p>
                    </div>
                    <div class="section">
                        <div><strong>EXPÉDITEUR :</strong><br>${data.magasinDepart}<br>Responsable : ${user.nom}</div>
                        <div><strong>DESTINATAIRE :</strong><br>${data.magasinDest}<br>Responsable : ${data.destinataireNom}</div>
                    </div>
                    <div class="section">
                        <div><strong>PRODUIT :</strong> ${data.produit}</div>
                        <div><strong>QUANTITÉ :</strong> ${data.quantite} ${data.unite}</div>
                    </div>
                    <div style="margin: 20px 0;"><strong>TRANSPORTEUR :</strong> ${data.chauffeur}</div>
                    <div style="margin: 20px 0; border-top: 1px dashed #000; padding-top: 10px;">
                        <p>Signature Expéditeur : .......................</p>
                        <p>Signature Chauffeur : .......................</p>
                    </div>
                    <div class="stamp">EN TRANSIT</div>
                </body>
                </html>
            `);
            win.print();
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