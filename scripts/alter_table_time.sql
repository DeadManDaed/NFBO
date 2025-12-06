BEGIN;

-- 1) ajouter colonnes temporaires
ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS date_reception_tmp TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS date_expiration_tmp TIMESTAMP WITHOUT TIME ZONE;

-- 2) remplir les colonnes temporaires en convertissant date -> timestamp
UPDATE lots
SET date_reception_tmp = CASE WHEN date_reception IS NOT NULL THEN date_reception::timestamp ELSE NULL END,
    date_expiration_tmp = CASE WHEN date_expiration IS NOT NULL THEN date_expiration::timestamp ELSE NULL END;

-- 3) vérifier un échantillon (optionnel, exécuter manuellement avant COMMIT)
-- SELECT id, date_reception, date_reception_tmp, date_expiration, date_expiration_tmp FROM lots LIMIT 10;

-- 4) supprimer contraintes/indexes dépendants si nécessaire
-- (si tu as des indexes sur ces colonnes, il faudra les recréer après)
-- Exemple : DROP INDEX IF EXISTS idx_lots_date_reception;

-- 5) renommer colonnes (atomique)
ALTER TABLE lots
  DROP COLUMN date_reception,
  DROP COLUMN date_expiration;

ALTER TABLE lots
  RENAME COLUMN date_reception_tmp TO date_reception,
  RENAME COLUMN date_expiration_tmp TO date_expiration;

-- 6) (re)créer index/contraintes si tu les avais supprimés
-- Exemple : CREATE INDEX idx_lots_date_reception ON lots(date_reception);

COMMIT;
