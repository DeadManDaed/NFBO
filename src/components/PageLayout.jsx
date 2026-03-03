// src/components/PageLayout.jsx

export default function PageLayout({
  title,
  subtitle,
  icon,
  children,
  actions,
  showBack = true,
  backLabel = 'Tableau de bord',
  onBack,
  maxWidth = '1200px',
}) {
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
              onClick={() => onBack?.()}
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

// ─── Sous-composants d'état réutilisables ─────────────────────────────────────

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