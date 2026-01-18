// public/js/transfert.js
(function () {
  'use strict';
  const API_BASE = (window.API_BASE || '/api');

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => null);
      throw new Error(`Erreur fetch ${url}: ${res.status} ${txt || ''}`);
    }
    return res.json();
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Charge les chauffeurs du magasin source
  window.loadChauffeurs = async function (magasinId) {
  const magasinSourceId = magasinId || document.getElementById('trans-magasin-source')?.value;
  const chauffeurSelect = document.getElementById('trans-driver');

  console.log('🔧 loadChauffeurs appelé avec magasinId:', magasinSourceId);

  if (!chauffeurSelect) {
    console.error('❌ Select trans-driver introuvable');
    return;
  }

  chauffeurSelect.innerHTML = '<option value="">-- Chargement... --</option>';

  if (!magasinSourceId) {
    console.log('⚠️ Pas de magasin source sélectionné');
    chauffeurSelect.innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
    return;
  }

  try {
    const url = `${API_BASE}/employers?magasin_id=${encodeURIComponent(magasinSourceId)}`;
    console.log('🌐 Fetching:', url);
    
    const employers = await fetchJson(url);
    console.log('📦 Employers reçus:', employers);
    
    // Filtrer uniquement les chauffeurs actifs
    const chauffeurs = employers.filter(e => {
      console.log(`  - ${e.nom}: role=${e.role}, statut=${e.statut}`);
      return e.role === 'chauffeur' && (!e.statut || e.statut === 'actif');
    });

    console.log('🚗 Chauffeurs filtrés:', chauffeurs.length, 'trouvé(s)');

    if (chauffeurs.length === 0) {
      chauffeurSelect.innerHTML = '<option value="">-- Aucun chauffeur disponible --</option>';
      return;
    }

    chauffeurSelect.innerHTML = '<option value="">-- Sélectionner un chauffeur --</option>' +
      chauffeurs.map(c => {
        const nom = escapeHtml(c.nom || `Employé ${c.id}`);
        const matricule = c.matricule ? ` (${escapeHtml(c.matricule)})` : '';
        const contact = c.contact ? ` - ${escapeHtml(c.contact)}` : '';
        return `<option value="${c.id}">${nom}${matricule}${contact}</option>`;
      }).join('');
    
    console.log('✅ Select chauffeur peuplé avec', chauffeurs.length, 'chauffeur(s)');

  } catch (err) {
    console.error('❌ Erreur loadChauffeurs:', err);
    chauffeurSelect.innerHTML = '<option value="">Erreur chargement chauffeurs</option>';
  }
};

    try {
      const employers = await fetchJson(`${API_BASE}/employers?magasin_id=${encodeURIComponent(magasinSourceId)}`);
      
      // Filtrer uniquement les chauffeurs actifs
      const chauffeurs = employers.filter(e => 
        e.role === 'chauffeur' && 
        (!e.statut || e.statut === 'actif')
      );

      if (chauffeurs.length === 0) {
        chauffeurSelect.innerHTML = '<option value="">-- Aucun chauffeur disponible --</option>';
        return;
      }

      chauffeurSelect.innerHTML = '<option value="">-- Sélectionner un chauffeur --</option>' +
        chauffeurs.map(c => {
          const nom = escapeHtml(c.nom || `Employé ${c.id}`);
          const matricule = c.matricule ? ` (${escapeHtml(c.matricule)})` : '';
          const contact = c.contact ? ` - ${escapeHtml(c.contact)}` : '';
          return `<option value="${c.id}">${nom}${matricule}${contact}</option>`;
        }).join('');

    } catch (err) {
      console.error('loadChauffeurs error', err);
      chauffeurSelect.innerHTML = '<option value="">Erreur chargement chauffeurs</option>';
    }
  };

  // Charge les lots disponibles pour le magasin source sélectionné
  window.loadLotsForTransfer = async function () {
    const magasinSourceId = document.getElementById('trans-magasin-source')?.value;
    const lotSelect = document.getElementById('trans-lot');
    const uniteSelect = document.getElementById('trans-unite');

    if (!lotSelect) return;

    lotSelect.innerHTML = '<option value="">-- Chargement... --</option>';
    if (uniteSelect) uniteSelect.innerHTML = '<option value="">'&lotSelect&'</option>';

    if (!magasinSourceId) {
      lotSelect.innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
      return;
    }

    try {
      const stocks = await fetchJson(`${API_BASE}/stocks/disponible/${encodeURIComponent(magasinSourceId)}`);

      if (!Array.isArray(stocks) || stocks.length === 0) {
        lotSelect.innerHTML = '<option value="">-- Aucun lot en stock --</option>';
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
          
          return `<option value="${lid}" data-unites='${dataUnites}' data-prix='${escapeHtml(prix)}' data-stock='${stock}'>
            ${description} — ${stock} ${escapeHtml(uniteLabel)}
          </option>`;
        }).join('');

    } catch (err) {
      console.error('loadLotsForTransfer error', err);
      lotSelect.innerHTML = '<option value="">Erreur chargement stock</option>';
    }
  };

  // Charge les unités pour le lot sélectionné
  async function loadUnitsForTransferLot() {
    const lotSel = document.getElementById('trans-lot');
    const unitSel = document.getElementById('trans-unite');
    if (!lotSel || !unitSel) return;

    const opt = lotSel.selectedOptions && lotSel.selectedOptions[0];
    let unites = [];

    if (opt) {
      const raw = opt.getAttribute('data-unites');
      if (raw) {
        try {
          unites = JSON.parse(raw);
        } catch (e) {
          unites = String(raw).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    if (!Array.isArray(unites) || unites.length === 0) {
      unitSel.innerHTML = '<option value="">-- --</option>';
      return;
    }

    unitSel.innerHTML = unites.map(u => `<option value=" ">-- --</option>`).join('');
  }

  // Soumission du formulaire de transfert
  async function handleTransferSubmit(e) {
    e.preventDefault();

    const get = id => document.getElementById(id) && document.getElementById(id).value;
    
    const magasinSourceId = parseInt(get('trans-magasin-source')) || null;
    const lotId = parseInt(get('trans-lot')) || null;
    const quantite = parseFloat(get('trans-qty')) || 0;
    const unite = get('trans-unite') || '';
    const destMagasinId = parseInt(get('trans-dest')) || null;
    const chauffeurId = get('trans-driver') || '';
    const note = get('trans-note') || '';

    // Validation
    if (!magasinSourceId) {
      alert('Veuillez sélectionner un magasin source');
      return;
    }
    if (!lotId) {
      alert('Veuillez sélectionner un lot');
      return;
    }
    if (!destMagasinId) {
      alert('Veuillez sélectionner un magasin destinataire');
      return;
    }
    if (magasinSourceId === destMagasinId) {
      alert('Le magasin source et destinataire doivent être différents');
      return;
    }
    if (!chauffeurId) {
      alert('Veuillez sélectionner un chauffeur');
      return;
    }

    // Récupérer prix_ref et info chauffeur
    const lotOpt = document.getElementById('trans-lot')?.selectedOptions?.[0];
    const prix_ref = lotOpt ? parseFloat(lotOpt.getAttribute('data-prix') || 0) : 0;
    
    const chauffeurOpt = document.getElementById('trans-driver')?.selectedOptions?.[0];
    const chauffeurNom = chauffeurOpt ? chauffeurOpt.textContent : chauffeurId;

    const body = {
      lot_id: lotId,
      quantite,
      unite,
      type_retrait: 'magasin',
      destination_magasin_id: destMagasinId,
      prix_ref,
      utilisateur: (window.CURRENT_USER || localStorage.getItem('username') || 'unknown'),
      magasin_id: magasinSourceId,
      motif: `Transfert vers magasin ${destMagasinId}. Chauffeur: ${chauffeurNom} (ID: ${chauffeurId}). ${note}`
    };

    console.log('Envoi transfert:', body);

    try {
      const response = await fetch(`${API_BASE}/retraits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        let errText = await response.text().catch(() => null);
        let errObj;
        try { errObj = errText ? JSON.parse(errText) : null; } catch (e) { errObj = null; }
        console.error('Erreur transfert (HTTP ' + response.status + '):', errObj || errText);
        const userMsg = (errObj && (errObj.error || errObj.message)) || errText || `Erreur HTTP ${response.status}`;
        alert('Erreur lors du transfert : ' + userMsg);
        return;
      }

      alert('Transfert enregistré ✔️');
      e.target.reset();
      document.getElementById('trans-lot').innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
      document.getElementById('trans-unite').innerHTML = '<option value="">-- --</option>';
      document.getElementById('trans-driver').innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
      
    } catch (err) {
      console.error('Erreur submit transfert:', err);
      alert('Erreur réseau lors du transfert : ' + (err.message || err));
    }
  }

  // Init au chargement
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initialisation module transfert');

  // 1. Charger les magasins DIRECTEMENT
  try {
    const magasins = await fetchJson(`${API_BASE}/magasins`);
    console.log('📦 Magasins chargés:', magasins);
    
    // Peupler trans-magasin-source
    const sourceSelect = document.getElementById('trans-magasin-source');
    if (sourceSelect) {
      sourceSelect.innerHTML = '<option value="">-- Sélectionner le magasin source --</option>' +
        magasins.map(m => {
          const nom = escapeHtml(m.nom || `Magasin ${m.id}`);
          const code = m.code ? ` (${escapeHtml(m.code)})` : '';
          return `<option value="${m.id}">${nom}${code}</option>`;
        }).join('');
      console.log('✅ Select magasin source peuplé');
    }

    // Peupler trans-dest
    const destSelect = document.getElementById('trans-dest');
    if (destSelect) {
      destSelect.innerHTML = '<option value="">-- Sélectionner un magasin --</option>' +
        magasins.map(m => {
          const nom = escapeHtml(m.nom || `Magasin ${m.id}`);
          const code = m.code ? ` (${escapeHtml(m.code)})` : '';
          return `<option value="${m.id}">${nom}${code}</option>`;
        }).join('');
      console.log('✅ Select magasin dest peuplé');
    }
  } catch (err) {
    console.error('❌ Erreur chargement magasins:', err);
  }

  // 2. Bind changement de magasin source -> charger lots ET chauffeurs
  const magasinSourceSel = document.getElementById('trans-magasin-source');
  if (magasinSourceSel) {
    magasinSourceSel.addEventListener('change', (e) => {
      const magasinId = e.target.value;
      console.log('🚛 Magasin source changé:', magasinId);
      if (magasinId) {
        loadLotsForTransfer();
        loadChauffeurs(magasinId);
      } else {
        // Reset si déselection
        document.getElementById('trans-lot').innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
        document.getElementById('trans-unite').innerHTML = '<option value="">-- --</option>';
        document.getElementById('trans-driver').innerHTML = '<option value="">-- Choisir d\'abord un magasin source --</option>';
      }
    });
    console.log('✅ Event listener magasin source attaché');
  }

  // 3. Bind changement de lot -> mise à jour unités
  const lotSel = document.getElementById('trans-lot');
  if (lotSel) {
    lotSel.addEventListener('change', loadUnitsForTransferLot);
    console.log('✅ Event listener lot attaché');
  }

  // 4. Bind formulaire
  const form = document.getElementById('form-expedition');
  if (form && !form.__transfer_attached) {
    form.addEventListener('submit', handleTransferSubmit);
    form.__transfer_attached = true;
    console.log('✅ Event listener formulaire attaché');
  }

  console.log('✅ Module transfert initialisé');
});

    // Bind formulaire
    const form = document.getElementById('form-expedition');
    if (form && !form.__transfer_attached) {
      form.addEventListener('submit', handleTransferSubmit);
      form.__transfer_attached = true;
    }
  });

  // Export
  window.NFBO = window.NFBO || {};
  Object.assign(window.NFBO, {
    loadLotsForTransfer,
    loadChauffeurs,
    handleTransferSubmit
  });

})();

console.log('✅ transfert.js chargé avec succès !');