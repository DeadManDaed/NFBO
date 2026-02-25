//src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import DebugApp from './pages/DebugApp.jsx'; // ⚠️ Utilisez DebugApp temporairement
// import App from './App.jsx';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  document.body.innerHTML = '<h1 style="color:red;">❌ #root not found</h1>';
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DebugApp />  {/* ⚠️ Utilisez DebugApp au lieu de App */}
    </React.StrictMode>,
  );
}
console.log('NFBO App créée !');