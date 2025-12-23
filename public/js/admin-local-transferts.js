/**
 * Charge les transferts concernant le magasin de l'Admin Local
 */
async function loadLocalTransferRequests() {
    // Sécurité : Seul l'admin local rattaché à un magasin peut voir ceci
    if (!user.magasin_id) return;

    try {
        const res = await fetch(`/api/transferts/local-pending/${user.magasin_id}`);
        const transfers = await res.json();
        
        const container = document.getElementById('local-transfer-list');
        
        if (transfers.length === 0) {
            container.innerHTML = "<p>Aucune demande en attente pour votre magasin.</p>";
            return;
        }

        container.innerHTML = transfers.map(t => `
            <div class="card-transfer" style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <p><strong>Type :</strong> ${t.magasin_id_depart === user.magasin_id ? '📤 Expédition' : '📥 Réception'}</p>
                <p><strong>Produit :</strong> ${t.produit_nom} | <strong>Qté :</strong> ${t.quantite}</p>
                <p><small>Motif : ${t.motif_urgence}</small></p>
                
                <button onclick="approveLocal('${t.id}')" style="background:#2e7d32; color:white; border:none; padding:8px 12px; cursor:pointer;">
                    DONNER L'ACCORD LOCAL
                </button>
            </div>
        `).join('');
        
        document.getElementById('section-admin-local').style.display = 'block';
    } catch (err) {
        logDeploymentError('Local-Admin-Fetch-Fail', err);
    }
}

/**
 * Envoie la pré-approbation locale
 */
async function approveLocal(transferId) {
    try {
        const res = await fetch(`/api/transferts/local-approve/${transferId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                magasin_id: user.magasin_id,
                user_id: user.id 
            })
        });

        if (res.ok) {
            alert("Accord local enregistré. En attente de la validation finale de l'Auditeur.");
            loadLocalTransferRequests();
        }
    } catch (err) {
        logDeploymentError('Local-Approve-Action', err);
    }
}
