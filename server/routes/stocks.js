-- Exemple de ce que ta route /api/stocks/disponible/:id devrait exécuter
SELECT 
    a.lot_id, 
    l.description, 
    MAX(a.unite) as unite,
    SUM(a.quantite) - COALESCE((SELECT SUM(r.quantite) FROM retraits r WHERE r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id), 0) as stock_actuel
FROM admissions a
JOIN lots l ON a.lot_id = l.id
WHERE a.magasin_id = $1
GROUP BY a.lot_id, l.description
HAVING (SUM(a.quantite) - COALESCE((SELECT SUM(r.quantite) FROM retraits r WHERE r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id), 0)) > 0;
