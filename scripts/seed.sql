-- scripts/seed.sql
-- Données minimales pour tests locaux

-- 1) Créer une caisse principale si elle n'existe pas
INSERT INTO caisse (nom, solde_reel, benefices_virtuels, benefices_reels)
SELECT 'caisse_principale', 0.00, 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM caisse WHERE nom = 'caisse_principale');

-- 2) Producteur test
INSERT INTO producteurs (nom_producteur, tel_producteur, type_producteur, solde)
SELECT 'Test Producteur', '+237600000000', 'agriculteur', 0.00
WHERE NOT EXISTS (SELECT 1 FROM producteurs WHERE tel_producteur = '+237600000000');

-- 3) Exemple de lot (optionnel)
INSERT INTO lots (nom_producteur, tel_producteur, type_producteur, categorie, description, quantite, unite, prix_ref, qualite, date_reception, statut)
SELECT 'Test Producteur', '+237600000000', 'agriculteur', 'fruits', 'Lot test', 10, 'kg', 100.00, 'excellente', CURRENT_DATE, 'en_attente'
WHERE NOT EXISTS (
  SELECT 1 FROM lots WHERE description = 'Lot test' AND tel_producteur = '+237600000000'
);
