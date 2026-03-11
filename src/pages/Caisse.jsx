// src/pages/Caisse.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import QRCode from 'qrcode';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

const TYPE_CONFIG = {
  depot:               { label: 'Dépôt',              color: '#22c55e', bg: '#f0fdf4', icon: '💰' },
  retrait:             { label: 'Retrait',             color: '#ef4444', bg: '#fef2f2', icon: '💸' },
  paiement_producteur: { label: 'Paiement producteur', color: '#f59e0b', bg: '#fffbeb', icon: '👨‍🌾' },
  transfert:           { label: 'Transfert émis',      color: '#3b82f6', bg: '#eff6ff', icon: '➡️' },
  reception_transfert: { label: 'Transfert reçu',      color: '#8b5cf6', bg: '#f5f3ff', icon: '⬅️' },
};

// ─── Carte caisse ─────────────────────────────────────────────────────────────
function CarteCAisse({ caisse, selected, onClick }) {
  const solde = parseFloat(caisse.solde) || 0;
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'var(--color-primary)' : 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        padding: '14px 16px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 6px', color: selected ? '#fff' : 'var(--color-text)' }}>
        {caisse.magasin_nom || caisse.nom}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: selected ? '#fff' : solde > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {solde.toLocaleString('fr-FR')}
      </p>
      <p style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,.7)' : 'var(--color-text-muted)', margin: 0 }}>FCFA</p>
    </div>
  );
}

