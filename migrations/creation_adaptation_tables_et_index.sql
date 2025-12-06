BEGIN;

-- 1. Table caisse (état global)
CREATE TABLE IF NOT EXISTS caisse (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL DEFAULT 'caisse_principale',
  solde_reel NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  benefices_virtuels NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  benefices_reels NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caisse_nom ON caisse(nom);

-- 2. Adapter operations_caisse pour lier à caisse et lots (si colonnes absentes)
ALTER TABLE operations_caisse
  ADD COLUMN IF NOT EXISTS caisse_id INTEGER REFERENCES caisse(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS producteur_id INTEGER REFERENCES producteurs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operations_caisse_caisse_id ON operations_caisse(caisse_id);
CREATE INDEX IF NOT EXISTS idx_operations_caisse_lot_id ON operations_caisse(lot_id);

-- 3. Table caisse_lignes : historisation par lot/opération
CREATE TABLE IF NOT EXISTS caisse_lignes (
  id SERIAL PRIMARY KEY,
  caisse_id INTEGER NOT NULL REFERENCES caisse(id) ON DELETE CASCADE,
  lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
  producteur_id INTEGER REFERENCES producteurs(id) ON DELETE SET NULL,
  type_operation VARCHAR(50) NOT NULL, -- admission_lot | conversion | retrait | annulation
  montant NUMERIC(14,2) NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'virtuel', -- virtuel | reel | annule
  reference JSONB, -- détails (valeur_totale, benefice_estime, meta)
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caisse_lignes_lot ON caisse_lignes(lot_id);
CREATE INDEX IF NOT EXISTS idx_caisse_lignes_statut ON caisse_lignes(statut);

-- 4. Ajouter colonnes métier dans lots (si absentes)
ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS producteur_id INTEGER REFERENCES producteurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'en_attente', -- en_attente | en_attente_ecoulement | ecoule | refuse
  ADD COLUMN IF NOT EXISTS valeur_totale NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS benefice_estime NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS coef_qualite NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS taux_tax NUMERIC(6,4);

CREATE INDEX IF NOT EXISTS idx_lots_producteur_id ON lots(producteur_id);
CREATE INDEX IF NOT EXISTS idx_lots_statut ON lots(statut);

-- 5. Trigger utilitaire : mise à jour updated_at sur caisse
CREATE OR REPLACE FUNCTION update_caisse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_caisse_updated_at ON caisse;
CREATE TRIGGER trg_update_caisse_updated_at
BEFORE UPDATE ON caisse
FOR EACH ROW EXECUTE FUNCTION update_caisse_updated_at();

COMMIT;
