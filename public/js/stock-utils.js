// Helpers pour charge/retraits filtrés par magasin et validation côté client
// Place ce fichier après common.js dans les pages dashboard/stocks.

(function () {
  'use strict';
  const API_BASE = (window.API_BASE || '/api');

  // Utilitaires (si déjà définis dans common.js il n'y a pas de mal à les dupliquer légèrement)
  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error(`Erreur fetch ${url}: ${res.status} ${txt || ''}`);
    }
    return res.json();
  }
  function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Fonction globale appelée par onchange dans dashboard.html
  window.loadStockForMagasin = async function (magasinId) {
    const lotSelect = document.getElementById('retraitLot');
    if (!lotSelect) return;
    lotSelect.innerHTML = '<option value="">-- Chargement... --</option>';
    if (!magasinId) {
      lotSelect.innerHTML = '<option value="">-- Choisir un magasin d\'abord --</option>';
      return;
    }

    try {
      // Récupère les lots disponibles dans le magasin (route server/routes/stocks.js)
      const stocks = await fetchJson(`${API_BASE}/stocks/disponible/${encodeURIComponent(magasinId)}`);

      // Pour obtenir prix_ref et unites, on récupère aussi la liste des lots (cache local simple)
      const lots = await fetchJson(`${API_BASE}/lots`);
      const lotById = new Map((lots || []).map(l => [String(l.id), l]));

      if (!Array.isArray(stocks) || stocks.length === 0) {
        lotSelect.innerHTML = '<option value="">-- Aucun lot en stock --</option>';
        return;
      }

      lotSelect.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
        stocks.map(s => {
          const lid = String(s.lot_id || s.lotId || s.id);
          const lot = lotById.get(lid) || {};
          const prix = (lot.prix_ref !== undefined && lot.prix_ref !== null) ? lot.prix_ref : (s.prix_ref || 0);
          const unites = lot.unites_admises && Array.isArray(lot.unites_admises) ? lot.unites_admises : (s.unite ? [s.unite] : []);
          const dataUnites = escapeHtml(JSON.stringify(unites)).replace(/&quot;/g, '"');
          const description = escapeHtml(s.description || lot.description || `Lot ${lid}`);
          const stock = Number(s.stock_actuel != null ? s.stock_actuel : (s.stock || 0));
          const uniteLabel = s.unite || (unites[0] || '');
          return `<option value="${lid}" data-unites='${dataUnites}' data-prix='${escapeHtml(prix)}' data-stock='${stock}'>${description} — ${stock} ${escapeHtml(uniteLabel)}</option>`;
        }).join('');

      // Mettre à jour les unités si besoin
      const unitSel = document.getElementById('retraitUnite') || document.getElementById('retraitUnite') || document.getElementById('retraitUnite');
      if (unitSel) {
        lotSelect.addEventListener('change', () => {
          const opt = lotSelect.selectedOptions && lotSelect.selectedOptions[0];
          const raw = opt ? opt.getAttribute('data-unites') : null;
          let unites = [];
          try { unites = raw ? JSON.parse(raw) : []; } catch(e){ unites = (raw||'').split(',').map(s=>s.trim()).filter(Boolean); }
          unitSel.innerHTML = (unites && unites.length) ? unites.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('') : '<option value="">-- --</option>';
        });
      }

    } catch (err) {
      console.error('loadStockForMagasin error', err);
      lotSelect.innerHTML = '<option value="">Erreur chargement stock</option>';
    }
  };

  // Amélioration locale de la validation avant submit du formulaire retrait
  // On override si la fonction existe déjà : on attache un listener supplémentaire
  document.addEventListener('DOMContentLoaded', () => {
    const retraitForm = document.getElementById('retraitForm');
    if (!retraitForm) return;

    // évite double-attachment
    if (retraitForm.dataset.__stock_utils_attached) return;
    retraitForm.dataset.__stock_utils_attached = '1';

    retraitForm.addEventListener('submit', async (e) => {
      // validation pré-submit stricte côté client
      const magasinId = document.getElementById('retraitMagasin')?.value;
      const lotOpt = document.getElementById('retraitLot')?.selectedOptions?.[0];
      const qtyEl = document.getElementById('retraitQty') || document.getElementById('retraitQuantity');
      const qty = parseFloat(qtyEl?.value || 0);

      if (!magasinId) { alert('Sélectionnez le magasin source.'); e.preventDefault(); return; }
      if (!lotOpt || !lotOpt.value) { alert('Sélectionnez le lot disponible dans ce magasin.'); e.preventDefault(); return; }

      const stock = parseFloat(lotOpt.getAttribute('data-stock') || '0');
      if (isNaN(stock)) { /* passe */ }
      else if (qty > stock) {
        alert(`Quantité demandée (${qty}) supérieure au stock disponible (${stock}).`);
        e.preventDefault();
        return;
      }

      // laisse le handler existant (common.js) traiter l'envoi — mais s'il n'existe pas on fait un fallback minimal
      // Si common.js a déjà attaché handleRetraitSubmit on le laissera; sinon on effectue le POST ici
      if (typeof window.handleRetraitSubmit !== 'function') {
        e.preventDefault();
        // fallback minimal : composer le body comme le serveur l'attend
        try {
          const unite = document.getElementById('retraitUnite')?.value || lotOpt.getAttribute('data-unites') ? JSON.parse(lotOpt.getAttribute('data-unites'))[0] : '';
          const prix_ref = parseFloat(lotOpt.getAttribute('data-prix') || 0);
          const body = {
            lot_id: parseInt(lotOpt.value),
            quantite: qty,
            unite,
            type_retrait: document.getElementById('typeRetrait')?.value || 'client',
            prix_ref,
            utilisateur: (window.CURRENT_USER || localStorage.getItem('username') || 'unknown'),
            magasin_id: parseInt(magasinId)
          };
          // ajouter champs conditionnels
          const type = document.getElementById('typeRetrait')?.value;
          if (type === 'producteur') body.destination_producteur_id = parseInt(document.getElementById('destProducteur')?.value) || null;
          if (type === 'magasin') body.destination_magasin_id = parseInt(document.getElementById('destMagasinRetrait')?.value || document.getElementById('destMagasin')?.value) || null;
          const res = await fetchJson(`${API_BASE}/retraits`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
          alert('Retrait enregistré ✔️');
          retraitForm.reset();
          // essayer de rafraîchir l'affichage si fonctions disponibles
          if (typeof window.loadRetraits === 'function') window.loadRetraits().catch(()=>{});
        } catch (err) {
          console.error('Erreur submit fallback retrait', err);
          alert('Erreur lors de l\'enregistrement : ' + (err.message || 'erreur'));
        }
      }
      // sinon, on laisse common.js gérer le POST (il attrape déjà les erreurs)
    });
  });
})();
