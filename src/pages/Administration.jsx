// src/pages/Administration.jsx
import { useState, useEffect, useCallback } from "react";
import PageLayout, { StateLoading, StateEmpty, StateError } from '../components/PageLayout';
import { useAuth } from '../hooks/useAuth';

// ─── CONSTANTES ────────────────────────────────────────────────────────────────

const CATEGORIES_MAPPING = {
  frais: [
    "Aspect visuel (couleur, fermeté)", "Absence de moisissure ou pourriture",
    "Absence d'insectes ou parasites", "Odeur normale (pas de fermentation)",
    "Température de conservation respectée", "Date de récolte < 48h",
    "Conditionnement propre et intact",
  ],
  secs: [
    "Taux d'humidité conforme (< 14%)", "Absence de moisissure",
    "Grains entiers et sains", "Absence d'insectes (charançons, etc.)",
    "Couleur uniforme et typique", "Absence d'odeur de fermentation",
    "Absence de corps étrangers", "Conditionnement étanche et sec",
  ],
  sensibles: [
    "⚠️ Contrôle sanitaire obligatoire", "Certificat vétérinaire ou phytosanitaire",
    "Traçabilité complète (origine, lot)", "Chaîne du froid respectée",
    "Analyses de laboratoire récentes", "Conditionnement conforme (hermétique)",
    "Étiquetage de danger (si applicable)", "Autorisation de transport",
  ],
  produits_foret: [
    "Identification correcte de l'espèce", "Séchage ou état de conservation",
    "Absence de moisissures/parasites", "Pureté (absence d'écorces étrangères)",
    "Conditionnement (sacs propres)",
  ],
  artisanat_utilitaire: [
    "Solidité et assemblage (stabilité)", "Finition des surfaces (ponçage, vernis)",
    "Absence de fissures ou défauts majeurs", "Conformité aux dimensions/usage",
    "Esthétique globale et symétrie",
  ],
  artisanat_art: [
    "Qualité des matériaux de base", "Finesse des détails et ornements",
    "Authenticité du style/technique", "Absence de fragilité excessive",
    "Propreté et présentation finale",
  ],
  cosmetiques_locaux: [
    "Texture et homogénéité", "Odeur caractéristique (absence de rancissement)",
    "Étanchéité du contenant", "Date de fabrication/péremption visible",
    "Clarté des instructions d'usage",
  ],
  manufactures_alim: [
    "Date de péremption valide", "Emballage intact (non percé, non gonflé)",
    "Étiquetage conforme et lisible", "Absence de rouille (conserves)",
    "Température de stockage respectée", "Numéro de lot visible",
    "Certification sanitaire valide",
  ],
  manufactures_non_alim: [
    "Emballage intact et scellé", "Étiquetage présent et lisible",
    "Date de fabrication visible", "Absence de dommages physiques",
    "Conformité aux normes", "Certificat de qualité (si applicable)",
    "Stockage approprié (T°, humidité)",
  ],
};

//_______________

const SECTIONS_CONFIG = {
  magasins:    { label: "Gestion des Magasins",       icon: "🏪", endpoint: "/api/magasins" },
  users:     { label: "Utilisateurs Système", icon: "👥", endpoint: "/api/users?resource=users" },

  employers: { label: "Employés & Staff",     icon: "🪪", endpoint: "/api/employers?resource=employers" },
  producteurs: { label: "Gestion des Producteurs",     icon: "🌾", endpoint: "/api/producteurs" },
  lots:        { label: "Référentiel des Lots",        icon: "🏷️", endpoint: "/api/lots/index" },
  validations: { label: "Validations & Transferts",    icon: "✅", endpoint: "/api/validations" },
  caisse:      { label: "Caisse Centrale & Paiements", icon: "💰", endpoint: null },
};

