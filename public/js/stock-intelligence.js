/**
 * stock-intelligence.js
 * Moteur d'analyse des stocks partagé (Auditeurs & Gérants)
 * S'attache à window.StockIntelligence
 */

(function() {
    const StockIntelligence = {
        
        // Configuration des seuils par défaut
        config: {
            seuil_alerte_stock: 10,  // Unités
            jours_avant_peremption: 30,
            jours_stock_dormant: 60  // (b.3) Pas de mouvement depuis 60 jours
        },

        /**
         * Analyse complète d'un inventaire magasin
         * @param {Array} produits - Liste des stocks du magasin
         * @param {Array} mouvements - Historique des mouvements (pour calculer la rotation)
         */
        analyserInventaire: function(produits, mouvements = []) {
            const rapport = {
                stars: [],          // (a) Produits Stars
                peremption: [],     // (b.1) Péremption proche
                rupture: [],        // (b.2) Stock faible
                dormants: [],       // (b.3) Stocks qui dorment (cash immobilisé)
                score_sante: 100    // Note sur 100
            };

            const now = new Date();

            produits.forEach(p => {
                const stock = parseFloat(p.stock_actuel) || 0;
                
                // 1. Analyse Péremption
                if (p.date_expiration) {
                    const dateExp = new Date(p.date_expiration);
                    const diffJours = (dateExp - now) / (1000 * 60 * 60 * 24);
                    
                    if (diffJours < 0) {
                        rapport.peremption.push({ ...p, status: 'PERIMÉ', urgence: 'CRITIQUE' });
                        rapport.score_sante -= 10;
                    } else if (diffJours <= this.config.jours_avant_peremption) {
                        rapport.peremption.push({ ...p, status: `J-${Math.ceil(diffJours)}`, urgence: 'HAUTE' });
                        rapport.score_sante -= 5;
                    }
                }

                // 2. Analyse Rupture
                // Idéalement, chaque produit a son propre seuil, sinon on utilise le défaut
                const seuil = p.seuil_alerte || this.config.seuil_alerte_stock;
                if (stock <= 0) {
                    rapport.rupture.push({ ...p, status: 'ÉPUISÉ', urgence: 'CRITIQUE' });
                    rapport.score_sante -= 5;
                } else if (stock <= seuil) {
                    rapport.rupture.push({ ...p, status: 'FAIBLE', urgence: 'MOYENNE' });
                }

                // 3. Analyse "Stars" & "Dormants" (Nécessite les mouvements)
                // On calcule le taux de rotation simple
                const sorties = mouvements
                    .filter(m => m.produit_id === p.id && (m.type === 'vente' || m.type === 'sortie'))
                    .reduce((acc, m) => acc + parseFloat(m.quantite), 0);

                if (sorties > (stock * 0.5) && stock > 0) {
                    // Si on a écoulé plus de 50% du stock dispo sur la période
                    rapport.stars.push({ ...p, performance: 'HAUTE ROTATION' });
                } else if (sorties === 0 && stock > 0) {
                    // (b.3) Stock Dormant : De l'argent qui dort !
                    rapport.dormants.push({ ...p, value: stock * parseFloat(p.prix_ref) });
                    rapport.score_sante -= 2;
                }
            });

            // Normalisation du score (pas en dessous de 0)
            rapport.score_sante = Math.max(0, rapport.score_sante);
            return rapport;
        },

        /**
         * Génère un résumé visuel pour les notifications
         */
        genererAlertesGlobales: function(rapport) {
            let alertes = [];
            if (rapport.peremption.length > 0) alertes.push(`⚠️ ${rapport.peremption.length} lots proches péremption`);
            if (rapport.rupture.length > 0) alertes.push(`📉 ${rapport.rupture.length} produits en rupture`);
            if (rapport.dormants.length > 0) alertes.push(`💤 ${rapport.dormants.length} produits dormants`);
            return alertes;
        }
    };

    // Exposition globale
    window.StockIntelligence = StockIntelligence;
})();
