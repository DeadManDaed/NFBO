// public/js/ui-utils.js
/**
 * Charge des données de référence depuis une table et remplit un <select>.
 * @param {string} type - Nom de la ressource API (ex: 'magasins', 'lots', 'producteurs', 'regions', 'departements', 'arrondissements').
 * @param {string} targetId - ID du <select> à remplir.
 * @param {string|null} parentId - Optionnel, utilisé pour les cascades (ex: departements par région).
 * @param {function|null} labelFn - Optionnel, fonction pour formater le libellé affiché.
 */
async function loadReference(type, targetId, parentId = null, labelFn = null) {
    const target = document.getElementById(targetId);
    if (!target) {
        console.error(`❌ Élément ${targetId} introuvable`);
        return;
    }
    
    let url = `/api/${type}`;
    
    // Ajouter le paramètre parent selon le type
    if (parentId) {
        if (type === 'departements') {
            url += `?region_id=${parentId}`;
        } else if (type === 'arrondissements') {
            url += `?departement_id=${parentId}`;
        } else {
            url += `?parent_id=${parentId}`;
        }
    }
    
    target.innerHTML = `<option value="">Chargement...</option>`;
    
    try {
        console.log(`🔵 Chargement ${type} depuis ${url}`);
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        console.log(`✅ ${data.length} ${type} chargés`);
        
        if (!Array.isArray(data) || data.length === 0) {
            target.innerHTML = `<option value="">Aucun ${type} trouvé</option>`;
            target.disabled = false;
            return;
        }
        
        target.innerHTML = `<option value="">-- Sélectionner --</option>` +
            data.map(item => {
                const label = labelFn ? labelFn(item) : (item.nom || item.description || item.username || item.id);
                return `<option value="${item.id}">${label}</option>`;
            }).join('');
        
        target.disabled = false;
        
    } catch (err) {
        console.error(`❌ Erreur chargement ${type}:`, err);
        target.innerHTML = `<option value="">❌ Erreur de chargement</option>`;
        target.disabled = false;
    }
}