// ─── Ligne opération ──────────────────────────────────────────────────────────
function LigneOperation({ op, onSignaler, isGlobal }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[op.type_operation] || { label: op.type_operation, color: '#666', bg: '#f9f9f9', icon: '📋' };
  const montant = parseFloat(op.montant) || 0;
  const estDebit = ['retrait', 'paiement_producteur', 'transfert'].includes(op.type_operation);

  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block' }}>▶</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                {cfg.icon} {cfg.label}
              </span>
              {op.signale && <span style={{ fontSize: 10, background: '#fef2f2', color: '#ef4444', borderRadius: 4, padding: '1px 6px' }}>⚠️ Signalé</span>}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {new Date(op.date_operation).toLocaleDateString('fr-FR')} · {op.utilisateur}
              {isGlobal && op.magasin_nom ? ` · ${op.magasin_nom}` : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: estDebit ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {estDebit ? '−' : '+'}{montant.toLocaleString('fr-FR')} FCFA
          </span>
          {!op.signale && (
            <button
              onClick={e => { e.stopPropagation(); onSignaler(op); }}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 6px', fontSize: 12, color: 'var(--color-danger)' }}
              title="Signaler"
            >⚠️</button>
          )}
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px' }}>
          <div className="grid-2" style={{ gap: 8 }}>
            {[
              ['Type',         cfg.label],
              ['Montant',      `${montant.toLocaleString('fr-FR')} FCFA`],
              ['Solde après',  `${parseFloat(op.solde_apres||0).toLocaleString('fr-FR')} FCFA`],
              ['Date',         new Date(op.date_operation).toLocaleString('fr-FR')],
              ['Opérateur',    op.utilisateur || '—'],
              ['Description',  op.description || '—'],
              op.nom_producteur && ['Producteur', op.nom_producteur],
              op.magasin_destination_nom && ['Destination', op.magasin_destination_nom],
              op.signale && ['Motif signalement', op.motif_signalement || '—'],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '8px 10px' }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: 'var(--color-text)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal opération ──────────────────────────────────────────────────────────
function ModalOperation({ type, caisse, caisses, producteurs, onClose, onSuccess }) {
  const [montant,       setMontant]       = useState('');
  const [description,   setDescription]   = useState('');
  const [producteurId,  setProducteurId]  = useState('');
  const [caisseDestId,  setCaisseDestId]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [erreur,        setErreur]        = useState('');

  const titres = {
    depot:               '💰 Dépôt de fonds',
    retrait:             '💸 Retrait espèces',
    paiement_producteur: '👨‍🌾 Paiement producteur',
    transfert:           '🔄 Transfert inter-caisses',
  };

  const handleSubmit = async () => {
    setErreur('');
    if (!montant || parseFloat(montant) <= 0) { setErreur('Montant invalide'); return; }
    if (type === 'paiement_producteur' && !producteurId) { setErreur('Sélectionner un producteur'); return; }
    if (type === 'transfert' && !caisseDestId) { setErreur('Sélectionner une caisse destination'); return; }

    setSubmitting(true);
    try {
      const payload = { montant: parseFloat(montant), caisse_id: caisse.id, description };
      if (type === 'paiement_producteur') payload.producteur_id = parseInt(producteurId);
      if (type === 'transfert') payload.caisse_destination_id = parseInt(caisseDestId);

      const fn = {
        depot:               () => api.depotCaisse(payload),
        retrait:             () => api.retraitCaisse(payload),
        paiement_producteur: () => api.paiementProducteur(payload),
        transfert:           () => api.transfertCaisse(payload),
      }[type];

      await fn();
      onSuccess();
      onClose();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const prodSelectionne = producteurs.find(p => p.id === parseInt(producteurId));

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 20px' }}>{titres[type]}</h3>

      <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>Caisse</p>
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--color-text)' }}>
          {caisse.magasin_nom || caisse.nom} — Solde : {parseFloat(caisse.solde).toLocaleString('fr-FR')} FCFA
        </p>
      </div>

      {erreur && <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>❌ {erreur}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Montant (FCFA) *</label>
          <input className="form-control" type="number" min="1" step="1"
            value={montant} onChange={e => setMontant(e.target.value)}
            placeholder="0" autoFocus />
        </div>

        {type === 'paiement_producteur' && (
          <div className="form-group">
            <label className="form-label">Producteur *</label>
            <select className="form-control" value={producteurId} onChange={e => setProducteurId(e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {producteurs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nom_producteur} — solde : {parseFloat(p.solde).toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
            {prodSelectionne && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Solde disponible : <strong>{parseFloat(prodSelectionne.solde).toLocaleString('fr-FR')} FCFA</strong>
              </p>
            )}
          </div>
        )}

        {type === 'transfert' && (
          <div className="form-group">
            <label className="form-label">Caisse destination *</label>
            <select className="form-control" value={caisseDestId} onChange={e => setCaisseDestId(e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {caisses.filter(c => c.id !== caisse.id).map(c => (
                <option key={c.id} value={c.id}>
                  {c.magasin_nom || c.nom} — {parseFloat(c.solde).toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Motif de l'opération..." />
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
            {submitting ? '⏳...' : '✅ Confirmer'}
          </button>
          <button onClick={onClose} className="btn btn-ghost">Annuler</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal signalement ────────────────────────────────────────────────────────
function ModalSignalement({ operation, onClose, onSuccess }) {
  const [motif,      setMotif]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!motif.trim()) return;
    setSubmitting(true);
    try {
      await api.signalerOperationCaisse({ operation_id: operation.id, motif });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 16px' }}>⚠️ Signaler une transaction suspecte</h3>
      <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>Opération</p>
        <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: 'var(--color-text)' }}>
          {TYPE_CONFIG[operation.type_operation]?.label || operation.type_operation} — {parseFloat(operation.montant).toLocaleString('fr-FR')} FCFA
        </p>
      </div>
      <div className="form-group">
        <label className="form-label">Motif du signalement *</label>
        <textarea className="form-control" rows={3} value={motif}
          onChange={e => setMotif(e.target.value)}
          placeholder="Décrivez l'anomalie observée..." autoFocus />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={submitting || !motif.trim()} className="btn btn-danger" style={{ flex: 1 }}>
          {submitting ? '⏳...' : '⚠️ Signaler au superadmin'}
        </button>
        <button onClick={onClose} className="btn btn-ghost">Annuler</button>
      </div>
    </Modal>
  );
}
// ─── Carte producteur ─────────────────────────────────────────────────────────
function CarteProducteur({ prod }) {
  const [open, setOpen] = useState(false);
  const solde = parseFloat(prod.solde) || 0;
  const points = parseInt(prod.points_fidelite) || 0;

  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block' }}>▶</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {prod.nom_producteur}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {prod.tel_producteur || '—'} · {prod.arrondissement || prod.localite || prod.departement || prod.region || '—'}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 2px', color: solde > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
            {solde.toLocaleString('fr-FR')} FCFA
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-primary)', margin: 0 }}>
            🏆 {points} pts
          </p>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px' }}>
          {/* Localisation */}
          <div className="grid-2" style={{ gap: 8, marginBottom: 12 }}>
            {[
              ['Région',         prod.region],
              ['Département',    prod.departement],
              ['Arrondissement', prod.arrondissement],
              ['Localité',       prod.localite],
              ['Statut',         prod.statut],
              ['Points fidélité',`${points} pts`],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '8px 10px' }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: 12, margin: 0, color: 'var(--color-text)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Historique transactions */}
          {prod.transactions?.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Dernières transactions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prod.transactions.map((t, i) => {
                  const cfg = TYPE_CONFIG[t.type_operation] || { label: t.type_operation, color: '#666', icon: '📋' };
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', borderRadius: 6, padding: '7px 10px' }}>
                      <div>
                        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>{cfg.icon} {cfg.label}</span>
                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                          {new Date(t.date_operation).toLocaleDateString('fr-FR')}
                          {t.magasin ? ` · ${t.magasin}` : ''}
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                        {parseFloat(t.montant).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal émission chèque ────────────────────────────────────────────────────
function ModalCheque({ producteurs, onClose, onSuccess, showAlert }) {
  const [producteurId,    setProducteurId]    = useState('');
  const [montant,         setMontant]         = useState('');
  const [dateExpiration,  setDateExpiration]  = useState('');
  const [notes,           setNotes]           = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [erreur,          setErreur]          = useState('');
  const [chequeEmis,      setChequeEmis]      = useState(null);
  const [qrUrl,           setQrUrl]           = useState('');

  const prodSelectionne = producteurs.find(p => p.id === parseInt(producteurId));

  const handleSubmit = async () => {
    setErreur('');
    if (!producteurId) { setErreur('Sélectionner un producteur'); return; }
    if (!montant || parseFloat(montant) <= 0) { setErreur('Montant invalide'); return; }
    if (!dateExpiration) { setErreur('Date d\'expiration requise'); return; }
    if (prodSelectionne && parseFloat(prodSelectionne.solde) < parseFloat(montant)) {
      setErreur(`Solde insuffisant — disponible : ${parseFloat(prodSelectionne.solde).toLocaleString('fr-FR')} FCFA`);
      return;
    }
    setSubmitting(true);
    try {
      const cheque = await api.emettreChecque({
        producteur_id: parseInt(producteurId),
        montant: parseFloat(montant),
        date_expiration: dateExpiration,
        notes,
      });
      // Générer QR code
      const url = await QRCode.toDataURL(cheque.code, { width: 200, margin: 2 });
      setQrUrl(url);
      setChequeEmis(cheque);
      onSuccess();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Affichage chèque émis avec QR
  if (chequeEmis) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--color-success)' }}>✅ Chèque émis</h3>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 8 }} />}
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, wordBreak: 'break-all' }}>
            {chequeEmis.code}
          </p>
        </div>
        <div className="grid-2" style={{ gap: 8, marginBottom: 16 }}>
          {[
            ['Producteur', prodSelectionne?.nom_producteur],
            ['Montant',    `${parseFloat(chequeEmis.montant).toLocaleString('fr-FR')} FCFA`],
            ['Expire le',  new Date(chequeEmis.date_expiration).toLocaleDateString('fr-FR')],
            ['Statut',     chequeEmis.statut],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--color-surface-alt)', borderRadius: 6, padding: '8px 10px' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>Fermer</button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 20px' }}>🎫 Émettre un chèque</h3>
      {erreur && <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>❌ {erreur}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Producteur *</label>
          <select className="form-control" value={producteurId} onChange={e => setProducteurId(e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {producteurs.map(p => (
              <option key={p.id} value={p.id}>
                {p.nom_producteur} — {parseFloat(p.solde||0).toLocaleString('fr-FR')} FCFA
              </option>
            ))}
          </select>
          {prodSelectionne && (
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-muted)' }}>
              Solde : <strong style={{ color: parseFloat(prodSelectionne.solde) > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {parseFloat(prodSelectionne.solde).toLocaleString('fr-FR')} FCFA
              </strong> · 🏆 {prodSelectionne.points_fidelite || 0} pts
            </p>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Montant (FCFA) *</label>
          <input className="form-control" type="number" min="1" step="1"
            value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Date d'expiration *</label>
          <input className="form-control" type="date" value={dateExpiration}
            onChange={e => setDateExpiration(e.target.value)}
            min={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Motif, objet du chèque..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
            {submitting ? '⏳...' : '🎫 Émettre'}
          </button>
          <button onClick={onClose} className="btn btn-ghost">Annuler</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal scanner chèque ─────────────────────────────────────────────────────
function ModalScanner({ onClose, onSuccess, showAlert }) {
  const [code,       setCode]       = useState('');
  const [cheque,     setCheque]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [erreur,     setErreur]     = useState('');

  const handleVerifier = async () => {
    setErreur(''); setCheque(null);
    if (!code.trim()) { setErreur('Entrer un code UUID'); return; }
    try {
      const c = await api.verifierCheque(code.trim());
      setCheque(c);
    } catch (err) {
      setErreur(err.message);
    }
  };

  const handleEncaisser = async () => {
    setSubmitting(true);
    try {
      const res = await api.scannerCheque(code.trim());
      showAlert(`✅ ${res.message} — ${parseFloat(res.montant).toLocaleString('fr-FR')} FCFA`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 20px' }}>📷 Scanner / Encaisser un chèque</h3>
      {erreur && <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>❌ {erreur}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Code UUID du chèque *</label>
          <input className="form-control" type="text" value={code}
            onChange={e => { setCode(e.target.value); setCheque(null); setErreur(''); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoFocus />
        </div>
        <button onClick={handleVerifier} className="btn btn-ghost">🔍 Vérifier</button>

        {cheque && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
            <p style={{ fontWeight: 700, color: 'var(--color-success)', margin: '0 0 8px' }}>✅ Chèque valide</p>
            <div className="grid-2" style={{ gap: 8 }}>
              {[
                ['Producteur', cheque.nom_producteur],
                ['Montant',    `${parseFloat(cheque.montant).toLocaleString('fr-FR')} FCFA`],
                ['Expire le',  new Date(cheque.date_expiration).toLocaleDateString('fr-FR')],
                ['Utilisations', cheque.utilisations],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#fff', borderRadius: 6, padding: '6px 10px' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            <button onClick={handleEncaisser} disabled={submitting}
              className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>
              {submitting ? '⏳...' : '💰 Encaisser'}
            </button>
          </div>
        )}

        <button onClick={onClose} className="btn btn-ghost">Annuler</button>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Caisse() {
  const { user } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();

  const isGlobal = ['superadmin', 'auditeur'].includes(user?.role);

  const [caisses,      setCaisses]      = useState([]);
  const [operations,   setOperations]   = useState([]);
  const [producteurs,  setProducteurs]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [modalType,    setModalType]    = useState(null);
  const [opSignalee,   setOpSignalee]   = useState(null);
const [onglet,         setOnglet]         = useState('caisse');
const [produceursRich, setProduceursRich] = useState([]);
const [cheques,        setCheques]        = useState([]);
const [modalCheque,    setModalCheque]    = useState(false);
const [modalScanner,   setModalScanner]   = useState(false);
const [loadingProd,    setLoadingProd]    = useState(false);
const canCaisse = ['superadmin', 'admin', 'caisse'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, o, p] = await Promise.all([
        api.getCaisses(),
        api.getOperationsCaisse(),
        api.getProducteursSolde(),
      ]);
      setCaisses(c);
      setOperations(o);
      setProducteurs(p);
      if (c.length > 0) {
  setSelected(prev =>
    prev ? (c.find(x => x.id === prev.id) || c[0]) : c[0]
  );
}
    } catch (err) {
      showAlert(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
useEffect(() => {
  if (onglet === 'producteurs' && produceursRich.length === 0) {
    setLoadingProd(true);
    api.getProducteursCaisse()
      .then(setProduceursRich)
      .catch(err => showAlert(`❌ ${err.message}`, 'error'))
      .finally(() => setLoadingProd(false));
  }
}, [onglet]);

  // Opérations filtrées selon caisse sélectionnée
  const opsFiltrees = selected
    ? operations.filter(o => o.caisse_id === selected.id)
    : operations;

  // Stats caisse sélectionnée
  const totalDepots   = opsFiltrees.filter(o => ['depot','reception_transfert'].includes(o.type_operation)).reduce((s,o) => s + parseFloat(o.montant||0), 0);
  const totalRetraits = opsFiltrees.filter(o => ['retrait','paiement_producteur','transfert'].includes(o.type_operation)).reduce((s,o) => s + parseFloat(o.montant||0), 0);
  const totalSignales = opsFiltrees.filter(o => o.signale).length;

  // Solde global toutes caisses
  const soldeGlobal = caisses.reduce((s, c) => s + parseFloat(c.solde||0), 0);

  return (
    <PageLayout
      title="Caisse"
      icon="💰"
      subtitle={isGlobal ? 'Vue globale — toutes les caisses' : `Caisse ${selected?.magasin_nom || ''}`}
      actions={
  <div style={{ display: 'flex', gap: 8 }}>
    {canCaisse && (
      <>
        <button onClick={() => setModalCheque(true)} className="btn btn-primary btn-sm">🎫 Émettre chèque</button>
        <button onClick={() => setModalScanner(true)} className="btn btn-ghost btn-sm">📷 Scanner</button>
      </>
    )}
    <button onClick={load} className="btn btn-ghost btn-sm">🔄</button>
  </div>
}
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />
{/* ── Barre d'onglets ── */}
<div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 4 }}>
  {[
    { id: 'caisse',      label: '💰 Caisse' },
    { id: 'producteurs', label: '👥 Producteurs' },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setOnglet(tab.id)}
      className={onglet === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
      style={{ flex: 1 }}
    >
      {tab.label}
    </button>
  ))}
</div>
      {onglet === 'caisse' && (
  loading ? <StateLoading /> : (
    <>
          {/* ── Solde global (superadmin) ── */}
          {isGlobal && (
            <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #166534, #15803d)', marginBottom: 16 }}>
              <p className="stat-card-label">Solde global — toutes caisses</p>
              <p className="stat-card-value">{soldeGlobal.toLocaleString('fr-FR')} <span style={{ fontSize: 14 }}>FCFA</span></p>
            </div>
          )}

          {/* ── Grille caisses ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
            {caisses.map(c => (
              <CarteCAisse
                key={c.id}
                caisse={c}
                selected={selected?.id === c.id}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>

          {/* ── Stats caisse sélectionnée ── */}
          {(selected && superadmin)||['caisse', 'admin'].includes(user?.role) && (
            <>
              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  <p className="stat-card-label">Total entrées</p>
                  <p className="stat-card-value" style={{ fontSize: 16 }}>{totalDepots.toLocaleString('fr-FR')} <span style={{ fontSize: 11 }}>FCFA</span></p>
                </div>
                <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  <p className="stat-card-label">Total sorties</p>
                  <p className="stat-card-value" style={{ fontSize: 16 }}>{totalRetraits.toLocaleString('fr-FR')} <span style={{ fontSize: 11 }}>FCFA</span></p>
                </div>
                <div className="stat-card stat-card-gradient" style={{ background: totalSignales > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                  <p className="stat-card-label">Signalements</p>
                  <p className="stat-card-value">{totalSignales}</p>
                </div>
              </div>

              {/* ── Boutons opérations ── */}
              {['caisse', 'admin', 'superadmin'].includes(user?.role) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button onClick={() => setModalType('depot')} className="btn btn-primary btn-sm">💰 Dépôt</button>
                  <button onClick={() => setModalType('retrait')} className="btn btn-ghost btn-sm">💸 Retrait</button>
                  {producteurs.length > 0 && (
                    <button onClick={() => setModalType('paiement_producteur')} className="btn btn-ghost btn-sm">👨‍🌾 Payer producteur</button>
                  )}
                  {isGlobal && (
                    <button onClick={() => setModalType('transfert')} className="btn btn-ghost btn-sm">🔄 Transfert</button>
                  )}
                </div>
              )}

              {/* ── Historique ── */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📋 Historique des opérations</h3>
                  <span className="badge badge-neutral">{opsFiltrees.length}</span>
                </div>
                {opsFiltrees.length === 0 ? (
                  <StateEmpty icon="💰" message="Aucune opération enregistrée." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 4px' }}>
                    {opsFiltrees.map(op => (
                      <LigneOperation
                        key={op.id}
                        op={op}
                        isGlobal={isGlobal}
                        onSignaler={setOpSignalee}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        
</>
  )
)}

{onglet === 'producteurs' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {loadingProd ? <StateLoading message="Chargement des producteurs..." /> :
     produceursRich.length === 0 ? <StateEmpty icon="👥" message="Aucun producteur trouvé." /> :
     produceursRich.map(p => <CarteProducteur key={p.id} prod={p} />)
    }
  </div>
)}

      {/* ── Modales opérations ── */}
{modalCheque && (
  <ModalCheque
    producteurs={produceursRich.length > 0 ? produceursRich : producteurs}
    onClose={() => setModalCheque(false)}
    onSuccess={() => { load(); showAlert('✅ Chèque émis', 'success'); }}
    showAlert={showAlert}
  />
)}

{modalScanner && (
  <ModalScanner
    onClose={() => setModalScanner(false)}
    onSuccess={load}
    showAlert={showAlert}
  />
)}
      {modalType && selected && (
        <ModalOperation
          type={modalType}
          caisse={selected}
          caisses={caisses}
          producteurs={producteurs}
          onClose={() => setModalType(null)}
          onSuccess={() => { load(); showAlert('✅ Opération enregistrée', 'success'); }}
        />
      )}

      {/* ── Modal signalement ── */}
      {opSignalee && (
        <ModalSignalement
          operation={opSignalee}
          onClose={() => setOpSignalee(null)}
          onSuccess={() => { load(); showAlert('⚠️ Signalement envoyé au superadmin', 'success'); }}
        />
      )}
    </PageLayout>
  );
}