import { useState, useEffect, useCallback } from "react";
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

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
  users:       { label: "Utilisateurs Système",        icon: "👥", endpoint: "/api/personnel/index" },
  employers:   { label: "Employés & Staff",            icon: "🪪", endpoint: "/api/personnel/index" },
  producteurs: { label: "Gestion des Producteurs",     icon: "🌾", endpoint: "/api/producteurs" },
  lots:        { label: "Référentiel des Lots",        icon: "🏷️", endpoint: "/api/lots/index" },
  validations: { label: "Validations & Transferts",    icon: "✅", endpoint: "/api/validations" },
  caisse:      { label: "Caisse Centrale & Paiements", icon: "💰", endpoint: null },
};

const COLUMNS_CONFIG = {
  users: [
    { key: "id", label: "ID" }, { key: "username", label: "Login" },
    { key: "role", label: "Rôle", type: "badge" }, { key: "prenom", label: "Prénom" },
    { key: "statut", label: "Statut", type: "badge" },
  ],
  lots: [
    { key: "categorie", label: "Catégorie", type: "badge" },
    { key: "description", label: "Désignation" },
    { key: "prix_ref", label: "Prix Réf.", type: "money" },
    { key: "unites_admises", label: "Unités", type: "json_list" },
    { key: "stock_disponible", label: "Stock" },
  ],
  producteurs: [
    { key: "matricule", label: "Matricule" },
    { key: "nom_producteur", label: "Nom / Organisation" },
    { key: "type_producteur", label: "Type", type: "badge" },
    { key: "telephone", label: "Contact" },
    { key: "localite", label: "Localité" },
    { key: "solde", label: "Solde (FCFA)", type: "money" },
    { key: "statut", label: "Statut", type: "badge" },
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

// ─── SOUS-COMPOSANTS ───────────────────────────────────────────────────────────

function NavButton({ section, currentSection, onClick }) {
  const cfg = SECTIONS_CONFIG[section];
  return (
    <button
      onClick={() => onClick(section)}
      style={{
        padding: "10px 14px", border: "none", borderRadius: 6,
        background: currentSection === section ? "#1565c0" : "white",
        color: currentSection === section ? "white" : "#555",
        textAlign: "left", cursor: "pointer", transition: "0.2s",
        fontWeight: 500, width: "100%", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <span>{cfg.icon}</span> {cfg.label}
    </button>
  );
}

function StatusMessage({ type, message, onRetry }) {
  const colors = { loading: "#1565c0", error: "#c62828", empty: "#888" };
  return (
    <div style={{ padding: 40, textAlign: "center", color: colors[type] || "#888" }}>
      {type === "loading" && <><span>⏳</span> {message || "Chargement..."}</>}
      {type === "error" && (
        <div style={{ background: "#ffebee", padding: 20, borderRadius: 8, borderLeft: "4px solid #d32f2f" }}>
          <strong>⚠️ {message}</strong>
          {onRetry && <><br/><button onClick={onRetry} style={{ marginTop: 10, background: "#d32f2f", color: "white", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Réessayer</button></>}
        </div>
      )}
      {type === "empty" && <><span>📭</span> Aucune donnée disponible.</>}
    </div>
  );
}

// ─── TABLEAU GÉNÉRIQUE ─────────────────────────────────────────────────────────

function AdminTable({ data, section, onDelete }) {
  const columns = COLUMNS_CONFIG[section] || Object.keys(data[0] || {}).map(k => ({ key: k, label: k.replace(/_/g, " ").toUpperCase() }));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "white", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee", background: "#f9f9f9" }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>
                {col.label}
              </th>
            ))}
            <th style={{ padding: "10px 12px", textAlign: "center", width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} style={{ borderBottom: "1px solid #eee" }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: "10px 12px" }}>
                  {col.type === "money"
                    ? <span style={{ fontWeight: "bold", color: parseFloat(row[col.key]) > 0 ? "#2e7d32" : "#d32f2f" }}>
                        {formatCellValue(row[col.key], col.type)}
                      </span>
                    : col.type === "badge"
                    ? <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: "bold" }}>
                        {row[col.key] || "-"}
                      </span>
                    : formatCellValue(row[col.key], col.type)
                  }
                </td>
              ))}
              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                <button
                  onClick={() => onDelete(section, row.id)}
                  style={{ background: "none", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: 15 }}
                  title="Supprimer"
                >🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 12, color: "#999", textAlign: "right" }}>
        {data.length} enregistrement{data.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── FILTRE PRODUCTEURS ────────────────────────────────────────────────────────

function ProducteursFilter({ data, onFilter }) {
  const [search, setSearch] = useState("");
  const [solde, setSolde] = useState("all");
  const [sort, setSort] = useState("nom");

  useEffect(() => {
    let filtered = data.filter(p => {
      const matchSearch =
        (p.nom_producteur || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.matricule || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.telephone || "").includes(search);
      const s = parseFloat(p.solde || 0);
      const matchSolde =
        solde === "all" ? true :
        solde === "positif" ? s > 0 :
        solde === "important" ? s >= 100000 :
        solde === "zero" ? s === 0 : true;
      return matchSearch && matchSolde;
    });
    filtered.sort((a, b) => {
      if (sort === "solde_desc") return parseFloat(b.solde || 0) - parseFloat(a.solde || 0);
      if (sort === "recent") return b.id - a.id;
      return (a.nom_producteur || "").localeCompare(b.nom_producteur || "");
    });
    onFilter(filtered);
  }, [search, solde, sort, data]);

  const inputStyle = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13 };

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#f4f7f6", padding: 10, borderRadius: 8, flexWrap: "wrap" }}>
      <input placeholder="Rechercher nom, matricule..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...inputStyle, flex: "2 1 200px" }} />
      <select value={solde} onChange={e => setSolde(e.target.value)} style={{ ...inputStyle, flex: "1 1 150px" }}>
        <option value="all">Tous les soldes</option>
        <option value="positif">Soldes &gt; 0 FCFA</option>
        <option value="important">Gros soldes (&gt; 100k)</option>
        <option value="zero">Soldes nuls</option>
      </select>
      <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputStyle, flex: "1 1 150px" }}>
        <option value="nom">Trier par Nom</option>
        <option value="solde_desc">Plus gros soldes</option>
        <option value="recent">Plus récents</option>
      </select>
    </div>
  );
}

