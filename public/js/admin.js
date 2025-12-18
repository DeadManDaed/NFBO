//public/js/admin.js
const API_BASE = "https://nbfo-coop.onrender.com/api";

async function loadGeo() {
  try {
    const regionsResp = await fetch(`${API_BASE}/regions`);
    const regions = await regionsResp.json();
    document.getElementById('region').innerHTML =
      regions.map(r => `<option value="${r.id}">${r.nom}</option>`).join('');

    document.getElementById('region').addEventListener('change', async (e) => {
      const depResp = await fetch(`${API_BASE}/departements?region_id=${e.target.value}`);
      const deps = await depResp.json();
      document.getElementById('departement').innerHTML =
        deps.map(d => `<option value="${d.id}">${d.nom}</option>`).join('');
    });

    document.getElementById('departement').addEventListener('change', async (e) => {
      const arrResp = await fetch(`${API_BASE}/arrondissements?departement_id=${e.target.value}`);
      const arrs = await arrResp.json();
      document.getElementById('arrondissement').innerHTML =
        arrs.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');
    });
  } catch (err) {
    console.error("Erreur chargement géo", err);
  }
}

loadGeo();
