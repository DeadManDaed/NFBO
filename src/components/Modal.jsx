// src/components/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ onClose, children, maxWidth = 560 }) {
  // Bloque le scroll de la page pendant que la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal"
        style={{ maxWidth, width: '95%' }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}