// ─── FORMULAIRES ───────────────────────────────────────────────────────────────

function FormMagasin({ onCancel, onSuccess }) {
  const [form, setForm] = useState({ nom: "", code: "", region_id: "" });
  const [regions, setRegions] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetch("/api/geo/api/regions").then(r => r.json()).then(setRegions).catch(() => {});
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
        <FormField label="Nom du magasin *"><input required value={form.nom} onChange={set("nom")} /></FormField>
        <FormField label="Code *"><input required value={form.code} onChange={set("code")} placeholder="Ex: YDE001" maxLength={10} /></FormField>
        <FormField label="Région">
          <select value={form.region_id} onChange={set("region_id")}>
            <option value="">-- Sélectionner --</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        </FormField>
      </FormGrid>
    </FormWrapper>
  );
}

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
        <FormField label="Nom d'utilisateur *"><input required value={form.username} onChange={set("username")} placeholder="ex: jdoe" /></FormField>
        <FormField label="Mot de passe *"><input required type="password" value={form.password} onChange={set("password")} /></FormField>
        <FormField label="Rôle Système *">
          <select required value={form.role} onChange={set("role")}>
            <option value="stock">Agent de Stock (Admission)</option>
            <option value="caisse">Agent de Caisse</option>
            <option value="admin">Gestionnaire de Magasin</option>
            <option value="auditeur">Auditeur (Lecture seule)</option>
            <option value="superadmin">Super-Administrateur</option>
          </select>
        </FormField>
        <FormField label="Magasin d'affectation">
          <select value={form.magasin_id} onChange={set("magasin_id")}>
            <option value="">-- Aucun (Utilisateur Central) --</option>
            {magasins.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
          </select>
        </FormField>
        <FormField label="Prénom"><input value={form.prenom} onChange={set("prenom")} /></FormField>
        <FormField label="Nom"><input value={form.nom} onChange={set("nom")} /></FormField>
        <FormField label="Email"><input type="email" value={form.email} onChange={set("email")} /></FormField>
        <FormField label="Téléphone"><input type="tel" value={form.telephone} onChange={set("telephone")} /></FormField>
      </FormGrid>
    </FormWrapper>
  );
}

