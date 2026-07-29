(function () {
  'use strict';

  const WORKER_URL = "https://plaintes.mijocomplexe.workers.dev";
  const FETCH_TIMEOUT_MS = 8000;
  // Session stockée en sessionStorage (effacée à la fermeture de l'onglet),
  // jamais en localStorage, pour limiter la durée de vie d'un token volé.
  const SESSION_KEY = "mijo_admin_session";

  const STATUT_LABELS = { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", rejete: "Rejeté" };
  const MOTIF_LABELS = {
    transaction_non_recue: "Transaction non reçue",
    montant_incorrect: "Montant incorrect",
    double_debit: "Double débit",
    erreur_marchand: "Erreur du marchand",
    fraude_suspectee: "Fraude suspectée",
    autre: "Autre"
  };

  let plaintesActuelles = [];

  async function fetchAvecTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, credentials: "omit", cache: "no-store", signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  function getSession() { return sessionStorage.getItem(SESSION_KEY); }
  function setSession(token) { sessionStorage.setItem(SESSION_KEY, token); }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  function afficherGate() {
    document.getElementById("gate").style.display = "flex";
    document.getElementById("panel").style.display = "none";
  }
  function afficherPanel() {
    document.getElementById("gate").style.display = "none";
    document.getElementById("panel").style.display = "block";
  }

  // ── Connexion ──
  document.getElementById("gate-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("gate-submit");
    const msgEl = document.getElementById("gate-msg");
    const password = document.getElementById("gate-password").value;

    msgEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Vérification...";

    try {
      const res = await fetchAvecTimeout(`${WORKER_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        msgEl.textContent = data.error || "Mot de passe incorrect.";
        msgEl.style.display = "block";
        return;
      }

      setSession(data.sessionToken);
      document.getElementById("gate-password").value = "";
      afficherPanel();
      chargerPlaintes();
    } catch (err) {
      msgEl.textContent = "Erreur réseau. Réessayez.";
      msgEl.style.display = "block";
      console.error("Erreur login admin:", err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Se connecter";
    }
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    clearSession();
    afficherGate();
  });

  document.getElementById("refresh-btn").addEventListener("click", chargerPlaintes);
  document.getElementById("statut-filter").addEventListener("change", chargerPlaintes);

  // ── Chargement des plaintes ──
  async function chargerPlaintes() {
    const session = getSession();
    if (!session) { afficherGate(); return; }

    const wrap = document.getElementById("table-wrap");
    wrap.textContent = "";
    const loading = document.createElement("div");
    loading.className = "state";
    loading.textContent = "Chargement...";
    wrap.appendChild(loading);

    const statut = document.getElementById("statut-filter").value;
    const qs = statut ? `?statut=${encodeURIComponent(statut)}` : "";

    try {
      const res = await fetchAvecTimeout(`${WORKER_URL}/admin/plaintes${qs}`, {
        headers: { "X-MIJO-Admin-Session": session }
      });

      if (res.status === 401) {
        clearSession();
        afficherGate();
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Réponse invalide");

      plaintesActuelles = data.plaintes;
      renderTable(data.plaintes);
    } catch (err) {
      wrap.textContent = "";
      const errDiv = document.createElement("div");
      errDiv.className = "state error";
      errDiv.textContent = "Impossible de charger les plaintes.";
      wrap.appendChild(errDiv);
      console.error("Erreur chargement plaintes:", err);
    }
  }

  function renderTable(plaintes) {
    const wrap = document.getElementById("table-wrap");
    wrap.textContent = "";

    if (!plaintes.length) {
      const state = document.createElement("div");
      state.className = "state";
      state.textContent = "Aucune plainte pour ce filtre.";
      wrap.appendChild(state);
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = ""; // pas de contenu utilisateur ici, structure fixe
    const headRow = document.createElement("tr");
    ["Date", "Utilisateur", "Motif", "Statut", ""].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    plaintes.forEach(p => {
      const row = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.innerHTML = "";
      const dateSpan = document.createElement("span");
      dateSpan.className = "mono";
      dateSpan.textContent = formatDate(p.created_at);
      tdDate.appendChild(dateSpan);
      row.appendChild(tdDate);

      const tdUser = document.createElement("td");
      const userSpan = document.createElement("span");
      userSpan.className = "mono";
      userSpan.textContent = p.user_id || "";
      tdUser.appendChild(userSpan);
      row.appendChild(tdUser);

      const tdMotif = document.createElement("td");
      tdMotif.textContent = MOTIF_LABELS[p.motif] || p.motif || "";
      row.appendChild(tdMotif);

      const tdStatut = document.createElement("td");
      const badge = document.createElement("span");
      const statutKey = ["ouvert", "en_cours", "resolu", "rejete"].includes(p.statut) ? p.statut : "ouvert";
      badge.className = `badge ${statutKey}`;
      badge.textContent = STATUT_LABELS[statutKey];
      tdStatut.appendChild(badge);
      row.appendChild(tdStatut);

      const tdAction = document.createElement("td");
      const expandBtn = document.createElement("button");
      expandBtn.className = "expand-btn";
      expandBtn.textContent = "Détails";
      expandBtn.addEventListener("click", () => toggleEditRow(p.id, row));
      tdAction.appendChild(expandBtn);
      row.appendChild(tdAction);

      row.dataset.plainteId = p.id;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function toggleEditRow(id, afterRow) {
    const existing = afterRow.nextElementSibling;
    if (existing && existing.classList.contains("edit-row")) {
      existing.remove();
      return;
    }
    // Ferme les autres lignes d'édition ouvertes
    document.querySelectorAll(".edit-row").forEach(el => el.remove());

    const p = plaintesActuelles.find(x => x.id === id);
    if (!p) return;

    const editRow = document.createElement("tr");
    editRow.className = "edit-row";
    const td = document.createElement("td");
    td.colSpan = 5;

    const descLabel = document.createElement("div");
    descLabel.className = "mono";
    descLabel.style.marginBottom = "8px";
    descLabel.textContent = "Description :";
    td.appendChild(descLabel);

    const descText = document.createElement("div");
    descText.style.fontSize = "13px";
    descText.style.marginBottom = "12px";
    descText.textContent = p.description || "";
    td.appendChild(descText);

    const statutSelect = document.createElement("select");
    ["ouvert", "en_cours", "resolu", "rejete"].forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUT_LABELS[s];
      if (s === p.statut) opt.selected = true;
      statutSelect.appendChild(opt);
    });
    td.appendChild(statutSelect);

    const noteTextarea = document.createElement("textarea");
    noteTextarea.maxLength = 2000;
    noteTextarea.placeholder = "Note de résolution (visible par l'utilisateur)";
    noteTextarea.value = p.resolution_note || "";
    td.appendChild(noteTextarea);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Enregistrer";
    td.appendChild(saveBtn);

    const saveMsg = document.createElement("div");
    saveMsg.className = "save-msg";
    td.appendChild(saveMsg);

    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement...";
      saveMsg.className = "save-msg";
      saveMsg.textContent = "";

      const session = getSession();
      try {
        const res = await fetchAvecTimeout(`${WORKER_URL}/admin/plaintes/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-MIJO-Admin-Session": session },
          body: JSON.stringify({ statut: statutSelect.value, resolutionNote: noteTextarea.value.trim() })
        });

        if (res.status === 401) {
          clearSession();
          afficherGate();
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Échec");

        saveMsg.className = "save-msg success";
        saveMsg.textContent = "Enregistré.";
        await chargerPlaintes();
      } catch (err) {
        saveMsg.className = "save-msg error";
        saveMsg.textContent = "Échec de l'enregistrement.";
        console.error("Erreur sauvegarde:", err);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Enregistrer";
      }
    });

    editRow.appendChild(td);
    afterRow.after(editRow);
  }

  // ── Initialisation ──
  if (getSession()) {
    afficherPanel();
    chargerPlaintes();
  } else {
    afficherGate();
  }

})();