const COLUMNS_CONFIG = {
  users: [
    { key: "id",       label: "ID" },
    { key: "username", label: "Login" },
    { key: "role",     label: "Rôle",   type: "badge" },
    { key: "prenom",   label: "Prénom" },
    { key: "statut",   label: "Statut", type: "badge" },
  ],
  lots: [
    { key: "categorie",       label: "Catégorie",  type: "badge" },
    { key: "description",     label: "Désignation" },
    { key: "prix_ref",        label: "Prix Réf.",  type: "money" },
    { key: "unites_admises",  label: "Unités",     type: "json_list" },
    { key: "stock_disponible",label: "Stock" },
  ],
  producteurs: [
    { key: "matricule",        label: "Matricule" },
    { key: "nom_producteur",   label: "Nom / Organisation" },
    { key: "type_producteur",  label: "Type",          type: "badge" },
    { key: "telephone",        label: "Contact" },
    { key: "localite",         label: "Localité" },
    { key: "solde",            label: "Solde (FCFA)",  type: "money" },
    { key: "statut",           label: "Statut",        type: "badge" },
  ],
};

// ─── UTILITAIRES ───────────────────────────────────────────────────────────────

function formatCellValue(value, type) {
  if (value === null || value === undefined) return "-";
  if (type === "money") return `${parseFloat(value).toLocaleString("fr-FR")} FCFA`;
  if (type === "badge") return <span className={`badge badge-${value}`}>{value}</span>;
  if (type === "json_list") {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return `${Object.keys(value).length} éléments`;
    return "-";
  }
  return String(value);
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error(err.message || `Erreur HTTP ${res.status}`);
  }
  return res.json();
}

// ─── BOUTON DE NAVIGATION SIDEBAR ─────────────────────────────────────────────

function NavButton({ section, currentSection, onClick }) {
  const cfg = SECTIONS_CONFIG[section];
  const isActive = currentSection === section;
  return (
    <button
      onClick={() => { onClick(section); }}
      className={`sidebar-nav-btn${isActive ? ' active' : ''}`}
    >
      <span>{cfg.icon}</span> {cfg.label}
    </button>
  );
}
// ─── TABLEAU GÉNÉRIQUE ─────────────────────────────────────────────────────────

function AdminTable({ data, section, onDelete }) {
  const columns = COLUMNS_CONFIG[section]
    || Object.keys(data[0] || {}).map(k => ({ key: k, label: k.replace(/_/g, " ").toUpperCase() }));

  return (
    <>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => <th key={col.key}>{col.label}</th>)}
              <th style={{ textAlign: "center", width: 70 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.type === "money" ? (
                      <span style={{ fontWeight: 700, color: parseFloat(row[col.key]) > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                        {formatCellValue(row[col.key], col.type)}
                      </span>
                    ) : col.type === "badge" ? (
                      <span className={`badge badge-${row[col.key]}`}>
                        {row[col.key] || "-"}
                      </span>
                    ) : (
                      formatCellValue(row[col.key], col.type)
                    )}
                  </td>
                ))}
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => onDelete(section, row.id)}
                    className="btn btn-danger btn-sm"
                    title="Supprimer"
                    style={{ padding: "4px 10px" }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted text-xs" style={{ textAlign: "right", marginTop: 6 }}>
        {data.length} enregistrement{data.length > 1 ? "s" : ""}
      </p>
    </>
  );
}

// ─── FILTRE PRODUCTEURS ────────────────────────────────────────────────────────

