import { useState, useEffect } from 'react';

export default function DebugApp() {
  const [checks, setChecks] = useState({
    react: '✅ React chargé',
    dom: null,
    router: null,
    auth: null,
    capacitor: null,
    env: null,
  });

  useEffect(() => {
    // Check DOM
    const root = document.getElementById('root');
    setChecks(prev => ({
      ...prev,
      dom: root ? '✅ #root existe' : '❌ #root manquant',
    }));

    // Check Router
    try {
      const { BrowserRouter } = require('react-router-dom');
      setChecks(prev => ({ ...prev, router: '✅ react-router-dom OK' }));
    } catch (err) {
      setChecks(prev => ({ ...prev, router: `❌ ${err.message}` }));
    }

    // Check Auth
    try {
      const { useAuth } = require('../hooks/useAuth');
      setChecks(prev => ({ ...prev, auth: '✅ useAuth importable' }));
    } catch (err) {
      setChecks(prev => ({ ...prev, auth: `❌ ${err.message}` }));
    }

    // Check Capacitor
    try {
      const { CapacitorProvider } = require('../components/CapacitorProvider');
      setChecks(prev => ({ ...prev, capacitor: '✅ CapacitorProvider importable' }));
    } catch (err) {
      setChecks(prev => ({ ...prev, capacitor: `❌ ${err.message}` }));
    }

    // Check ENV
    setChecks(prev => ({
      ...prev,
      env: {
        'VITE_API_URL': import.meta.env.VITE_API_URL || '❌ Non défini',
        'MODE': import.meta.env.MODE,
        'DEV': import.meta.env.DEV,
        'PROD': import.meta.env.PROD,
      }
    }));
  }, []);

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>🔍 Debug NBFO React</h1>

      <section style={sectionStyle}>
        <h2 style={h2Style}>⚙️ Vérifications système</h2>
        <pre style={preStyle}>
          {JSON.stringify(checks, null, 2)}
        </pre>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>🌐 Informations navigateur</h2>
        <pre style={preStyle}>
          {JSON.stringify({
            userAgent: navigator.userAgent,
            language: navigator.language,
            online: navigator.onLine,
            cookiesEnabled: navigator.cookieEnabled,
            platform: navigator.platform,
          }, null, 2)}
        </pre>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>📦 Imports disponibles</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>React : {typeof React !== 'undefined' ? '✅' : '❌'}</li>
          <li>ReactDOM : {typeof ReactDOM !== 'undefined' ? '✅' : '❌'}</li>
          <li>Window.location : {window.location.href}</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>🎯 Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => window.location.reload()} style={buttonStyle}>
            🔄 Recharger
          </button>
          <button onClick={() => window.location.href = '/login'} style={buttonStyle}>
            🔐 Aller au Login
          </button>
          <button 
            onClick={() => {
              console.clear();
              alert('Console vidée. Rechargez et regardez les nouvelles erreurs.');
            }} 
            style={buttonStyle}
          >
            🧹 Vider console
          </button>
          <button 
            onClick={async () => {
              try {
                const { useAuth } = await import('../hooks/useAuth');
                alert('✅ useAuth chargé !');
              } catch (err) {
                alert('❌ Erreur: ' + err.message);
              }
            }} 
            style={buttonStyle}
          >
            Test useAuth
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>🚨 Erreurs potentielles</h2>
        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
          <p><strong>Si vous voyez cette page :</strong></p>
          <ul>
            <li>✅ React fonctionne</li>
            <li>✅ Vite build est OK</li>
            <li>❌ Le problème est dans App.jsx ou ses dépendances</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

const containerStyle = {
  padding: '20px',
  fontFamily: 'monospace',
  maxWidth: '900px',
  margin: '0 auto',
  background: 'white',
  minHeight: '100vh',
};

const titleStyle = {
  fontSize: '32px',
  marginBottom: '20px',
  color: '#333',
};

const sectionStyle = {
  marginTop: '30px',
  padding: '20px',
  background: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #dee2e6',
};

const h2Style = {
  fontSize: '20px',
  marginBottom: '15px',
  color: '#333',
};

const preStyle = {
  background: '#fff',
  padding: '15px',
  borderRadius: '6px',
  overflow: 'auto',
  fontSize: '13px',
  border: '1px solid #dee2e6',
  maxHeight: '400px',
};

const buttonStyle = {
  padding: '12px 24px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
};