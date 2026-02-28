// src/components/PageLayout.jsx
// Composant wrapper universel pour toutes les pages de l'app.
// Gère : bouton Retour → Dashboard, padding safe-area Capacitor,
// titre de page, actions optionnelles en header.
//
// Usage :
//   <PageLayout title="Admissions" icon="📥">
//     ... contenu de la page ...
//   </PageLayout>
//
//   Avec actions header :
//   <PageLayout title="Stock" icon="📦" actions={<button className="btn btn-primary">+ Ajouter</button>}>
//     ...
//   </PageLayout>
//
//   Sans bouton Retour (ex: Dashboard lui-même) :
//   <PageLayout title="Tableau de bord" showBack={false}>
//     ...
//   </PageLayout>

import { useNavigate } from 'react-router-dom';

export default function PageLayout({
  title,
  subtitle,
  icon,
  children,
  actions,
  showBack = true,
  backTo = '/dashboard',      // cible du bouton Retour
  backLabel = 'Tableau de bord',
  maxWidth = '1200px',
}) {
  const navigate = useNavigate();

  return (
    <div
      className="page-container page-stack"
      style={{ maxWidth, margin: '0 auto' }}
    >
      {/* ── Barre supérieure : Retour + Titre + Actions ── */}
      <div
        className="flex items-center flex-wrap gap-md"
        style={{ justifyContent: 'space-between' }}
      >
        {/* Gauche : bouton Retour + titre */}
        <div className="flex items-center gap-md flex-wrap">
          {showBack && (
            <button
              className="btn-back"
              onClick={() => navigate(backTo)}
              aria-label={`Retour à ${backLabel}`}
            >
              <span aria-hidden="true">←</span>
              {backLabel}
            </button>
          )}

          {(title || icon) && (
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                {icon && <span aria-hidden="true">{icon}</span>}
                {title}
              </h2>
              {subtitle && (
                <p className="text-muted text-sm" style={{ marginTop: 2 }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Droite : actions optionnelles */}
        {actions && (
          <div className="flex items-center gap-sm flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* ── Contenu de la page ── */}
      {children}
    </div>
  );
}

// ─── Sous-composants d'état réutilisables ──────────────────────────────────────
// Remplace les blocs "loading / error / empty" répétés partout

export function StateLoading({ message = 'Chargement...' }) {
  return (
    <div className="state-loading card">
      <span className="state-icon animate-bounce">⏳</span>
      <p>{message}</p>
    </div>
  );
}

export function StateEmpty({ message = 'Aucune donnée disponible.', icon = '📭' }) {
  return (
    <div className="state-empty card">
      <span className="state-icon">{icon}</span>
      <p>{message}</p>
    </div>
  );
}

export function StateError({ message, onRetry }) {
  return (
    <div className="state-error card alert alert-danger">
      <span className="state-icon">⚠️</span>
      <p><strong>{message}</strong></p>
      {onRetry && (
        <button className="btn btn-danger btn-sm mt-md" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