function ProducteursFilter({ data, onFilter }) {
  const [search, setSearch] = useState("");
  const [solde,  setSolde]  = useState("all");
  const [sort,   setSort]   = useState("nom");

  useEffect(() => {
    let filtered = data.filter(p => {
      const matchSearch =
        (p.nom_producteur || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.matricule || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.telephone || "").includes(search);
      const s = parseFloat(p.solde || 0);
      const matchSolde =
        solde === "positif"  ? s > 0 :
        solde === "important"? s >= 100000 :
        solde === "zero"     ? s === 0 : true;
      return matchSearch && matchSolde;
    });
    filtered.sort((a, b) => {
      if (sort === "solde_desc") return parseFloat(b.solde || 0) - parseFloat(a.solde || 0);
      if (sort === "recent")     return b.id - a.id;
      return (a.nom_producteur || "").localeCompare(b.nom_producteur || "");
    });
    onFilter(filtered);
  }, [search, solde, sort, data]);

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "var(--color-surface-alt)", padding: 10, borderRadius: 8, flexWrap: "wrap" }}>
      <input
        className="form-control"
        placeholder="Rechercher nom, matricule..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ flex: "2 1 200px" }}
      />
      <select className="form-control" value={solde} onChange={e => setSolde(e.target.value)} style={{ flex: "1 1 150px" }}>
        <option value="all">Tous les soldes</option>
        <option value="positif">Soldes &gt; 0 FCFA</option>
        <option value="important">Gros soldes (&gt; 100k)</option>
        <option value="zero">Soldes nuls</option>
      </select>
      <select className="form-control" value={sort} onChange={e => setSort(e.target.value)} style={{ flex: "1 1 150px" }}>
        <option value="nom">Trier par Nom</option>
        <option value="solde_desc">Plus gros soldes</option>
        <option value="recent">Plus récents</option>
      </select>
    </div>
  );
}

// ─── HELPERS DE FORMULAIRE ─────────────────────────────────────────────────────

function FormWrapper({ title, icon, onCancel, onSubmit, children, maxWidth = 700 }) {
  return (
    <form
      onSubmit={onSubmit}
      style={{ background: "var(--color-surface)", padding: 24, borderRadius: "var(--radius-lg)", maxWidth, boxShadow: "var(--shadow-md)" }}
    >
      <h3 style={{ marginTop: 0, color: "var(--color-text)", borderBottom: "2px solid var(--color-border)", paddingBottom: 10, marginBottom: 20 }}>
        {icon} {title}
      </h3>
      {children}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
        <button type="button" onClick={onCancel} className="btn btn-ghost">Annuler</button>
        <button type="submit" className="btn btn-primary">VALIDER L'INSCRIPTION</button>
      </div>
    </form>
  );
}

function FormGrid({ children }) {
  return (
    <div className="form-grid">{children}</div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {/* Applique form-control à l'enfant direct via cloneElement */}
      {(() => {
        const child = children;
        if (!child) return null;
        // Fusionne className form-control sur l'input/select/textarea enfant
        try {
          return { ...child, props: { ...child.props, className: [child.props.className, 'form-control'].filter(Boolean).join(' ') } };
        } catch {
          return child;
        }
      })()}
    </div>
  );
}

// ─── FORMULAIRES ───────────────────────────────────────────────────────────────

//+++++++Magasins+++++++

function FormMagasin({ onCancel, onSuccess }) {
  const [form, setForm] = useState({ nom: "", code: "", region_id: "" });
  const [regions, setRegions] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    apiFetch("/api/geo?type=regions").then(r => r.json()).then(setRegions).catch(() => {});
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch("/api/magasins", { method: "POST", body: JSON.stringify({ ...form, code: form.code.toUpperCase(), region_id: form.region_id || null }) });
      alert("✅ Magasin enregistré !");
      onSuccess();
    } catch (err) { alert("❌ " + err.message); }
  };

  return (
    <FormWrapper title="Nouveau Magasin" icon="🏪" onCancel={onCancel} onSubmit={handleSubmit}>
      <FormGrid>
        <div className="form-group">
          <label className="form-label">Nom du magasin *</label>
          <input className="form-control" required value={form.nom} onChange={set("nom")} />
        </div>
        <div className="form-group">
          <label className="form-label">Code *</label>
          <input className="form-control" required value={form.code} onChange={set("code")} placeholder="Ex: YDE001" maxLength={10} />
        </div>
        <div className="form-group">
          <label className="form-label">Région</label>
          <select className="form-control" value={form.region_id} onChange={set("region_id")}>
            <option value="">-- Sélectionner --</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        </div>
      </FormGrid>
    </FormWrapper>
  );
}


//++++++++++++Users+++++++++++++

