//src/components/SplashScreen.jsx

import React, { useState, useEffect } from 'react';
import LogoKhepri from './LogoKhepri';

export default function SplashScreen() {
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    // Les ailes s'ouvrent juste avant la fin du chargement
    const timer = setTimeout(() => setDeployed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.logoWrapper}>
        <LogoKhepri size={160} animateWings={deployed} className="khepri-float" />
      </div>
      
      <div style={styles.textContainer}>
        <h2 style={styles.title}>NFBO APP</h2>
        <div style={styles.loaderBar}>
          <div style={styles.loaderProgress}></div>
        </div>
        <p style={styles.subtitle}>INGÉNIERIE KHEPRI DESIGN</p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .khepri-float { animation: float 3s infinite ease-in-out; }
        @keyframes progress { 
          0% { width: 0%; } 
          100% { width: 100%; } 
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(circle, #1a331a 0%, #081208 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  logoWrapper: { marginBottom: 30 },
  textContainer: { textAlign: 'center', width: '220px' },
  title: { color: '#4caf50', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '4px', margin: '0 0 12px 0' },
  loaderBar: { height: '1px', width: '100%', background: 'rgba(212, 175, 55, 0.1)', marginBottom: '10px' },
  loaderProgress: { height: '100%', background: '#D4AF37', animation: 'progress 2.5s ease-out forwards' },
  subtitle: { color: '#D4AF37', fontSize: '10px', fontWeight: 700, letterSpacing: '3px', margin: 0, opacity: 0.7 }
};
