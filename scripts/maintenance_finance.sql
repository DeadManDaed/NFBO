-- ============================================================================
-- DOSSIER DE MAINTENANCE FINANCIÈRE - NBFODB
-- Date : 22 Décembre 2025
-- Rôle : Gestion automatisée de la Caisse Virtuelle et de la Banque Interne
-- ============================================================================

-------------------------------------------------------------------------------
-- 1. CALCULATEURS DE RÉFÉRENCE (Logique Métier)
-------------------------------------------------------------------------------

-- Récupération du taux de taxe par catégorie de lot
CREATE OR REPLACE FUNCTION public.nbfo_get_tax_rate(p_categorie_id INTEGER)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE 
        WHEN p_categorie_id = 1 THEN 0.05 -- Exemple: Alimentaire
        WHEN p_categorie_id = 2 THEN 0.08 -- Exemple: Transformation
        ELSE 0.03 
    END;
END;
$$ LANGUAGE plpgsql;

-- Récupération du coefficient multiplicateur de qualité
CREATE OR REPLACE FUNCTION public.nbfo_get_quality_coef(p_grade CHAR)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE 
        WHEN p_grade = 'A' THEN 1.2
        WHEN p_grade = 'B' THEN 1.0
        WHEN p_grade = 'C' THEN 0.8
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------------------------------
-- 2. TRIGGER D'ENTRÉE : Création du Profit Virtuel
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.nbfo_on_admission_insert()
 RETURNS trigger AS $function$
DECLARE
  v_coef NUMERIC;
  v_base_tax NUMERIC;
  v_final_tax NUMERIC;
  v_brut_estimee NUMERIC;
  v_tax_amount NUMERIC;
  v_net_prod NUMERIC;
BEGIN
  -- Calcul des paramètres de base
  v_coef := nbfo_get_quality_coef(NEW.coef_qualite::CHAR);
  v_base_tax := nbfo_get_tax_rate((SELECT categorie FROM lots WHERE id = NEW.lot_id));
  
  -- Taxe dynamique (ex: bonus mobile money)
  v_final_tax := COALESCE(v_base_tax, 0.05);
  IF NEW.mode_paiement = 'mobile_money' THEN v_final_tax := v_final_tax + 0.02; END IF;

  -- Valorisation
  v_brut_estimee := NEW.quantite * NEW.prix_ref * v_coef;
  v_tax_amount := ROUND(v_brut_estimee * v_final_tax, 2);
  v_net_prod := v_brut_estimee - v_tax_amount;
  
  -- MAJ Stock Global
  UPDATE lots SET 
    stock_disponible = COALESCE(stock_disponible, 0) + NEW.quantite,
    valeur_estimee_stock = COALESCE(valeur_estimee_stock, 0) + v_brut_estimee
  WHERE id = NEW.lot_id;

  -- Alimentation Caisse Virtuelle
  INSERT INTO virtual_revenues (
    admission_id, lot_id, quantite, prix_ref, estimee, 
    tax_amount, net_amount, profit_unitaire_virtuel, quantite_restante, status
  ) VALUES (
    NEW.id, NEW.lot_id, NEW.quantite, NEW.prix_ref, v_brut_estimee, 
    v_tax_amount, v_net_prod, (v_tax_amount/NEW.quantite), NEW.quantite, 'pending'
  );

  RETURN NEW;
END; $function$ LANGUAGE plpgsql;

-------------------------------------------------------------------------------
-- 3. TRIGGER DE SORTIE : Réalisation du Profit en Banque Interne
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.nbfo_on_retrait_insert()
 RETURNS trigger AS $function$
DECLARE
    v_profit_unit NUMERIC;
    v_tax_realisee NUMERIC;
    v_date_exp TIMESTAMP;
    v_gain_fraicheur NUMERIC := 0;
    v_prix_acq_unit NUMERIC;
BEGIN
    -- Récupération des données d'origine
    SELECT vr.profit_unitaire_virtuel, a.date_expiration, a.prix_ref
    INTO v_profit_unit, v_date_exp, v_prix_acq_unit
    FROM virtual_revenues vr 
    JOIN admissions a ON vr.admission_id = a.id
    WHERE vr.admission_id = NEW.admission_id;

    -- Calcul Taxe (Si vente)
    v_tax_realisee := ROUND(NEW.quantite * v_profit_unit, 2);

    -- Calcul Gain Fraicheur (Si vente client rapide)
    IF NEW.type_retrait = 'client' AND v_date_exp > NEW.date_sortie THEN
        v_gain_fraicheur := ROUND((NEW.quantite * v_prix_acq_unit) * (EXTRACT(DAY FROM (v_date_exp - NEW.date_sortie)) * 0.002), 2);
    END IF;

    -- Ecriture comptable BANQUE INTERNE
    INSERT INTO internal_bank_logs (
        type_mouvement, admission_id, lot_id, montant_realise, 
        difference_valeur, utilisateur, prix_acquisition_total
    ) VALUES (
        'RETRAIT_' || UPPER(NEW.type_retrait), 
        NEW.admission_id, NEW.lot_id,
        CASE WHEN NEW.type_retrait = 'destruction' THEN 0 ELSE v_tax_realisee END,
        CASE WHEN NEW.type_retrait = 'destruction' THEN -(NEW.quantite * v_prix_acq_unit) ELSE v_gain_fraicheur END,
        NEW.utilisateur,
        (NEW.quantite * v_prix_acq_unit)
    );

    -- MAJ Caisse Virtuelle
    UPDATE virtual_revenues SET 
        quantite_restante = quantite_restante - NEW.quantite,
        status = CASE WHEN (quantite_restante - NEW.quantite) <= 0 THEN 'realized' ELSE 'pending' END
    WHERE admission_id = NEW.admission_id;

    -- MAJ Stock Physique
    UPDATE lots SET stock_disponible = stock_disponible - NEW.quantite WHERE id = NEW.lot_id;

    RETURN NEW;
END; $function$ LANGUAGE plpgsql;
