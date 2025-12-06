/**
 * Test d'intégration avec Jest + Supertest pour POST /api/lots.
 * Permet de vérifier bout en bout :
 * - validation AJV (requête incomplète = code 400)
 * - réponse OK en cas de succès
 * - intégrité de la réponse (propriétés attendues)
 */

const request = require('supertest');
const app = require('../../server/app');

describe('POST /api/lots', () => {
  it('devrait ajouter un lot valide en base et retourner 201 + les infos lots', async () => {
    const payload = {
      nom_producteur: "Jean K.",
      tel_producteur: "+33601020304",
      categorie: "A",
      quantite: 12,
      prix_ref: 1200,
      date_reception: "2025-12-10",
      date_expiration: "2026-01-10"
    };
    const response = await request(app)
      .post('/api/lots')
      .send(payload)
      .set('Accept', 'application/json');
    
    expect([200, 201]).toContain(response.statusCode);
    expect(response.body).toHaveProperty('lot_id');
    expect(response.body.nom_producteur).toBe(payload.nom_producteur);
    expect(response.body.quantite).toBe(payload.quantite);
  });

  it('retourne une erreur 400 si payload incomplète/invalide', async () => {
    const payload = { nom_producteur: "Toto" }; // volontairement incomplet
    const response = await request(app)
      .post('/api/lots')
      .send(payload)
      .set('Accept', 'application/json');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
  });
});
