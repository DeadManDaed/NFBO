// src/hooks/useStockIntelligence.js
// Port complet de stock-intelligence.js en hook React réutilisable

const CONFIG = {
  seuil_alerte_stock: 10,
  jours_avant_peremption: 30,
  jours_stock_dormant: 60,
};

// Seuils de rupture dynamiques par catégorie (identique à l'original)
const SEUILS_CATEGORIE = {
  frais: 20,
  court: 15,
  secs: 50,
  manufactures_alim: 30,
  manufactures_non_alim: 25,
  sensibles: 10,
};

/**
 * Analyse un inventaire et retourne un rapport structuré.
 * @param {Array} produits  - Stocks du magasin
 * @param {Array} mouvements - Historique des mouvements (retraits/transferts)
 */
export function analyserInventaire(produits = [], mouvements = []) {
  const rapport = {
    stars: [],
    peremption: [],
    rupture: [],
    dormants: [],
    score_sante: 100,
  };

  const now = new Date();

  produits.forEach((p) => {
    const stock = parseFloat(p.stock_actuel) || 0;
    const nom = p.description || p.nom || `Lot #${p.lot_id}`;

    // ── 1. Analyse Péremption ─────────────────────────────────────────────────
    if (p.date_expiration) {
      const dateExp = new Date(p.date_expiration);
      const diffJours = (dateExp - now) / (1000 * 60 * 60 * 24);

      if (diffJours < 0) {
        rapport.peremption.push({ ...p, nom, status: 'PÉRIMÉ', urgence: 'CRITIQUE' });
        rapport.score_sante -= 10;
      } else if (diffJours <= CONFIG.jours_avant_peremption) {
        rapport.peremption.push({ ...p, nom, status: `J-${Math.ceil(diffJours)}`, urgence: 'HAUTE' });
        rapport.score_sante -= 5;
      }
    }

    // ── 2. Analyse Rupture ────────────────────────────────────────────────────
    const seuil = SEUILS_CATEGORIE[p.categorie] ?? CONFIG.seuil_alerte_stock;

    if (stock <= 0) {
      rapport.rupture.push({ ...p, nom, status: 'ÉPUISÉ', urgence: 'CRITIQUE', stock_actuel: stock });
      rapport.score_sante -= 5;
    } else if (stock <= seuil) {
      rapport.rupture.push({ ...p, nom, status: 'FAIBLE', urgence: 'MOYENNE', stock_actuel: stock });
    }

    // ── 3. Stars & Dormants ───────────────────────────────────────────────────
    const sorties = mouvements
      .filter((m) => {
        const memeProduit =
          (m.lot_id && m.lot_id === p.lot_id) ||
          (m.description && p.description && m.description === p.description);
        return memeProduit && (m.type === 'retrait' || m.type === 'transfert');
      })
      .reduce((acc, m) => acc + parseFloat(m.quantite || 0), 0);

    if (sorties > stock * 0.5 && stock > 0) {
      rapport.stars.push({ ...p, nom, performance: 'HAUTE ROTATION' });
    } else if (sorties === 0 && stock > 0) {
      const derniereReception = p.derniere_reception || p.date_derniere_entree;
      if (derniereReception) {
        const joursDepuis = (now - new Date(derniereReception)) / (1000 * 60 * 60 * 24);
        if (joursDepuis > CONFIG.jours_stock_dormant) {
          rapport.dormants.push({
            ...p,
            nom,
            value: stock * parseFloat(p.prix_ref || 0),
            jours_immobilise: Math.floor(joursDepuis),
          });
          rapport.score_sante -= 2;
        }
      }
    }
  });

  rapport.score_sante = Math.max(0, rapport.score_sante);
  return rapport;
}

/**
 * Génère un tableau d'alertes textuelles à partir d'un rapport.
 */
export function genererAlertesGlobales(rapport) {
  const alertes = [];
  if (rapport.peremption.length > 0)
    alertes.push({ type: 'warning', msg: `⚠️ ${rapport.peremption.length} lot(s) proche(s) de la péremption` });
  if (rapport.rupture.length > 0)
    alertes.push({ type: 'error', msg: `📉 ${rapport.rupture.length} produit(s) en rupture ou stock faible` });
  if (rapport.dormants.length > 0)
    alertes.push({ type: 'info', msg: `💤 ${rapport.dormants.length} produit(s) immobilisé(s) depuis +${CONFIG.jours_stock_dormant}j` });
  return alertes;
}

/**
 * Hook React : analyse les stocks et retourne le rapport + les alertes.
 * @param {Array} stocks    - Données stock du magasin
 * @param {Array} retraits  - Historique des retraits (optionnel)
 */
export function useStockIntelligence(stocks = [], retraits = []) {
  // Normalise les retraits pour le moteur d'analyse
  const mouvements = retraits.map((r) => ({
    lot_id: r.lot_id,
    description: r.lot_description,
    quantite: r.quantite,
    type: r.type_retrait === 'magasin' ? 'transfert' : 'retrait',
  }));

  const rapport = analyserInventaire(stocks, mouvements);
  const alertes = genererAlertesGlobales(rapport);

  return { rapport, alertes };
}
