/**
 * Test unitaire Jest pour la fonction computeLotValues.
 * Cette fonction pourrait exister dans 'server/services/computeLotValues.js' ou être apportée via un module commun.
 */

const { computeLotValues } = require('../../server/services/services');

describe('computeLotValues', () => {
  it('doit calculer correctement la valeur totale et le bénéfice estimé pour un lot simple', () => {
    const lot = {
      quantite: 10,
      prix_ref: 1000,
      categorie: "A",
      coef_qualite: 1.2, // si pertinent
    };
    const result = computeLotValues(lot);
    expect(result.valeur_totale).toBe(10000);
    expect(result.benefice_estime).toBeGreaterThan(0);
    expect(result.coef_qualite).toBeDefined();
    expect(result.taux_tax).toBeDefined();
  });

  it('renvoie 0 si quantité ou prix_ref vaut 0', () => {
    let lot = { quantite: 0, prix_ref: 1200, categorie: "B"};
    let result = computeLotValues(lot);
    expect(result.valeur_totale).toBe(0);

    lot = { quantite: 9, prix_ref: 0, categorie: "A"};
    result = computeLotValues(lot);
    expect(result.valeur_totale).toBe(0);
  });

  it('gère les cas limites de coefficient et taux', () => {
    const lot = {
      quantite: 1,
      prix_ref: 1,
      coef_qualite: 2,
    };
    const result = computeLotValues(lot);
    expect(result.valeur_totale).toBe(1);
    expect(result.coef_qualite).toBe(2);
  });
});
