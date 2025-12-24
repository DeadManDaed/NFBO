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
    if (!target) return;
    
    let url = `/api/${type}`;
    if (parentId) url += `?parent_id=${parentId}`;
    
    target.innerHTML = `<option value="">Chargement...</option>`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`); // ✅ CORRIGÉ
        
        const data = await res.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            target.innerHTML = `<option value="">⚠️ Aucun ${type} trouvé</option>`;
            return;
        }
        
        target.innerHTML = `<option value="">-- Sélectionner --</option>` +
            data.map(item => {
                const label = labelFn ? labelFn(item) : (item.nom || item.description || item.username || item.id);
                return `<option value="${item.id}">${label}</option>`;
            }).join('');
        
        target.disabled = false;
    } catch (err) {
        console.error(`Erreur chargement ${type}:`, err); // ✅ CORRIGÉ
        target.innerHTML = `<option value="">❌ Erreur de chargement</option>`;
    }
}
