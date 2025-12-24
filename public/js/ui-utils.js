// public/js/ui-utils.js

async function loadReferencesForForms(type) {
    try {
        if (type === 'admission') {
            const [resLots, resProds] = await Promise.all([
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

            const selectLot = document.getElementById('retraiLot');
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
