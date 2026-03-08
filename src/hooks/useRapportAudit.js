// src/hooks/useRapportAudit.js

import { useState, useCallback } from 'react';

export function useRapportAudit(user) {
  const [elements, setElements] = useState([]);
  const [open, setOpen] = useState(false);

  const ajouterElement = useCallback((type, item, details = '') => {
    setElements(prev => {
      // Éviter les doublons
      const existe = prev.find(e => e.type === type && e.id === item.id);
      if (existe) return prev;
      return [...prev, {
        id:          item.id,
        type,
        label:       item.lot_description || item.description || item.nom_magasin || `#${item.id}`,
        details,
        date:        new Date().toISOString(),
        data:        item,
      }];
    });
    setOpen(true);
  }, []);

  const retirerElement = useCallback((type, id) => {
    setElements(prev => prev.filter(e => !(e.type === type && e.id === id)));
  }, []);

  const mettreAJourDetails = useCallback((type, id, details) => {
    setElements(prev => prev.map(e =>
      e.type === type && e.id === id ? { ...e, details } : e
    ));
  }, []);

  const vider = useCallback(() => setElements([]), []);

  const exporterPDF = useCallback(() => {
    if (!elements.length) return;

    const now = new Date();
    const numero = `NFBO-AUD-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`;

    const typeLabel = {
      admission:  '📥 Admission',
      retrait:    '📤 Retrait',
      transfert:  '🔄 Transfert',
      stock:      '📦 Stock',
      magasin:    '🏪 Magasin',
      anomalie:   '⚠️ Anomalie',
    };

    const w = window.open('', '_blank', 'height=900,width=900');
    w.document.write(`
      <html><head>
        <title>Rapport Audit ${numero}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { border-bottom: 3px solid #166534; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .brand { font-size: 22px; font-weight: bold; color: #166534; }
          .meta { font-size: 11px; color: #666; text-align: right; line-height: 1.8; }
          .numero { font-size: 13px; font-weight: bold; color: #166534; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 14px; }
          .element { background: #f8f9fa; border-left: 4px solid #166534; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
          .element-type { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 4px; }
          .element-label { font-size: 14px; font-weight: bold; margin-bottom: 6px; }
          .element-details { font-size: 13px; color: #555; font-style: italic; }
          .element-date { font-size: 10px; color: #aaa; margin-top: 6px; }
          .anomalie { border-left-color: #dc2626; background: #fef2f2; }
          .signature { margin-top: 48px; display: flex; justify-content: space-between; }
          .sig-block { text-align: center; }
          .sig-line { border-top: 1px solid #333; width: 200px; margin: 0 auto 6px; padding-top: 6px; font-size: 12px; }
          .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { body { padding: 20px; } }
        </style>
      </head><body>
        <div class="header">
          <div>
            <div class="brand">NFBO — Rapport d'Audit</div>
            <div class="numero">${numero}</div>
          </div>
          <div class="meta">
            Généré le ${now.toLocaleString('fr-FR')}<br>
            Auditeur : <strong>${user?.username || '—'}</strong><br>
            Éléments signalés : <strong>${elements.length}</strong>
          </div>
        </div>

        ${['anomalie', 'admission', 'retrait', 'transfert', 'stock', 'magasin']
          .filter(type => elements.some(e => e.type === type))
          .map(type => `
            <div class="section">
              <div class="section-title">${typeLabel[type] || type}</div>
              ${elements.filter(e => e.type === type).map(e => `
                <div class="element ${type === 'anomalie' ? 'anomalie' : ''}">
                  <div class="element-type">${typeLabel[type] || type}</div>
                  <div class="element-label">${e.label}</div>
                  ${e.details ? `<div class="element-details">${e.details}</div>` : ''}
                  <div class="element-date">Ajouté le ${new Date(e.date).toLocaleString('fr-FR')}</div>
                </div>
              `).join('')}
            </div>
          `).join('')}

        <div class="signature">
          <div class="sig-block">
            <div class="sig-line">L'Auditeur</div>
            <div style="font-size:12px">${user?.username || '—'}</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">Visa Direction</div>
            <div style="font-size:12px">&nbsp;</div>
          </div>
        </div>

        <div class="footer">
          Document confidentiel — Ne pas diffuser sans autorisation.<br>
          Rapport généré automatiquement par NFBO System · © ${now.getFullYear()}
        </div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  }, [elements, user]);

  return {
    elements,
    open,
    setOpen,
    ajouterElement,
    retirerElement,
    mettreAJourDetails,
    vider,
    exporterPDF,
    count: elements.length,
  };
}