function FormUser({ onCancel, onSuccess }) {
  const [form, setForm] = useState({ username: "", password: "", role: "stock", magasin_id: "", prenom: "", nom: "", email: "", telephone: "", statut: "actif" });
  const [magasins, setMagasins] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetch("/api/magasins").then(r => r.json()).then(setMagasins).catch(() => {});
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch("/api/users", { method: "POST", body: JSON.stringify({ ...form, magasin_id: form.magasin_id || null }) });
      alert("✅ Utilisateur créé !");
      onSuccess();
    } catch (err) { alert("❌ " + err.message); }
  };

  return (
    <FormWrapper title="Créer un nouvel utilisateur" icon="👤" onCancel={onCancel} onSubmit={handleSubmit}>
      <FormGrid>
        <div className="form-group">
          <label className="form-label">Nom d'utilisateur *</label>
          <input className="form-control" required value={form.username} onChange={set("username")} placeholder="ex: jdoe" />
        </div>
        <div className="form-group">
          <label className="form-label">Mot de passe *</label>
          <input className="form-control" required type="password" value={form.password} onChange={set("password")} />
        </div>
        <div className="form-group">
          <label className="form-label">Rôle Système *</label>
          <select className="form-control" required value={form.role} onChange={set("role")}>
            <option value="stock">Agent de Stock (Admission)</option>
            <option value="caisse">Agent de Caisse</option>
            <option value="admin">Gestionnaire de Magasin</option>
            <option value="auditeur">Auditeur (Lecture seule)</option>
            <option value="superadmin">Super-Administrateur</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Magasin d'affectation</label>
          <select className="form-control" value={form.magasin_id} onChange={set("magasin_id")}>
            <option value="">-- Aucun (Utilisateur Central) --</option>
            {magasins.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Prénom</label>
          <input className="form-control" value={form.prenom} onChange={set("prenom")} />
        </div>
        <div className="form-group">
          <label className="form-label">Nom</label>
          <input className="form-control" value={form.nom} onChange={set("nom")} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="form-group">
          <label className="form-label">Téléphone</label>
          <input className="form-control" type="tel" value={form.telephone} onChange={set("telephone")} />
        </div>
      </FormGrid>
    </FormWrapper>
  );
}


//++++++++++Producteurs+++++++++++

