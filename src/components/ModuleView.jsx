//src/components/ModuleView.jsx
import React from 'react';

import Administration  from '../pages/Administration';
import Admissions      from '../pages/Admissions';
import Retraits        from '../pages/Retraits';
import Transferts      from '../pages/Transferts';
import Audit           from '../pages/Audit';
import Stock           from '../pages/Stock';
import DefinitionLots  from '../pages/DefinitionLots';
import Messagerie      from '../pages/Messagerie';
import Caisse          from '../pages/Caisse';

const MODULE_MAP = {
  admissions:     Admissions,
  retraits:       Retraits,
  transferts:     Transferts,
  stock:          Stock,
  caisse:         Caisse,
  audit:          Audit,
  messagerie:     Messagerie,
  administration: Administration,
  definitionlots: DefinitionLots,
};
// J'ai ajouté tabLabel en prop pour éviter d'avoir à réimporter la constante TABS ici
export default function ModuleView({ moduleId, tabLabel, onBack, onUnreadChange }) {
  const Component = MODULE_MAP[moduleId];
  
  if (!Component) return null;

  return (
    <div className="slide-in" style={{ minHeight:'100%' }}>
      <div className="module-header">
        <button className="back-btn" onClick={onBack} aria-label="Retour">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, flex:1 }}>
          {tabLabel || moduleId}
        </h2>
      </div>
      <Component
        onBack={onBack}
        onUnreadChange={moduleId === 'messagerie' ? onUnreadChange : undefined}
      />
    </div>
  );
}
