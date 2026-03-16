// src/pages/Administration.jsx
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageLayout, { StateLoading, StateEmpty, StateError } from '../components/PageLayout';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

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

const SECTIONS_CONFIG = {
  magasins:    { label: "Gestion des Magasins",       icon: "🏪", endpoint: "/api/magasins" },
  users:       { label: "Utilisateurs Système",       icon: "👥", endpoint: "/api/users?resource=users" },
  producteurs: { label: "Gestion des Producteurs",    icon: "🌾", endpoint: "/api/producteurs" },
  lots:        { label: "Référentiel des Lots",       icon: "🏷️", endpoint: "/api/lots" },
  validations: { label: "Validations & Transferts",   icon: "✅", endpoint: null },
  caisse:      { label: "Caisse Centrale & Paiements",icon: "💰", endpoint: null },
  demandes:    { label: "Demandes d'inscription",     icon: "📝", endpoint: "/auth/demandes" },
};

const COLUMNS_CONFIG = {
  users: [
    { key: "id",       label: "ID" },
    { key: "username", label: "Login" },
    { key: "role",     label: "Rôle",   type: "badge" },
    { key: "prenom",   label: "Prénom" },
    { key: "nom",      label: "Nom" },
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

const apiFetch = (url, options = {}) => {
  const endpoint = url.replace('/api', '');
  if (options.method === 'POST')   return apiService.request(endpoint, { ...options, method: 'POST' });
  if (options.method === 'PUT')    return apiService.request(endpoint, { ...options, method: 'PUT' });
  if (options.method === 'DELETE') return apiService.request(endpoint, { ...options, method: 'DELETE' });
  return apiService.request(endpoint, options);
};

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

  const applyFilter = useCallback(() => {
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
  }, [search, solde, sort, data, onFilter]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

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
      {(() => {
        const child = children;
        if (!child) return null;
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

function FormMagasin({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nom: "", code: "", region_id: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiFetch("/api/geo?type=regions"),
  });

  const mutation = useMutation({
    mutationFn: (payload) => apiFetch("/api/magasins", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['magasins']);
      alert("✅ Magasin enregistré !");
      onSuccess();
    },
    onError: (err) => alert("❌ " + err.message),
  });

  const handleSubmit = e => {
    e.preventDefault();
    mutation.mutate({ ...form, code: form.code.toUpperCase(), region_id: form.region_id || null });
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

function FormUser({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: "", password: "", role: "stock", magasin_id: "", prenom: "", nom: "", email: "", telephone: "", statut: "actif" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { data: magasins = [] } = useQuery({
    queryKey: ['magasins'],
    queryFn: () => apiFetch("/api/magasins"),
  });

  const mutation = useMutation({
    mutationFn: (payload) => apiFetch("/api/users", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert("✅ Utilisateur créé !");
      onSuccess();
    },
    onError: (err) => alert("❌ " + err.message),
  });

  const handleSubmit = e => {
    e.preventDefault();
    mutation.mutate({ ...form, magasin_id: form.magasin_id || null });
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

function FormProducteur({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nom_producteur: "", tel_producteur: "", type_producteur: "individuel",
    carte_membre: false, region_id: "", departement_id: "", arrondissement_id: "",
    localite: "", statut: "actif",
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiFetch("/api/geo?type=regions"),
  });

  const { data: departements = [] } = useQuery({
    queryKey: ['departements', form.region_id],
    queryFn: () => apiFetch(`/api/geo?type=departements&region_id=${form.region_id}`),
    enabled: !!form.region_id,
  });

  const { data: arrondissements = [] } = useQuery({
    queryKey: ['arrondissements', form.departement_id],
    queryFn: () => apiFetch(`/api/geo?type=arrondissements&departement_id=${form.departement_id}`),
    enabled: !!form.departement_id,
  });

  const mutation = useMutation({
    mutationFn: (payload) => apiFetch("/api/producteurs", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['producteurs']);
      alert("✅ Producteur enregistré !");
      onSuccess();
    },
    onError: (err) => alert("❌ " + err.message),
  });

  const handleSubmit = e => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      carte_membre: form.carte_membre === "true" || form.carte_membre === true,
      region_id: parseInt(form.region_id) || null,
      departement_id: parseInt(form.departement_id) || null,
      arrondissement_id: parseInt(form.arrondissement_id) || null,
    });
  };

  const onRegionChange = e => {
    const id = e.target.value;
    setForm(f => ({ ...f, region_id: id, departement_id: "", arrondissement_id: "" }));
  };

  const onDeptChange = e => {
    const id = e.target.value;
    setForm(f => ({ ...f, departement_id: id, arrondissement_id: "" }));
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
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ categorie: "", description: "", prix_ref: "", notes: "" });
  const [unites, setUnites] = useState([]);
  const [criteresAuto, setCriteresAuto] = useState([]);
  const [criteresPerso, setCriteresPerso] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleUnite = u => setUnites(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const toggleCritere = c => setCriteresAuto(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const onCatChange = e => {
    const cat = e.target.value;
    setForm(f => ({ ...f, categorie: cat }));
    setCriteresAuto(CATEGORIES_MAPPING[cat] ? [...CATEGORIES_MAPPING[cat]] : []);
  };

  const addCriterePerso = () => setCriteresPerso(prev => [...prev, { critere: "", obligatoire: "obligatoire" }]);
  const updatePerso = (i, k, v) => setCriteresPerso(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removePerso = i => setCriteresPerso(prev => prev.filter((_, idx) => idx !== i));

  const mutation = useMutation({
    mutationFn: (payload) => apiFetch("/api/lots", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['lots']);
      alert("✅ Lot enregistré !");
      onSuccess();
    },
    onError: (err) => alert("❌ " + err.message),
  });

  const handleSubmit = e => {
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
    mutation.mutate(payload);
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
        <label className="form-label" style={{ marginBottom: 10, display: "block", color: "var(--color-text)", fontWeight: 600 }}>
          Unités de mesure admises *
        </label>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", 
          gap: 8, 
          background: "var(--color-surface-alt)", 
          padding: 14, 
          borderRadius: "var(--radius-md)", 
          border: "1px solid var(--color-border)" 
        }}>
          {unitesDisponibles.map(u => (
            <label key={u} style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              cursor: "pointer", 
              fontSize: 13,
              color: "var(--color-text)"
            }}>
              <input 
                type="checkbox" 
                checked={unites.includes(u)} 
                onChange={() => toggleUnite(u)} 
                style={{ cursor: "pointer" }}
              />
              <span style={{ color: "var(--color-text)" }}>
                {u === "unites" ? "Unités (pièces)" : u.charAt(0).toUpperCase() + u.slice(1)}
              </span>
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
  const queryClient = useQueryClient();

  const [selectedProd, setSelectedProd] = useState("");
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");

  const { data: producteurs = [], isLoading: prodLoading } = useQuery({
    queryKey: ['producteurs'],
    queryFn: () => apiFetch("/api/producteurs"),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['operations_caisse'],
    queryFn: () => apiFetch("/api/operations_caisse?type=debit&limit=10"),
  });

  const selectedProducteur = producteurs.find(p => String(p.id) === selectedProd);
  const solde = selectedProducteur ? parseFloat(selectedProducteur.solde || 0) : 0;

  const mutation = useMutation({
    mutationFn: (payload) => apiFetch("/api/operations_caisse", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['producteurs']);
      queryClient.invalidateQueries(['operations_caisse']);
      alert("✅ Paiement effectué avec succès !");
      setSelectedProd("");
      setMontant("");
    },
    onError: (err) => alert("❌ " + err.message),
  });

  const handleSubmit = e => {
    e.preventDefault();
    const m = parseFloat(montant);
    if (m > solde) return alert(`❌ Montant (${m.toLocaleString()}) dépasse le solde disponible (${solde.toLocaleString()}).`);
    if (!confirm(`Confirmer le paiement de ${m.toLocaleString("fr-FR")} FCFA ?`)) return;
    mutation.mutate({
      producteur_id: parseInt(selectedProd),
      montant: m,
      type_operation: "debit",
      description: `Paiement Admin via ${mode}`,
      utilisateur: user.username || "admin",
      caisse_id: 1,
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
      {/* Panneau paiement */}
      <div className="card">
        <h4 style={{ marginTop: 0, marginBottom: 16, color: "var(--color-text)" }}>Nouveau Paiement</h4>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Bénéficiaire (Producteur)</label>
            <select className="form-control" required value={selectedProd} onChange={e => setSelectedProd(e.target.value)}>
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
            <input className="form-control" required type="number" min="1" step="1" value={montant} onChange={e => setMontant(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Mode de paiement</label>
            <select className="form-control" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="especes">Espèces (Cash)</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement Bancaire</option>
            </select>
          </div>

          <button type="submit" disabled={mutation.isLoading} className="btn btn-primary btn-full">
            {mutation.isLoading ? "⏳ En cours..." : "✔ VALIDER LE PAIEMENT"}
          </button>
        </form>
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-header">
          <h4 style={{ margin: 0 }}>Historique des Sorties de Caisse</h4>
          <button onClick={() => queryClient.invalidateQueries(['operations_caisse'])} className="btn btn-ghost btn-sm">🔄 Actualiser</button>
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

function PanneauDemandes({ onSuccess }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [formApprob, setFormApprob] = useState({ role: 'stock', magasin_id: '' });
  const [erreur, setErreur] = useState('');

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['demandes'],
    queryFn: () => apiFetch('/auth/demandes'),
  });

  const { data: magasins = [] } = useQuery({
    queryKey: ['magasins'],
    queryFn: () => apiFetch('/api/magasins'),
  });

  const approuverMutation = useMutation({
    mutationFn: (payload) => apiFetch('/auth/approuver', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['demandes']);
      setSelected(null);
      onSuccess?.('✅ Compte créé avec succès');
    },
    onError: (err) => setErreur(err.message),
  });

  const rejeterMutation = useMutation({
    mutationFn: (demande_id) => apiFetch('/auth/rejeter', { method: 'POST', body: JSON.stringify({ demande_id }) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['demandes']);
    },
    onError: (err) => alert('❌ ' + err.message),
  });

  const handleApprouver = () => {
    setErreur('');
    if (!formApprob.role) { setErreur('Rôle requis'); return; }
    approuverMutation.mutate({
      demande_id: selected.id,
      role: formApprob.role,
      magasin_id: formApprob.magasin_id || null,
    });
  };

  const handleRejeter = (id) => {
    if (!confirm('Rejeter cette demande ?')) return;
    rejeterMutation.mutate(id);
  };

  const BADGE_STATUT = {
    en_attente: { bg: '#fffbeb', color: '#d97706', label: '⏳ En attente' },
    approuvée:  { bg: '#f0fdf4', color: '#16a34a', label: '✅ Approuvée' },
    rejetée:    { bg: '#fef2f2', color: '#dc2626', label: '❌ Rejetée' },
  };

  if (isLoading) return <StateLoading />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {demandes.length === 0 && (
        <StateEmpty icon="📝" message="Aucune demande d'inscription." />
      )}

      {demandes.map(d => {
        const bs = BADGE_STATUT[d.statut] || BADGE_STATUT.en_attente;
        const isOpen = selected?.id === d.id;
        return (
          <div key={d.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {/* ── En-tête ── */}
            <div
              onClick={() => setSelected(isOpen ? null : d)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', cursor: 'pointer', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block', transition: 'transform .2s' }}>▶</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px', color: 'var(--color-text)' }}>
                    {d.prenom} {d.nom}
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}> — @{d.username}</span>
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                    {d.telephone}{d.email ? ` · ${d.email}` : ''} · {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: bs.bg, color: bs.color, borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
                {bs.label}
              </span>
            </div>

            {/* ── Détails + formulaire approbation ── */}
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px' }}>
                {/* Infos demandeur */}
                <div className="grid-2" style={{ gap: 8, marginBottom: 16 }}>
                  {[
                    ['Prénom',    d.prenom],
                    ['Nom',       d.nom],
                    ['Téléphone', d.telephone],
                    ['Email',     d.email || '—'],
                    ['Username',  d.username],
                    ['Demande',   new Date(d.created_at).toLocaleString('fr-FR')],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--color-surface-alt)', borderRadius: 6, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Message du candidat */}
                {d.message && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                    💬 <em>{d.message}</em>
                  </div>
                )}

                {/* Formulaire approbation — seulement si en_attente */}
                {d.statut === 'en_attente' && (
                  <>
                    {erreur && <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>❌ {erreur}</div>}

                    <div className="form-grid" style={{ marginBottom: 14 }}>
                      <div className="form-group">
                        <label className="form-label">Rôle *</label>
                        <select
                          className="form-control"
                          value={formApprob.role}
                          onChange={e => setFormApprob(f => ({ ...f, role: e.target.value }))}
                        >
                          <option value="stock">Agent de Stock</option>
                          <option value="caisse">Agent de Caisse</option>
                          <option value="admin">Gestionnaire de Magasin</option>
                          <option value="auditeur">Auditeur</option>
                          <option value="superadmin">Super-Administrateur</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Magasin d'affectation</label>
                        <select
                          className="form-control"
                          value={formApprob.magasin_id}
                          onChange={e => setFormApprob(f => ({ ...f, magasin_id: e.target.value }))}
                        >
                          <option value="">— Aucun (Accès central) —</option>
                          {magasins.map(m => (
                            <option key={m.id} value={m.id}>{m.nom}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={handleApprouver}
                        disabled={approuverMutation.isLoading}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        {approuverMutation.isLoading ? '⏳...' : '✅ Approuver et créer le compte'}
                      </button>
                      <button
                        onClick={() => handleRejeter(d.id)}
                        disabled={rejeterMutation.isLoading}
                        className="btn btn-danger"
                      >
                        {rejeterMutation.isLoading ? '⏳' : '❌ Rejeter'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatsRow({ section, data, demandesCount }) {
  const safeData = Array.isArray(data) ? data : [];

  const stats = {
    magasins: [
      { label: "Total Magasins", value: safeData.length, icon: "🏪", color: "var(--color-primary)" },
      { label: "Régions couvertes", value: [...new Set(safeData.map(m => m.region_id))].length, icon: "🌍", color: "#6366f1" }
    ],
    users: [
      { label: "Utilisateurs", value: safeData.length, icon: "👥", color: "#f59e0b" },
      { label: "Actifs", value: safeData.filter(u => u.statut === 'actif').length, icon: "✅", color: "var(--color-success)" }
    ],
    producteurs: [
      { label: "Total Producteurs", value: safeData.length, icon: "🌾", color: "#10b981" },
      { label: "Solde Global", value: safeData.reduce((acc, p) => acc + parseFloat(p.solde || 0), 0).toLocaleString() + " F", icon: "💰", color: "#059669" }
    ],
    lots: [
      { label: "Articles Référencés", value: safeData.length, icon: "📦", color: "#8b5cf6" },
      { label: "Catégories", value: [...new Set(safeData.map(l => l.categorie))].length, icon: "🏷️", color: "#ec4899" }
    ],
    demandes: [
      { label: "En attente", value: demandesCount, icon: "⏳", color: "#f59e0b" }
    ]
  };

  const currentStats = stats[section] || [];
  if (currentStats.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
      {currentStats.map((s, i) => (
        <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", border: "none", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "2rem", background: `${s.color}15`, color: s.color, width: 50, height: 50, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {s.icon}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
// --- COMPOSANT PRINCIPAL ---

export default function Administration() {
  const [section, setSection] = useState("magasins");
  const [filteredData, setFilteredData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const sections = [
    { id: 'magasins',    label: 'Magasins',    icon: '🏪' },
    { id: 'users',       label: 'Utilisateurs', icon: '👥' },
    { id: 'producteurs', label: 'Producteurs',  icon: '🌾' },
    { id: 'lots',        label: 'Produits/Lots', icon: '📦' },
    { id: 'caisse',      label: 'Caisse',       icon: '💰' },
    { id: 'demandes',    label: 'Demandes',     icon: '📝' },
  ];

  const cfg = SECTIONS_CONFIG[section];

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: [section],
    queryFn: () => {
      if (!cfg?.endpoint) return Promise.resolve([]);
      return apiFetch(cfg.endpoint);
    },
    enabled: !!cfg?.endpoint || section === 'demandes' || section === 'caisse', // demandes a son propre endpoint, caisse géré dans ModuleCaisse
  });

  // Pour la section 'demandes', on a besoin des données pour les stats
  const { data: demandes = [] } = useQuery({
    queryKey: ['demandes'],
    queryFn: () => apiFetch('/auth/demandes'),
    enabled: section === 'demandes', // on ne charge que si nécessaire
  });

  // Appliquer le filtre producteurs
  const displayData = section === 'producteurs' ? filteredData : data;

  const handleDelete = useCallback(async (sec, id) => {
    if (!confirm("⚠️ Confirmer la suppression ?")) return;
    try {
      await apiFetch(`/api/${sec}?id=${id}`, { method: "DELETE" });
      queryClient.invalidateQueries([sec]);
    } catch (err) {
      alert("Erreur: " + err.message);
    }
  }, [queryClient]);

  const FORMS = { magasins: FormMagasin, users: FormUser, producteurs: FormProducteur, lots: FormLot };
  const FormComponent = FORMS[section];

  return (
    <PageLayout title="Administration" icon="⚙️" subtitle="Gestion globale du système NFBO">
      <div className="tabs-container" style={{ marginBottom: 24, overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 8 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => {
              setSection(s.id);
              setShowForm(false);
              setFilteredData([]);
            }}
            className={`tab-btn ${section === s.id ? 'active' : ''}`}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: section === s.id ? 'var(--color-primary)' : 'var(--color-surface)',
              color: section === s.id ? 'white' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <div style={{ width: "100%", minWidth: 0 }}>
        {!showForm && !isLoading && !error && (
          <StatsRow 
            section={section} 
            data={section === 'demandes' ? demandes : data} 
            demandesCount={demandes.filter(d => d.statut === 'en_attente').length} 
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
            {cfg?.label}
          </h2>
          {!["caisse", "demandes", "validations"].includes(section) && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              + Ajouter {section.slice(0, -1)}
            </button>
          )}
        </div>

        {showForm && FormComponent ? (
          <div className="animate-fade-in">
            <FormComponent
              onCancel={() => setShowForm(false)}
              onSuccess={() => { setShowForm(false); queryClient.invalidateQueries([section]); }}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            {section === "caisse" ? (
              <ModuleCaisse />
            ) : section === "demandes" ? (
              <PanneauDemandes onSuccess={msg => alert(msg)} />
            ) : isLoading ? (
              <StateLoading />
            ) : error ? (
              <StateError message={error.message} onRetry={() => refetch()} />
            ) : (
              <>
                {section === "producteurs" && <ProducteursFilter data={data} onFilter={setFilteredData} />}
                <div className="card" style={{ padding: 0, overflow: "hidden", border: '1px solid var(--color-border)' }}>
                  <AdminTable data={displayData} section={section} onDelete={handleDelete} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}