function FormProducteur({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
    nom_producteur: "", tel_producteur: "", type_producteur: "individuel",
    carte_membre: false, region_id: "", departement_id: "", arrondissement_id: "",
    localite: "", statut: "actif",
  });
  const [regions,         setRegions]         = useState([]);
  const [departements,    setDepartements]    = useState([]);
  const [arrondissements, setArrondissements] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    apiFetch("/api/geo?type=regions").then(r => r.json()).then(setRegions).catch(() => {});
  }, []);

  const onRegionChange = async e => {
    const id = e.target.value;
    setForm(f => ({ ...f, region_id: id, departement_id: "", arrondissement_id: "" }));
    setDepartements([]); setArrondissements([]);
    if (id) {
      const data = await apiFetch(`/api/geo?type=departements&region_id=${id}`).then(r => r.json()).catch(() => []);
      setDepartements(data);
    }
  };

  const onDeptChange = async e => {
    const id = e.target.value;
    setForm(f => ({ ...f, departement_id: id, arrondissement_id: "" }));
    setArrondissements([]);
    if (id) {
      const data = await apiFetch(`/api/geo?type=arrondissements&departement_id=${id}`).then(r => r.json()).catch(() => []);
      setArrondissements(data);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch("/api/producteurs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          carte_membre:        form.carte_membre === "true" || form.carte_membre === true,
          region_id:           parseInt(form.region_id)           || null,
          departement_id:      parseInt(form.departement_id)      || null,
          arrondissement_id:   parseInt(form.arrondissement_id)   || null,
        }),
      });
      alert("✅ Producteur enregistré !");
      onSuccess();
    } catch (err) { alert("❌ " + err.message); }
  };

  return (
    <FormWrapper title="Fiche Nouveau Producteur" icon="🌾" onCancel={onCancel} onSubmit={handleSubmit}>
      <FormGrid>
        <div className="form-group">
          <label className="form-label">Nom / Raison Sociale *</label>
          <input className="form-control" required value={form.nom_producteur} onChange={set("nom_producteur")} placeholder="Ex: Jean Planteur" />
        </div>
        <div className="form-group">
          <label className="form-label">Téléphone *</label>
          <input className="form-control" required type="tel" value={form.tel_producteur} onChange={set("tel_producteur")} placeholder="6XXXXXXXX" />
        </div>
        <div className="form-group">
          <label className="form-label">Type *</label>
          <select className="form-control" required value={form.type_producteur} onChange={set("type_producteur")}>
            {["individuel","agriculteur","éleveur","pêcheur","artisan","coopérative"].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Carte Membre</label>
          <select className="form-control" value={form.carte_membre} onChange={set("carte_membre")}>
            <option value="false">Non Membre</option>
            <option value="true">Membre Actif</option>
          </select>
        </div>
      </FormGrid>

      <fieldset style={{ marginTop: 20, border: "1px solid var(--color-border)", padding: 15, borderRadius: "var(--radius-md)" }}>
        <legend style={{ padding: "0 10px", fontWeight: "bold", fontSize: 13 }}>Localisation Géographique</legend>
        <FormGrid>
          <div className="form-group">
            <label className="form-label">Région *</label>
            <select className="form-control" required value={form.region_id} onChange={onRegionChange}>
              <option value="">-- Sélectionner --</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Département *</label>
            <select className="form-control" required value={form.departement_id} onChange={onDeptChange} disabled={!form.region_id}>
              <option value="">-- Choisir Région d'abord --</option>
              {departements.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Arrondissement *</label>
            <select className="form-control" required value={form.arrondissement_id} onChange={set("arrondissement_id")} disabled={!form.departement_id}>
              <option value="">-- Choisir Dept d'abord --</option>
              {arrondissements.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Localité spécifique</label>
            <input className="form-control" value={form.localite} onChange={set("localite")} placeholder="Village, Quartier..." />
          </div>
        </FormGrid>
      </fieldset>
    </FormWrapper>
  );
}

function FormLot({ onCancel, onSuccess }) {
  const [form, setForm] = useState({ categorie: "", description: "", prix_ref: "", notes: "" });
  const [unites,        setUnites]        = useState([]);
  const [criteresAuto,  setCriteresAuto]  = useState([]);
  const [criteresPerso, setCriteresPerso] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleUnite   = u => setUnites(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const toggleCritere = c => setCriteresAuto(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const onCatChange = e => {
    const cat = e.target.value;
    setForm(f => ({ ...f, categorie: cat }));
    setCriteresAuto(CATEGORIES_MAPPING[cat] ? [...CATEGORIES_MAPPING[cat]] : []);
  };

  const addCriterePerso  = () => setCriteresPerso(prev => [...prev, { critere: "", obligatoire: "obligatoire" }]);
  const updatePerso = (i, k, v) => setCriteresPerso(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removePerso = i => setCriteresPerso(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    if (unites.length === 0) return alert("❌ Sélectionnez au moins une unité.");
    const payload = {
      ...form,
      prix_ref: parseFloat(form.prix_ref),
      unites_admises: unites,
      criteres_admission: [
        ...criteresAuto.map(c => ({ type: "standard", critere: c, obligatoire: true })),
        ...criteresPerso.filter(c => c.critere.trim()).map(c => ({ type: "personnalise", critere: c.critere, obligatoire: c.obligatoire === "obligatoire" })),
      ],
    };
    try {
      await apiFetch("/api/lots", { method: "POST", body: JSON.stringify(payload) });
      alert("✅ Lot enregistré !");
      onSuccess();
    } catch (err) { alert("❌ " + err.message); }
  };

  const unitesDisponibles = ["kg","gr","litres","unites","sacs","caisses","bottes","plateaux"];

  return (
    <FormWrapper title="Référentiel Produit : Création d'un Lot" icon="📦" onCancel={onCancel} onSubmit={handleSubmit} maxWidth={900}>
      <FormGrid>
        <div className="form-group">
          <label className="form-label">Catégorie *</label>
          <select className="form-control" required value={form.categorie} onChange={onCatChange}>
            <option value="">-- Sélectionner une catégorie --</option>
            <optgroup label="Agriculture & Nature">
              <option value="frais">Produits Frais (Vivres frais)</option>
              <option value="secs">Céréales, Grains et Légumineuses</option>
              <option value="huiles_liquides">Huiles et Produits Liquides</option>
              <option value="produits_foret">Produits de la Forêt (PFNL)</option>
            </optgroup>
            <optgroup label="Artisanat & Objets">
              <option value="artisanat_utilitaire">Artisanat Utilitaire</option>
              <option value="artisanat_art">Artisanat d'Art & Décoration</option>
              <option value="ustensiles_traditionnels">Ustensiles & Outils</option>
            </optgroup>
            <optgroup label="Transformés & Manufacturés">
              <option value="cosmetiques_locaux">Savonnerie & Cosmétiques</option>
              <option value="manufactures_alim">Manufacturés Alimentaires</option>
              <option value="manufactures_non_alim">Manufacturés Non Alimentaires</option>
            </optgroup>
            <optgroup label="Gestion Spécifique">
              <option value="sensibles">Produits de Haute Valeur / Sensibles</option>
            </optgroup>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description du produit *</label>
          <input className="form-control" required value={form.description} onChange={set("description")} placeholder="Ex: Huile de palme raffinée" />
        </div>
        <div className="form-group">
          <label className="form-label">Prix de Référence (FCFA/Unité) *</label>
          <input className="form-control" required type="number" step="0.01" min="0" value={form.prix_ref} onChange={set("prix_ref")} />
        </div>
      </FormGrid>

      {/* Unités */}
      <div style={{ marginTop: 20 }}>
        <label className="form-label" style={{ marginBottom: 10, display: "block" }}>Unités de mesure admises *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 8, background: "var(--color-surface-alt)", padding: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          {unitesDisponibles.map(u => (
            <label key={u} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={unites.includes(u)} onChange={() => toggleUnite(u)} />
              {u === "unites" ? "Unités (pièces)" : u.charAt(0).toUpperCase() + u.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Critères auto */}
      {criteresAuto.length > 0 && (
        <div style={{ marginTop: 20, background: "#f1f8e9", padding: 14, borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--color-primary)" }}>
          <p style={{ fontSize: 11, fontWeight: "bold", color: "var(--color-primary)", marginBottom: 10, textTransform: "uppercase" }}>
            📋 Critères standards recommandés
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(CATEGORIES_MAPPING[form.categorie] || []).map(c => (
              <label key={c} style={{ display: "flex", alignItems: "center", gap: 8, background: "white", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={criteresAuto.includes(c)} onChange={() => toggleCritere(c)} /> {c}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Critères perso */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong className="text-muted" style={{ fontSize: 13 }}>🔍 Critères personnalisés</strong>
          <button type="button" onClick={addCriterePerso} className="btn btn-ghost btn-sm">+ Ajouter</button>
        </div>
        {criteresPerso.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              className="form-control"
              value={c.critere}
              onChange={e => updatePerso(i, "critere", e.target.value)}
              placeholder="Nouveau critère..."
              style={{ flex: 1 }}
            />
            <select className="form-control" value={c.obligatoire} onChange={e => updatePerso(i, "obligatoire", e.target.value)} style={{ width: 120 }}>
              <option value="obligatoire">Obligatoire</option>
              <option value="optionnel">Optionnel</option>
            </select>
            <button type="button" onClick={() => removePerso(i)} className="btn btn-danger btn-sm" style={{ padding: "4px 10px", fontSize: 18 }}>×</button>
          </div>
        ))}
        <textarea
          className="form-control"
          value={form.notes}
          onChange={set("notes")}
          placeholder="Instructions spéciales pour les agents de réception..."
          style={{ marginTop: 10, height: 70, resize: "vertical" }}
        />
      </div>
    </FormWrapper>
  );
}

// ─── MODULE CAISSE ─────────────────────────────────────────────────────────────

function ModuleCaisse() {
const { user } = useAuth(); 
  const [producteurs,  setProducteurs]  = useState([]);
  const [selectedProd, setSelectedProd] = useState("");
  const [solde,        setSolde]        = useState(0);
  const [montant,      setMontant]      = useState("");
  const [mode,         setMode]         = useState("especes");
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [logsLoading,  setLogsLoading]  = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prods, history] = await Promise.all([
        apiFetch("/api/producteurs"),
        apiFetch("/api/operations_caisse?type=debit&limit=10").catch(() => []),
      ]);
      setProducteurs(prods);
      setLogs(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onProdChange = e => {
    const id = e.target.value;
    setSelectedProd(id);
    const p = producteurs.find(p => String(p.id) === id);
    setSolde(p ? parseFloat(p.solde || 0) : 0);
    setMontant("");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const m = parseFloat(montant);
    if (m > solde) return alert(`❌ Montant (${m.toLocaleString()}) dépasse le solde disponible (${solde.toLocaleString()}).`);
    if (!confirm(`Confirmer le paiement de ${m.toLocaleString("fr-FR")} FCFA ?`)) return;
    setLoading(true);
    try {
      await apiFetch("/api/operations_caisse", {
        method: "POST",
        body: JSON.stringify({
          producteur_id:  parseInt(selectedProd),
          montant:        m,
          type_operation: "debit",
          description:    `Paiement Admin via ${mode}`,
          utilisateur:    user.username || "admin",
          caisse_id:      1,
        }),
      });
      alert("✅ Paiement effectué avec succès !");
      setSelectedProd(""); setSolde(0); setMontant(""); setMode("especes");
      loadData();
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
      {/* Panneau paiement */}
      <div className="card">
        <h4 style={{ marginTop: 0, marginBottom: 16, color: "var(--color-text)" }}>Nouveau Paiement</h4>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Bénéficiaire (Producteur)</label>
            <select className="form-control" required value={selectedProd} onChange={onProdChange}>
              <option value="">-- Choisir un producteur --</option>
              {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur} ({p.matricule})</option>)}
            </select>
          </div>

          <div style={{ background: "var(--color-success-bg)", border: "1px solid #c5e1a5", padding: 14, borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#558b2f", fontWeight: 600 }}>Solde Disponible</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: solde > 0 ? "var(--color-success)" : "var(--color-danger)", marginTop: 4 }}>
              {solde.toLocaleString("fr-FR")} FCFA
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Montant à verser</label>
            <input className="form-control" required type="number" min="1" step="50" value={montant} onChange={e => setMontant(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Mode de paiement</label>
            <select className="form-control" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="especes">Espèces (Cash)</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement Bancaire</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            {loading ? "⏳ En cours..." : "✔ VALIDER LE PAIEMENT"}
          </button>
        </form>
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-header">
          <h4 style={{ margin: 0 }}>Historique des Sorties de Caisse</h4>
          <button onClick={loadData} className="btn btn-ghost btn-sm">🔄 Actualiser</button>
        </div>

        {logsLoading ? (
          <StateLoading />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {["Date", "Producteur", "Montant", "Caissier"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#999" }}>Aucune transaction récente.</td></tr>
                ) : logs.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {new Date(l.date_operation).toLocaleDateString("fr-FR")}{" "}
                      {new Date(l.date_operation).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td><strong>{l.producteur_nom || `#${l.producteur_id}`}</strong></td>
                    <td style={{ color: "var(--color-danger)", fontWeight: "bold" }}>
                      -{parseFloat(l.montant).toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="text-muted text-xs">{l.utilisateur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────

export default function Administration() {
  const [section,      setSection]      = useState("magasins");
  const [data,         setData]         = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [status,       setStatus]       = useState("loading");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [showForm,     setShowForm]     = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);

  const openDrawer  = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const handleNavClick = (sec) => {
    loadSection(sec);
    closeDrawer();
  };

  const loadSection = useCallback(async (sec) => {
    setSection(sec);
    setShowForm(false);
    if (sec === "caisse" || sec === "validations") { setStatus("ready"); return; }

    const cfg = SECTIONS_CONFIG[sec];
    if (!cfg?.endpoint) return;

    setStatus("loading");
    try {
      const result = await apiFetch(cfg.endpoint);
      setData(result);
      setFilteredData(result);
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => { loadSection("magasins"); }, [loadSection]);

  const handleDelete = async (sec, id) => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    const map = { utilisateurs: "users", employes: "employers", magasins: "magasins", lots: "lots", producteurs: "producteurs" };
    const ep = map[sec] || sec;
    try {
      await apiFetch(`/api/${ep}/${id}`, { method: "DELETE" });
      loadSection(sec);
    } catch (err) { alert("Erreur: " + err.message); }
  };

  const needsAddBtn = !["validations", "caisse"].includes(section);
  const FORMS = { magasins: FormMagasin, users: FormUser, employers: FormUser, producteurs: FormProducteur, lots: FormLot };
  const FormComponent = FORMS[section];
  const navSections = ["magasins","users","employers","producteurs","lots","validations","caisse"];

  return (
    <PageLayout title="Administration" icon="⚙️" subtitle="Configuration et gestion du système">

      {/* ── OVERLAY (ferme le drawer en cliquant à côté) ── */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* ── DRAWER SIDEBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 260,
        background: "var(--color-surface)",
        boxShadow: "4px 0 20px rgba(0,0,0,0.3)",
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        padding: "60px 16px 24px",
        overflowY: "auto",
      }}>
        {/* Bouton fermeture en haut du drawer */}
        <button
          onClick={closeDrawer}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none",
            fontSize: 22, cursor: "pointer",
            color: "var(--color-text)",
          }}
          aria-label="Fermer le menu"
        >
          ✕
        </button>

        <p style={{ fontSize: 11, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 12 }}>
          Configuration
        </p>
        <div className="sidebar-nav">
          {navSections.map(s => (
            <NavButton key={s} section={s} currentSection={section} onClick={handleNavClick} />
          ))}
        </div>
      </nav>

      {/* ── CONTENU PLEINE LARGEUR ── */}
      <div style={{ width: "100%", minWidth: 0 }}>

        {/* Header de section : hamburger + titre + bouton Ajouter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={openDrawer}
              style={{
                background: "none", border: "none",
                fontSize: 22, cursor: "pointer",
                color: "var(--color-primary)",
                padding: "4px 8px",
                lineHeight: 1,
              }}
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>
            <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--color-text)" }}>
              {SECTIONS_CONFIG[section]?.icon} {SECTIONS_CONFIG[section]?.label}
            </h2>
          </div>
          {needsAddBtn && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              + Ajouter
            </button>
          )}
        </div>

          {/* Formulaire inline */}
          {showForm && FormComponent && (
            <div style={{ marginBottom: 20 }}>
              <FormComponent
                onCancel={() => setShowForm(false)}
                onSuccess={() => { setShowForm(false); loadSection(section); }}
              />
            </div>
          )}

          {/* Contenu dynamique */}
          {section === "caisse" ? (
            <ModuleCaisse />
          ) : section === "validations" ? (
            <div className="card">
              <h3 style={{ color: "var(--color-text-muted)", marginTop: 0 }}>🛡️ Approbations Locales en Attente</h3>
              <div id="local-transfer-list" />
            </div>
          ) : status === "loading" ? (
            <StateLoading />
          ) : status === "error" ? (
            <StateError message={errorMsg} onRetry={() => loadSection(section)} />
          ) : filteredData.length === 0 ? (
            <>
              {section === "producteurs" && <ProducteursFilter data={data} onFilter={setFilteredData} />}
              <StateEmpty />
            </>
          ) : (
            <>
              {section === "producteurs" && <ProducteursFilter data={data} onFilter={setFilteredData} />}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <AdminTable data={filteredData} section={section} onDelete={handleDelete} />
              </div>
            </>
          )}
        
      </div>
    </PageLayout>
  );
}
