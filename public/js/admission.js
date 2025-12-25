    <script>
    // --- LOGIQUE DU MODULE ADMISSION ---

    let activeLotData = null;

    // Charger les données au démarrage du module
    function initModuleAdmission() {
        console.log('🔵 Initialisation module Admission');
        chargerLots();
        chargerProducteurs();
        chargerMagasins();
    }

    // 1. CHARGER LES LOTS
    async function chargerLots() {
        const select = document.getElementById('adm-lot-select');
        select.innerHTML = '<option value="">-- Chargement des lots... --</option>';
        
        try {
            console.log('🔵 Chargement des lots depuis /api/lots');
            const res = await fetch('/api/lots');
            
            if (!res.ok) {
                throw new Error(`Erreur HTTP ${res.status}`);
            }
            
            const lots = await res.json();
            console.log('✅ Lots chargés:', lots.length);
            
            if (!Array.isArray(lots) || lots.length === 0) {
                select.innerHTML = '<option value="">⚠️ Aucun lot disponible</option>';
                return;
            }
            
            select.innerHTML = '<option value="">-- Sélectionner un lot --</option>' +
                lots.map(lot => {
                    const desc = lot.description || 'Sans description';
                    const cat = lot.categorie || '';
                    const prix = lot.prix_ref ? ` (${parseFloat(lot.prix_ref).toLocaleString()} FCFA)` : '';
                    return `<option value="${lot.id}">${desc} ${cat ? '- ' + cat : ''}${prix}</option>`;
                }).join('');
            
        } catch (err) {
            console.error('❌ Erreur chargement lots:', err);
            select.innerHTML = '<option value="">❌ Erreur de chargement</option>';
            alert('Impossible de charger les lots. Vérifiez votre connexion.');
        }
    }

    // 2. CHARGER LES PRODUCTEURS
    async function chargerProducteurs() {
        const select = document.getElementById('adm-producer-select');
        
        try {
            const res = await fetch('/api/producteurs');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const producteurs = await res.json();
            console.log('✅ Producteurs chargés:', producteurs.length);
            
            if (!Array.isArray(producteurs) || producteurs.length === 0) {
                select.innerHTML = '<option value="">⚠️ Aucun producteur enregistré</option>';
                return;
            }
            
            select.innerHTML = '<option value="">-- Sélectionner un producteur --</option>' +
                producteurs.map(p => {
                    const nom = p.nom_producteur || p.nom || 'Sans nom';
                    const tel = p.tel_producteur ? ` (${p.tel_producteur})` : '';
                    return `<option value="${p.id}">${nom}${tel}</option>`;
                }).join('');
            
        } catch (err) {
            console.error('❌ Erreur chargement producteurs:', err);
            select.innerHTML = '<option value="">❌ Erreur de chargement</option>';
        }
    }

    // 3. CHARGER LES MAGASINS
    async function chargerMagasins() {
        const select = document.getElementById('adm-magasin-select');
        
        try {
            const res = await fetch('/api/magasins');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const magasins = await res.json();
            console.log('✅ Magasins chargés:', magasins.length);
            
            if (!Array.isArray(magasins) || magasins.length === 0) {
                select.innerHTML = '<option value="">⚠️ Aucun magasin disponible</option>';
                return;
            }
            
            select.innerHTML = '<option value="">-- Sélectionner un magasin --</option>' +
                magasins.map(m => {
                    const nom = m.nom || 'Sans nom';
                    const code = m.code ? ` (${m.code})` : '';
                    return `<option value="${m.id}">${nom}${code}</option>`;
                }).join('');
            
        } catch (err) {
            console.error('❌ Erreur chargement magasins:', err);
            select.innerHTML = '<option value="">❌ Erreur de chargement</option>';
        }
    }

    // 4. QUAND UN LOT EST SÉLECTIONNÉ
    async function onAdmissionLotChange() {
        const lotId = document.getElementById('adm-lot-select').value;
        
        if (!lotId) {
            activeLotData = null;
            document.getElementById('lot-info-preview').style.display = 'none';
            document.getElementById('adm-unit').innerHTML = '<option value="">-- Choisir d\'abord un lot --</option>';
            document.getElementById('criteres-qualite-card').style.display = 'none';
            return;
        }

        try {
            console.log('🔵 Chargement détails lot:', lotId);
            const res = await fetch(`/api/lots/${lotId}`);
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            activeLotData = await res.json();
            console.log('✅ Lot chargé:', activeLotData);
            
            // Afficher les infos du lot
            document.getElementById('lot-prix-display').innerText = parseFloat(activeLotData.prix_ref || 0).toLocaleString();
            document.getElementById('lot-categorie-display').innerText = activeLotData.categorie || '-';
            
            // Remplir les unités
            const unites = Array.isArray(activeLotData.unites_admises) 
                ? activeLotData.unites_admises 
                : (typeof activeLotData.unites_admises === 'string' 
                    ? JSON.parse(activeLotData.unites_admises) 
                    : []);
            
            document.getElementById('lot-unites-display').innerText = unites.join(', ') || 'Non défini';
            
            const unitSelect = document.getElementById('adm-unit');
            if (unites.length > 0) {
                unitSelect.innerHTML = unites.map(u => `<option value="${u}">${u}</option>`).join('');
            } else {
                unitSelect.innerHTML = '<option value="kg">kg (par défaut)</option>';
            }
            
            // Afficher les critères si disponibles
            const criteres = Array.isArray(activeLotData.criteres_admission) 
                ? activeLotData.criteres_admission 
                : (typeof activeLotData.criteres_admission === 'string' 
                    ? JSON.parse(activeLotData.criteres_admission) 
                    : []);
            
            if (criteres.length > 0) {
                const html = criteres.map(c => `
                    <label style="display:flex; align-items:center; gap:10px; padding:8px; background:#f9f9f9; border-radius:4px; cursor:pointer;">
                        <input type="checkbox" ${c.obligatoire ? 'required' : ''}>
                        <span style="flex:1;">${c.critere} ${c.obligatoire ? '<span style="color:red;">*</span>' : ''}</span>
                    </label>
                `).join('');
                
                document.getElementById('checklist-criteres').innerHTML = html;
                document.getElementById('criteres-qualite-card').style.display = 'block';
            } else {
                document.getElementById('criteres-qualite-card').style.display = 'none';
            }
            
            document.getElementById('lot-info-preview').style.display = 'block';
            
            // Recalculer les finances
            calculateInternalFinance();
            
        } catch (err) {
            console.error('❌ Erreur chargement détails lot:', err);
            alert('Impossible de charger les détails du lot');
        }
    }

    // 5. CALCUL FINANCIER
    function calculateInternalFinance() {
        if (!activeLotData) {
            document.getElementById('val-due').innerText = '0 FCFA';
            document.getElementById('val-profit').innerText = '0 FCFA';
            return;
        }

        const qty = parseFloat(document.getElementById('adm-qty').value) || 0;
        const qualityCoef = parseFloat(document.getElementById('adm-quality').value);
        const prixRef = parseFloat(activeLotData.prix_ref) || 0;

        // Logique simplifiée
        const totalTheorique = qty * prixRef;
        const taxeGestion = 0.05; // 5% de taxe
        const versementReel = (qty * prixRef * qualityCoef) * (1 - taxeGestion);
        const profitVirtuel = totalTheorique - versementReel;

        document.getElementById('val-due').innerText = Math.round(versementReel).toLocaleString() + ' FCFA';
        document.getElementById('val-profit').innerText = Math.round(profitVirtuel).toLocaleString() + ' FCFA';
    }

    // 6. SOUMISSION DU FORMULAIRE
    document.getElementById('admissionForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            lot_id: document.getElementById('adm-lot-select').value,
            producteur_id: document.getElementById('adm-producer-select').value,
            magasin_id: document.getElementById('adm-magasin-select').value,
            quantite: parseFloat(document.getElementById('adm-qty').value),
            unite: document.getElementById('adm-unit').value,
            qualite: parseFloat(document.getElementById('adm-quality').value),
            montant_du: parseFloat(document.getElementById('val-due').innerText.replace(/[^0-9]/g, '')),
            profit_virtuel: parseFloat(document.getElementById('val-profit').innerText.replace(/[^0-9]/g, ''))
        };
        
        try {
            const res = await fetch('/api/admissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }
            
            alert('✅ Admission enregistrée avec succès !');
            document.getElementById('admissionForm').reset();
            activeLotData = null;
            document.getElementById('lot-info-preview').style.display = 'none';
            closeModule();
            
        } catch (err) {
            console.error('❌ Erreur enregistrement admission:', err);
            alert('❌ Erreur : ' + err.message);
        }
    };
    </script>
