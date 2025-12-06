-- fichier: diagnostics/compare_schema.sql
-- 1) table temporaire contenant le schéma attendu (ajuste si besoin)
DROP TABLE IF EXISTS expected_schema;
CREATE TEMP TABLE expected_schema (
  table_name text,
  column_name text,
  data_type text
);

INSERT INTO expected_schema (table_name, column_name, data_type) VALUES
  -- lots (attendu)
  ('lots','id','integer'),
  ('lots','producteur_id','integer'),
  ('lots','nom_producteur','character varying'),
  ('lots','tel_producteur','character varying'),
  ('lots','type_producteur','character varying'),
  ('lots','categorie','character varying'),
  ('lots','description','text'),
  ('lots','quantite','numeric'),
  ('lots','unite','character varying'),
  ('lots','prix_ref','numeric'),
  ('lots','qualite','character varying'),
  ('lots','date_reception','timestamp without time zone'),
  ('lots','date_expiration','timestamp without time zone'),
  ('lots','statut','character varying'),
  ('lots','valeur_totale','numeric'),
  ('lots','benefice_estime','numeric'),
  ('lots','coef_qualite','numeric'),
  ('lots','taux_tax','numeric'),
  -- producteurs (attendu)
  ('producteurs','id','integer'),
  ('producteurs','nom_producteur','character varying'),
  ('producteurs','tel_producteur','character varying'),
  ('producteurs','type_producteur','character varying'),
  ('producteurs','solde','numeric'),
  -- operations_caisse (attendu)
  ('operations_caisse','id','integer'),
  ('operations_caisse','utilisateur','character varying'),
  ('operations_caisse','type_operation','character varying'),
  ('operations_caisse','montant','numeric'),
  ('operations_caisse','solde_apres','numeric'),
  ('operations_caisse','producteur','character varying'),
  ('operations_caisse','description','text'),
  ('operations_caisse','date_operation','timestamp without time zone'),
  ('operations_caisse','caisse_id','integer'),
  ('operations_caisse','lot_id','integer'),
  ('operations_caisse','producteur_id','integer'),
  -- caisse (attendu)
  ('caisse','id','integer'),
  ('caisse','nom','character varying'),
  ('caisse','solde_reel','numeric'),
  ('caisse','benefices_virtuels','numeric'),
  ('caisse','benefices_reels','numeric'),
  ('caisse','created_at','timestamp without time zone'),
  ('caisse','updated_at','timestamp without time zone'),
  -- caisse_lignes (attendu)
  ('caisse_lignes','id','integer'),
  ('caisse_lignes','caisse_id','integer'),
  ('caisse_lignes','lot_id','integer'),
  ('caisse_lignes','producteur_id','integer'),
  ('caisse_lignes','type_operation','character varying'),
  ('caisse_lignes','montant','numeric'),
  ('caisse_lignes','statut','character varying'),
  ('caisse_lignes','reference','jsonb'),
  ('caisse_lignes','created_at','timestamp without time zone');

-- 2) vue des colonnes réelles
DROP TABLE IF EXISTS actual_schema;
CREATE TEMP TABLE actual_schema AS
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('lots','producteurs','operations_caisse','caisse','caisse_lignes');

-- 3) colonnes attendues manquantes
SELECT 'MISSING' AS issue, e.table_name, e.column_name, e.data_type AS expected_type, a.data_type AS actual_type
FROM expected_schema e
LEFT JOIN actual_schema a ON e.table_name = a.table_name AND e.column_name = a.column_name
WHERE a.column_name IS NULL
ORDER BY e.table_name, e.column_name;

-- 4) colonnes en trop (présentes mais non attendues)
SELECT 'EXTRA' AS issue, a.table_name, a.column_name, a.data_type AS actual_type
FROM actual_schema a
LEFT JOIN expected_schema e ON a.table_name = e.table_name AND a.column_name = e.column_name
WHERE e.column_name IS NULL
ORDER BY a.table_name, a.column_name;

-- 5) colonnes présentes mais type différent (simple comparaison textuelle)
SELECT 'TYPE_MISMATCH' AS issue, a.table_name, a.column_name, e.data_type AS expected_type, a.data_type AS actual_type
FROM actual_schema a
JOIN expected_schema e ON a.table_name = e.table_name AND a.column_name = e.column_name
WHERE LOWER(a.data_type) NOT LIKE LOWER(e.data_type) -- comparaison permissive
ORDER BY a.table_name, a.column_name;
