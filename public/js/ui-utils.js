// public/js/ui-utils.js

async function loadReferencesForForms(type) {
    try {
        if (type === 'admission') {
            const [resLots, resProds, resMagasins] = await Promise.all([
                fetch('/api/lots'),
                fetch('/api/magasins'),
                fetch('/api/producteurs')
            ]);

            const lots = await resLots.json();
            const prods = await resProds.json();
            const magasins = await resMagasins.json();

            const selectLot = document.getElementById('adm-lot-select');
            if (selectLot) {
                selectLot.innerHTML = '<option value="">-- Choisir un lot --</option>' + 
                    lots.map(l => `<option value="${l.id}">${l.description}</option>`).join('');
            }

            const selectProd = document.getElementById('adm-producer-select');
            if (selectProd) {
                selectProd.innerHTML = '<option value="">-- Choisir un producteur --</option>' + 
                    prods.map(p => `<option value="${p.id}">${p.nom} (${p.code_producteur || p.id})</option>`).join('');
            }
            const selectMag = document.getElementById('adm-magasin-select');
            if (selectMag) {
                selectMag.innerHTML = '<option value="">-- Choisir un magasin source --</option>' + 
                    magasins.map(m => `<option value="${m.id}">${m.nom}</option>`).join('');
            }
        } 
        
        else if (type === 'retrait') {
            const [resLots, resMagasins] = await Promise.all([
                fetch('/api/lots'),
                fetch('/api/magasins')
            ]);

            const lots = await resLots.json();
            const magasins = await resMagasins.json();

            const selectLot = document.getElementById('retraitLot');
            if (selectLot) {
                selectLot.innerHTML = '<option value="">-- Choisir un lot --</option>' + 
                    lots.map(l => `<option value="${l.id}">${l.description}</option>`).join('');
            }

            const selectMag = document.getElementById('retraitMagasin');
            if (selectMag) {
                selectMag.innerHTML = '<option value="">-- Choisir un magasin source --</option>' + 
                    magasins.map(m => `<option value="${m.id}">${m.nom}</option>`).join('');
            }
        }
    } catch (err) {
        console.error("Erreur chargement:", err);
    }
}

// public/js/navigation.js (ou ton script principal)

function openModule(id) {
    document.getElementById('main-grid').style.display = 'none';
    
    const normalizedId = id.endsWith('s') ? id.slice(0, -1) : id; 
    const target = document.getElementById('module-' + normalizedId);
    
    if (target) {
        target.style.display = 'block';
        if (normalizedId === 'admission' || normalizedId === 'retrait') {
            loadReferencesForForms(normalizedId);
        }
    }
}

// public/js/ui-utils.js

async function loadStockForMagasin(magasinId) {
    const selectLot = document.getElementById('retraitLot');
    
    if (!magasinId) {
        selectLot.innerHTML = '<option value="">-- Choisir un magasin d'abord --</option>';
        return;
    }

    selectLot.innerHTML = '<option value="">Chargement du stock...</option>';

    try {
        // On appelle une route dédiée au stock par magasin
        const res = await fetch(`/api/lots/magasin/${magasinId}`);
        const stocks = await res.json();

        if (stocks.length === 0) {
            selectLot.innerHTML = '<option value="">⚠️ Aucun stock dans ce magasin</option>';
            return;
        }

        // On remplit le select avec les lots dispos (l.quantite est le stock actuel)
        selectLot.innerHTML = '<option value="">-- Choisir le produit à sortir --</option>' + 
            stocks.map(s => `
                <option value="${s.lot_id}">
                    ${s.description} (Dispo: ${s.quantite} ${s.unite || ''})
                </option>
            `).join('');

    } catch (err) {
        console.error("Erreur chargement stock magasin:", err);
        selectLot.innerHTML = '<option value="">❌ Erreur de chargement</option>';
    }
}