function FormProducteur({ onCancel, onSuccess }) {
  const [form, setForm] = useState({ nom_producteur: "", tel_producteur: "", type_producteur: "individuel", carte_membre: false, region_id: "", departement_id: "", arrondissement_id: "", localite: "", statut: "actif" });
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [arrondissements, setArrondissements] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => { fetch("/api/geo/api/regions").then(r => r.json()).then(setRegions).catch(() => {}); }, []);

  const onRegionChange = async e => {
    const id = e.target.value;
    setForm(f => ({ ...f, region_id: id, departement_id: "", arrondissement_id: "" }));
    setDepartements([]); setArrondissements([]);
    if (id) {
      const data = await fetch(`/api/geo/api/departements?region_id=${id}`).then(r => r.json()).catch(() => []);
      setDepartements(data);
    }
  };

  const onDeptChange = async e => {
    const id = e.target.value;
    setForm(f => ({ ...f, departement_id: id, arrondissement_id: "" }));
    setArrondissements([]);
    if (id) {
      const data = await fetch(`/api/geo/api/arrondissements?departement_id=${id}`).then(r => r.json()).catch(() => []);
      setArrondissements(data);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch("/api/producteurs", { method: "POST", body: JSON.stringify({ ...form, carte_membre: form.carte_membre === "true" || form.carte_membre === true, region_id: parseInt(form.region_id) || null, departement_id: parseInt(form.departement_id) || null, arrondissement_id: parseInt(form.arrondissement_id) || null }) });
      alert("✅ Producteur enregistré !");
      onSuccess();
    } catch (err) { alert("❌ " + err.message); }
  };

  return (
    <FormWrapper title="Fiche Nouveau Producteur" icon="🌾" onCancel={onCancel} onSubmit={handleSubmit}>
      <FormGrid>
        <FormField label="Nom / Raison Sociale *"><input required value={form.nom_producteur} onChange={set("nom_producteur")} placeholder="Ex: Jean Planteur" /></FormField>
        <FormField label="Téléphone *"><input required type="tel" value={form.tel_producteur} onChange={set("tel_producteur")} placeholder="6XXXXXXXX" /></FormField>
        <FormField label="Type *">
          <select required value={form.type_producteur} onChange={set("type_producteur")}>
            {["individuel","agriculteur","éleveur","pêcheur","artisan","coopérative"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </FormField>
        <FormField label="Carte Membre">
          <select value={form.carte_membre} onChange={set("carte_membre")}>
            <option value="false">Non Membre</option>
            <option value="true">Membre Actif</option>
          </select>
        </FormField>
      </FormGrid>
      <fieldset style={{ marginTop: 20, border: "1px solid #ddd", padding: 15, borderRadius: 8 }}>
        <legend style={{ padding: "0 10px", fontWeight: "bold" }}>Localisation Géographique</legend>
        <FormGrid>
          <FormField label="Région *">
            <select required value={form.region_id} onChange={onRegionChange}>
              <option value="">-- Sélectionner --</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </FormField>
          <FormField label="Département *">
            <select required value={form.departement_id} onChange={onDeptChange} disabled={!form.region_id}>
              <option value="">-- Choisir Région d'abord --</option>
              {departements.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </FormField>
          <FormField label="Arrondissement *">
            <select required value={form.arrondissement_id} onChange={set("arrondissement_id")} disabled={!form.departement_id}>
              <option value="">-- Choisir Dept d'abord --</option>
              {arrondissements.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </FormField>
          <FormField label="Localité spécifique">
            <input value={form.localite} onChange={set("localite")} placeholder="Village, Quartier..." />
          </FormField>
        </FormGrid>
      </fieldset>
    </FormWrapper>
  );
}

function FormLot({ onCancel, onSuccess }) {
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
    if (CATEGORIES_MAPPING[cat]) setCriteresAuto([...CATEGORIES_MAPPING[cat]]);
    else setCriteresAuto([]);
  };

  const addCriterePerso = () => setCriteresPerso(prev => [...prev, { critere: "", obligatoire: "obligatoire" }]);
  const updatePerso = (i, k, v) => setCriteresPerso(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removePerso = i => setCriteresPerso(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    if (unites.length === 0) return alert("❌ Sélectionnez au moins une unité.");
    const payload = {
      ...form, prix_ref: parseFloat(form.prix_ref), unites_admises: unites,
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
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };

  return (
    <FormWrapper title="Référentiel Produit : Création d'un Lot" icon="📦" onCancel={onCancel} onSubmit={handleSubmit} maxWidth={900}>
      <FormGrid>
        <FormField label="Catégorie *">
          <select required value={form.categorie} onChange={onCatChange} style={inputStyle}>
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
        </FormField>
        <FormField label="Description du produit *"><input required value={form.description} onChange={set("description")} placeholder="Ex: Huile de palme raffinée" /></FormField>
        <FormField label="Prix de Référence (FCFA/Unité) *"><input required type="number" step="0.01" min="0" value={form.prix_ref} onChange={set("prix_ref")} /></FormField>
      </FormGrid>

      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: 10 }}>Unités de mesure admises *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 8, background: "#f8f9fa", padding: 14, borderRadius: 6, border: "1px solid #eee" }}>
          {unitesDisponibles.map(u => (
            <label key={u} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={unites.includes(u)} onChange={() => toggleUnite(u)} />
              {u === "unites" ? "Unités (pièces)" : u.charAt(0).toUpperCase()+u.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {criteresAuto.length > 0 && (
        <div style={{ marginTop: 20, background: "#f1f8e9", padding: 14, borderRadius: 6, borderLeft: "4px solid #4caf50" }}>
          <div style={{ fontSize: 11, fontWeight: "bold", color: "#2e7d32", marginBottom: 10, textTransform: "uppercase" }}>📋 Critères standards recommandés</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(CATEGORIES_MAPPING[form.categorie] || []).map(c => (
              <label key={c} style={{ display: "flex", alignItems: "center", gap: 8, background: "white", padding: "8px 10px", borderRadius: 4, border: "1px solid #e0e0e0", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={criteresAuto.includes(c)} onChange={() => toggleCritere(c)} /> {c}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ color: "#555" }}>🔍 Critères personnalisés</strong>
          <button type="button" onClick={addCriterePerso} style={{ background: "#f0f0f0", padding: "6px 12px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>+ Ajouter</button>
        </div>
        {criteresPerso.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={c.critere} onChange={e => updatePerso(i, "critere", e.target.value)} placeholder="Nouveau critère..." style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} />
            <select value={c.obligatoire} onChange={e => updatePerso(i, "obligatoire", e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, width: 110, fontSize: 12 }}>
              <option value="obligatoire">Obligatoire</option>
              <option value="optionnel">Optionnel</option>
            </select>
            <button type="button" onClick={() => removePerso(i)} style={{ background: "none", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        ))}
        <textarea value={form.notes} onChange={set("notes")} placeholder="Instructions spéciales pour les agents de réception..." style={{ width: "100%", height: 60, padding: 10, border: "1px solid #ddd", borderRadius: 4, marginTop: 10, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", fontSize: 13 }} />
      </div>
    </FormWrapper>
  );
}

// ─── MODULE CAISSE ─────────────────────────────────────────────────────────────

function ModuleCaisse() {
  const [producteurs, setProducteurs] = useState([]);
  const [selectedProd, setSelectedProd] = useState("");
  const [solde, setSolde] = useState(0);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

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
      const user = JSON.parse(localStorage.getItem("nbfo_user") || "{}");
      await apiFetch("/api/operations_caisse", {
        method: "POST",
        body: JSON.stringify({ producteur_id: parseInt(selectedProd), montant: m, type_operation: "debit", description: `Paiement Admin via ${mode}`, utilisateur: user.username || "admin", caisse_id: 1 }),
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

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };
  const labelStyle = { fontSize: 13, fontWeight: "bold", color: "#666", display: "block", marginBottom: 6 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 25 }}>
      <div style={{ background: "white", padding: 20, borderRadius: 8, border: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, color: "#555" }}>Nouveau Paiement</h4>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Bénéficiaire (Producteur)</label>
          <select required value={selectedProd} onChange={onProdChange} style={{ ...inputStyle, marginBottom: 14 }}>
            <option value="">-- Choisir un producteur --</option>
            {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur} ({p.matricule})</option>)}
          </select>

          <div style={{ background: "#f1f8e9", border: "1px solid #c5e1a5", padding: 14, borderRadius: 6, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "#558b2f" }}>Solde Disponible</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: solde > 0 ? "#2e7d32" : "#d32f2f" }}>
              {solde.toLocaleString("fr-FR")} FCFA
            </div>
          </div>

          <label style={labelStyle}>Montant à verser</label>
          <input required type="number" min="1" step="50" value={montant} onChange={e => setMontant(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />

          <label style={labelStyle}>Mode de paiement</label>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
            <option value="especes">Espèces (Cash)</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="virement">Virement Bancaire</option>
          </select>

          <button type="submit" disabled={loading} style={{ width: "100%", background: "#2e7d32", color: "white", padding: 12, border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold", opacity: loading ? 0.7 : 1 }}>
            {loading ? "⏳ En cours..." : "✔ VALIDER LE PAIEMENT"}
          </button>
        </form>
      </div>

      <div style={{ background: "white", padding: 20, borderRadius: 8, border: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h4 style={{ margin: 0, color: "#555" }}>Historique des Sorties de Caisse</h4>
          <button onClick={loadData} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565c0", fontSize: 12 }}>🔄 Actualiser</button>
        </div>
        {logsLoading ? <StatusMessage type="loading" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  {["Date", "Producteur", "Montant", "Caissier"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#555" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#999" }}>Aucune transaction récente.</td></tr>
                  : logs.map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px 10px" }}>{new Date(l.date_operation).toLocaleDateString("fr-FR")} {new Date(l.date_operation).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ padding: "8px 10px" }}><strong>{l.producteur_nom || `#${l.producteur_id}`}</strong></td>
                      <td style={{ padding: "8px 10px", color: "#d32f2f", fontWeight: "bold" }}>-{parseFloat(l.montant).toLocaleString("fr-FR")}</td>
                      <td style={{ padding: "8px 10px", color: "#666", fontSize: 11 }}>{l.utilisateur}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HELPERS DE FORMULAIRE ─────────────────────────────────────────────────────

function FormWrapper({ title, icon, onCancel, onSubmit, children, maxWidth = 700 }) {
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };
  return (
    <form onSubmit={onSubmit} style={{ background: "white", padding: 25, borderRadius: 8, maxWidth, boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }}>
      <style>{`form input, form select, form textarea { ${Object.entries(inputStyle).map(([k,v])=>`${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')} }`}</style>
      <h3 style={{ marginTop: 0, color: "#2c3e50", borderBottom: "2px solid #eee", paddingBottom: 10 }}>{icon} {title}</h3>
      {children}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #eee" }}>
        <button type="button" onClick={onCancel} style={{ background: "#eee", padding: "10px 24px", border: "none", borderRadius: 6, cursor: "pointer" }}>Annuler</button>
        <button type="submit" style={{ background: "#27ae60", color: "white", padding: "10px 32px", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>VALIDER L'INSCRIPTION</button>
      </div>
    </form>
  );
}

function FormGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>{children}</div>;
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: 6, fontSize: 13, color: "#555" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────

export default function Administration() {
  const [section, setSection] = useState("magasins");
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

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
    <div style={{ display: "flex", gap: 20 }}>
      {/* Sidebar */}
      <nav style={{ width: 220, display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <h3 style={{ fontSize: 12, color: "#1565c0", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px 4px" }}>Configuration</h3>
        {navSections.map(s => <NavButton key={s} section={s} currentSection={section} onClick={loadSection} />)}
        <hr style={{ width: "100%", border: 0, borderTop: "1px solid #ddd", margin: "6px 0" }} />
      </nav>

      {/* Content */}
      <div style={{ flexGrow: 1, background: "#f9f9f9", padding: 20, borderRadius: 8 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#1a237e" }}>
            {SECTIONS_CONFIG[section]?.icon} {SECTIONS_CONFIG[section]?.label}
          </h2>
          {needsAddBtn && !showForm && (
            <button onClick={() => setShowForm(true)} style={{ background: "#1565c0", color: "white", border: "none", padding: "9px 18px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
              + Ajouter
            </button>
          )}
        </div>

        {/* Formulaire */}
        {showForm && FormComponent && (
          <div style={{ marginBottom: 20 }}>
            <FormComponent onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); loadSection(section); }} />
          </div>
        )}

        {/* Contenu */}
        {section === "caisse" ? (
          <ModuleCaisse />
        ) : section === "validations" ? (
          <div id="section-admin-local">
            <h3 style={{ color: "#37474f" }}>🛡️ Approbations Locales en Attente</h3>
            <div id="local-transfer-list" />
          </div>
        ) : status === "loading" ? (
          <StatusMessage type="loading" />
        ) : status === "error" ? (
          <StatusMessage type="error" message={errorMsg} onRetry={() => loadSection(section)} />
        ) : filteredData.length === 0 ? (
          <>
            {section === "producteurs" && <ProducteursFilter data={data} onFilter={setFilteredData} />}
            <StatusMessage type="empty" />
          </>
        ) : (
          <>
            {section === "producteurs" && <ProducteursFilter data={data} onFilter={setFilteredData} />}
            <AdminTable data={filteredData} section={section} onDelete={handleDelete} />
          </>
        )}
      </div>
    </div>
  );
}
