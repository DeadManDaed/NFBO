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
  // plus d'import useNavigate, plus de navigate()

  return (
    // ...
    {showBack} && (
      <button
        className="btn-back"
        onClick={() => onBack?.()}
        aria-label={`Retour à ${backLabel}`}
      >
        <span aria-hidden="true">←</span>
        {backLabel}
      </button>
    )}
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
