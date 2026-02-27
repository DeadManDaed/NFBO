//src/main.jsx

window.addEventListener('error', e => console.error('Global error', e.error || e.message, e));
window.addEventListener('unhandledrejection', e => console.error('Unhandled rejection', e.reason));


import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const TestApp = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '24px',
    textAlign: 'center',
    padding: '20px'
  }}>
    <div>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ React fonctionne !</h1>
      <p>NBFO est opérationnel sur Vercel</p>
      <p style={{ fontSize: '16px', marginTop: '20px', opacity: 0.8 }}>
        Si vous voyez ce message, le problème est dans App.jsx
      </p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<TestApp />);