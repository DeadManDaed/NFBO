src/components/LogoKhepri.jsx

import React from 'react';

const LogoKhepri = ({ size = 80, className = "", animateWings = false }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#AA8A2E" />
        </linearGradient>
        <style>{`
          .wing-left { 
            transform-origin: 90px 100px; 
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            transform: ${animateWings ? 'rotate(-20deg)' : 'rotate(0deg)'};
          }
          .wing-right { 
            transform-origin: 110px 100px; 
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            transform: ${animateWings ? 'rotate(20deg)' : 'rotate(0deg)'};
          }
        `}</style>
      </defs>

      <circle cx="100" cy="100" r="90" fill="url(#gradGold)" fillOpacity="0.05" stroke="url(#gradGold)" strokeWidth="0.5" />
      
      {/* Aile Gauche */}
      <g className="wing-left">
        <path d="M90 80L40 60V140L90 120V80Z" fill="url(#gradGold)" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="2"/>
        <path d="M50 70V135 M65 85V130 M80 95V125" stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.4"/>
      </g>

      {/* Aile Droite */}
      <g className="wing-right">
        <path d="M110 80L160 60V140L110 120V80Z" fill="url(#gradGold)" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="2"/>
        <circle cx="145" cy="75" r="3" fill="#D4AF37"/>
        <path d="M110 90H135 M110 110H145" stroke="#D4AF37" strokeWidth="2"/>
      </g>

      {/* Corps central */}
      <rect x="88" y="85" width="24" height="40" rx="12" fill="#0d1a0d" stroke="#D4AF37" strokeWidth="2"/>
      <text x="100" y="110" fontSize="11" fill="#D4AF37" textAnchor="middle" fontWeight="bold" fontFamily="Arial">KD</text>
      <path d="M100 40V70 M92 48C92 43 108 43 108 48C108 55 100 60 100 60" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

export default LogoKhepri;
