// public/js/stock-utils.js
// Charge les lots disponibles pour un magasin, remplit le select retraitLot avec data-prix/data-unites/data-stock
// Calcul du montant estimé (prix * quantité) affiché dans #retraitMontantDisplay
(function () {
  'use strict';
  const API_BASE = (window.API_BASE || '/api');

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error(`Erreur fetch ${url}: ${res.status} ${txt || ''}`);
    }
    return res.json();
  }
  function escapeHtml(str=''){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Exposée globalement pour l' onchange dans dashboard.html
  window.loadStockForMagasin = async function (magasinId) {
    const lotSelect = document.getElementById('retraitLot');
    if (!lotSelect) return;
    lotSelect.innerHTML = '<option value="">-- Chargement... --</option>';
    if (!magasinId) {
      lotSelect.innerHTML = '<option value="">-- Choisir un magasin d\'abord --</option>';
      return;
    }

    try {
      // Récupère stocks (cet endpoint renvoie description, stock_actuel, prix_ref, unites_admises)
      const stocks = await fetchJson(`${API_BASE}/stocks/disponible/${encodeURIComponent(magasinId)}`);

      if (!Array.isArray(stocks) || stocks.length === 0) {
        lotSelect.innerHTML = '<option value="">-- Aucun lot en stock --</option>';
        updateRetraitMontant(); // reset affichage
        return;
      }

      lotSelect.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
        stocks.map(s => {
          const lid = String(s.lot_id || s.lotId || s.id);
          const prix = (s.prix_ref !== undefined && s.prix_ref !== null) ? s.prix_ref : 0;
          const unites = (s.unites_admises && Array.isArray(s.unites_admises)) ? s.unites_admises : (s.unite ? [s.unite] : []);
          const dataUnites = escapeHtml(JSON.stringify(unites)).replace(/&quot;/g, '"');
          const description = escapeHtml(s.description || `Lot ${lid}`);
          const stock = Number(s.stock_actuel != null ? s.stock_actuel : (s.stock || 0));
          const uniteLabel = s.unite || (unites[0] || '');
          return `<option value="${lid}" data-unites='${dataUnites}' data-prix='${escapeHtml(prix)}' data-stock='${stock}'>${description} — ${stock} ${escapeHtml(uniteLabel)}</option>`;
        }).join('');

      // update montant initial
      updateRetraitMontant();

    } catch (err) {
      console.error('loadStockForMagasin error', err);
      lotSelect.innerHTML = '<option value="">Erreur chargement stock</option>';
      updateRetraitMontant();
    }
  };

  // Calculate + display estimated amount (prix_ref * quantite)
  function updateRetraitMontant() {
    const lotOpt = document.getElementById('retraitLot')?.selectedOptions?.[0];
    const qtyEl = document.getElementById('retraitQty') || document.getElementById('retraitQuantity');
    const montantEl = document.getElementById('retraitMontantDisplay');
    if (!montantEl) return;
    if (!lotOpt || !qtyEl) { montantEl.innerText = '—'; return; }
    const prix = parseFloat(lotOpt.getAttribute('data-prix') || 0);
    const qty = parseFloat(qtyEl.value || 0);
    if (isNaN(prix) || isNaN(qty)) { montantEl.innerText = '—'; return; }
    montantEl.innerText = `${(prix * qty).toFixed(2)} FCFA`;
  }

  // Attach listeners
  document.addEventListener('DOMContentLoaded', () => {
    const lot = document.getElementById('retraitLot');
    const qty = document.getElementById('retraitQty') || document.getElementById('retraitQuantity');

    if (lot) lot.addEventListener('change', updateRetraitMontant);
    if (qty) qty.addEventListener('input', updateRetraitMontant);

    // If the retrait form is present, ensure client-side validation: qty <= data-stock
    const retraitForm = document.getElementById('retraitForm');
    if (retraitForm && !retraitForm.dataset.__stock_utils_attached) {
      retraitForm.dataset.__stock_utils_attached = '1';
      retraitForm.addEventListener('submit', (e) => {
        const lotOpt = document.getElementById('retraitLot')?.selectedOptions?.[0];
        const qtyEl = document.getElementById('retraitQty') || document.getElementById('retraitQuantity');
        const qtyVal = parseFloat(qtyEl?.value || 0);
        if (!lotOpt) { alert('Sélectionnez d\'abord un lot disponible.'); e.preventDefault(); return; }
        const stock = parseFloat(lotOpt.getAttribute('data-stock') || '0');
        if (!isNaN(stock) && qtyVal > stock) {
          alert(`Quantité demandée (${qtyVal}) supérieure au stock disponible (${stock}).`);
          e.preventDefault();
        }
      });
    }
  });

  // Expose for console
  window.updateRetraitMontant = updateRetraitMontant;
})();
