//src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [mode,    setMode]    = useState('login');   // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '',
    prenom: '', nom: '', telephone: '', email: '',
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ─── Connexion ─────────────────────────────────────────────────────────────
    // ─── Connexion ─────────────────────────────────────────────────────────────
  const handleLogin = async e => {
    e.preventDefault();
    setError(''); 
    setLoading(true);

    // Sécurité locale : si au bout de 10s on n'a pas bougé, on rend la main
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Le serveur met trop de temps à répondre. Réessayez.");
    }, 10000);

    try {
      await login({ username: form.username, password: form.password });
      clearTimeout(timer); // On annule le timer si ça réussit
      navigate('/dashboard', { replace: true });
    } catch (err) {
      clearTimeout(timer);
      setError(err.message || 'Identifiants incorrects');
    } finally {
      // Si on est encore sur la page (pas redirigé), on libère le bouton
      setLoading(false);
    }
  };


  // ─── Inscription ───────────────────────────────────────────────────────────
  const handleRegister = async e => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.password !== form.confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }
    if (form.password.length < 6) {
      return setError('Le mot de passe doit contenir au moins 6 caractères.');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:  form.username,
          password:  form.password,
          prenom:    form.prenom,
          nom:       form.nom,
          telephone: form.telephone,
          email:     form.email || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de l\'inscription');

      setSuccess(
        form.email
          ? `✅ Compte créé ! Un lien de confirmation a été envoyé à ${form.email}. Vérifiez votre boîte mail.`
          : '✅ Compte créé ! Un administrateur doit l\'activer avant votre première connexion.'
      );
      setForm({ username: '', password: '', confirmPassword: '', prenom: '', nom: '', telephone: '', email: '' });
      setTimeout(() => setMode('login'), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 50%, #1a3a1a 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto',
      padding: '24px 16px',
    }}>
      <div style={{
        background: 'var(--color-surface, #1e2d1e)',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        padding: '36px 32px',
        width: '100%',
        maxWidth: 420,
        marginTop: 'auto',
        marginBottom: 'auto',
      }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* ── Logo ── */}
<div style={{ textAlign: 'center', marginBottom: 28 }}>
  {/* Remplace l'émoji par une image si tu as déjà exporté le logo Khepri */}
  <div style={{ fontSize: 52, marginBottom: 8, filter: 'drop-shadow(0 0 10px rgba(76, 175, 80, 0.3))' }}>
    🏢
  </div>
  <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-primary, #4caf50)', fontWeight: 800, letterSpacing: '1px' }}>
    NFBO APP
  </h1>
  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted, #aaa)', fontSize: 13, fontWeight: 500 }}>
    Copyright ©️ 2026 • KHEPRI DESIGN™
  </p>
</div>

          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-primary, #4caf50)', fontWeight: 800 }}>
            NFBO
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted, #aaa)', fontSize: 13 }}>
            Gestion Coopérative Agricole
          </p>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: 'flex', background: 'var(--color-surface-alt, #162016)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[['login', '🔐 Connexion'], ['register', '📝 Créer un compte']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setMode(key); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                background: mode === key ? 'var(--color-primary, #4caf50)' : 'transparent',
                color: mode === key ? 'white' : 'var(--color-text-muted, #aaa)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Messages ── */}
        {error && (
          <div style={{ background: '#3b0f0f', border: '1px solid #c62828', color: '#ff8a80', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#1b3a1b', border: '1px solid #388e3c', color: '#a5d6a7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* ══════════════ FORMULAIRE CONNEXION ══════════════ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nom d'utilisateur</label>
              <input
                className="form-control"
                required
                autoComplete="username"
                value={form.username}
                onChange={set('username')}
                placeholder="ex: jdupont"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input
                className="form-control"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ padding: '13px 0', fontSize: 15, marginTop: 4 }}
            >
              {loading ? '⏳ Connexion...' : '🔐 Se connecter'}
            </button>
          </form>
        )}

        {/* ══════════════ FORMULAIRE INSCRIPTION ══════════════ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Prénom *</label>
                <input className="form-control" required value={form.prenom} onChange={set('prenom')} placeholder="Jean" />
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-control" required value={form.nom} onChange={set('nom')} placeholder="Dupont" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nom d'utilisateur *</label>
              <input
                className="form-control"
                required
                autoComplete="username"
                value={form.username}
                onChange={set('username')}
                placeholder="ex: jdupont"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Téléphone *</label>
              <input
                className="form-control"
                required
                type="tel"
                value={form.telephone}
                onChange={set('telephone')}
                placeholder="6XXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Email <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optionnel — pour confirmation)</span>
              </label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="jean.dupont@email.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(min. 6 caractères)</span></label>
              <input
                className="form-control"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe *</label>
              <input
                className="form-control"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="••••••••"
              />
            </div>

            <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ffe082' }}>
              ⚠️ Votre compte sera créé avec le rôle <strong>En attente</strong> et devra être activé par un administrateur avant la première connexion.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ padding: '13px 0', fontSize: 15 }}
            >
              {loading ? '⏳ Création en cours...' : '📝 Créer mon compte'}
            </button>
          </form>
        )}

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--color-text-muted, #666)' }}>
          NFBO © {new Date().getFullYear()} — Gestion coopérative
        </p>
      </div>
    </div>
  );
}