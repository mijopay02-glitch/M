(function () {
  'use strict';

  // ⚠️ Adapte cette clé si ton système de login stocke l'ID utilisateur
  // sous un autre nom dans localStorage.
  const USER_ID_STORAGE_KEY = "mijo_user_id";
  const WORKER_URL = "https://plaintes-worker.mijocomplexe.workers.dev";
  const FETCH_TIMEOUT_MS = 8000;

  const MOTIF_LABELS = {
    transaction_non_recue: "Transaction non reçue",
    montant_incorrect: "Montant incorrect",
    double_debit: "Double débit",
    erreur_marchand: "Erreur du marchand",
    fraude_suspectee: "Fraude suspectée",
    autre: "Autre"
  };
  const STATUT_LABELS = {
    ouvert: "Ouvert",
    en_cours: "En cours",
    resolu: "Résolu",
    rejete: "Rejeté"
  };

  const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!userId) {
    window.location.href = "login.html"; // adapte si ta page de login a un autre nom
    return;
  }

  async function fetchAvecTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        ...options,
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  // ── Chargement des transactions de l'utilisateur (menu de sélection) ──
  async function chargerTransactions() {
    const select = document.getElementById("transaction-select");
    try {
      const res = await fetchAvecTimeout(`${WORKER_URL}/transactions/mine?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.transactions)) {
        throw new Error("Réponse invalide");
      }

      select.textContent = "";

      if (!data.transactions.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.disabled = true;
        opt.selected = true;
        opt.textContent = "Aucune transaction trouvée";
        select.appendChild(opt);
        return;
      }

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = "Sélectionnez une transaction";
      select.appendChild(placeholder);

      data.transactions.forEach(tx => {
        if (!tx || !tx.id) return;
        const opt = document.createElement("option");
        opt.value = tx.id;
        const montant = tx.Montant !== undefined ? `${tx.Montant} HTG` : "";
        const date = tx.Date ? formatDate(tx.Date) : "";
        opt.textContent = [date, montant].filter(Boolean).join(" — ") || tx.id;
        select.appendChild(opt);
      });
    } catch (err) {
      select.textContent = "";
      const opt = document.createElement("option");
      opt.value = "";
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = "Erreur de chargement des transactions";
      select.appendChild(opt);
      console.error("Erreur transactions:", err);
    }
  }

  // ── Rendu d'une plainte ──
  function creerCartePlainte(p) {
    const div = document.createElement("div");
    div.className = "plainte";

    const top = document.createElement("div");
    top.className = "plainte-top";

    const motif = document.createElement("span");
    motif.className = "plainte-motif";
    motif.textContent = MOTIF_LABELS[p.motif] || "Motif inconnu";
    top.appendChild(motif);

    const badge = document.createElement("span");
    const statutKey = ["ouvert", "en_cours", "resolu", "rejete"].includes(p.statut) ? p.statut : "ouvert";
    badge.className = `badge ${statutKey}`;
    badge.textContent = STATUT_LABELS[statutKey];
    top.appendChild(badge);

    div.appendChild(top);

    const desc = document.createElement("div");
    desc.className = "plainte-desc";
    desc.textContent = p.description || "";
    div.appendChild(desc);

    if (p.resolution_note) {
      const note = document.createElement("div");
      note.className = "plainte-note";
      note.textContent = `Réponse : ${p.resolution_note}`;
      div.appendChild(note);
    }

    const date = document.createElement("div");
    date.className = "plainte-date";
    date.textContent = formatDate(p.created_at);
    div.appendChild(date);

    return div;
  }

  async function chargerMesPlaintes() {
    const container = document.getElementById("plaintes-list");
    try {
      const res = await fetchAvecTimeout(`${WORKER_URL}/plaintes/mine?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.plaintes)) {
        throw new Error("Réponse invalide");
      }

      container.textContent = "";

      if (!data.plaintes.length) {
        const state = document.createElement("div");
        state.className = "state";
        state.textContent = "Vous n'avez déposé aucune plainte.";
        container.appendChild(state);
        return;
      }

      data.plaintes.forEach(p => container.appendChild(creerCartePlainte(p)));
    } catch (err) {
      container.textContent = "";
      const state = document.createElement("div");
      state.className = "state error";
      state.textContent = "Impossible de charger vos plaintes.";
      container.appendChild(state);
      console.error("Erreur plaintes:", err);
    }
  }

  // ── Soumission du formulaire ──
  function afficherMessage(el, texte, type) {
    el.textContent = texte;
    el.className = `msg ${type}`;
  }

  document.getElementById("plainte-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-btn");
    const msgEl = document.getElementById("form-msg");
    const transactionId = document.getElementById("transaction-select").value;
    const motif = document.getElementById("motif-select").value;
    const description = document.getElementById("description-input").value.trim();

    msgEl.className = "msg";
    msgEl.textContent = "";

    if (!transactionId) return afficherMessage(msgEl, "Sélectionnez une transaction.", "error");
    if (!motif) return afficherMessage(msgEl, "Sélectionnez un motif.", "error");
    if (!description) return afficherMessage(msgEl, "Décrivez votre problème.", "error");
    if (description.length > 1000) return afficherMessage(msgEl, "Description trop longue (1000 caractères max).", "error");

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours...";

    try {
      const res = await fetchAvecTimeout(`${WORKER_URL}/plaintes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, transactionId, motif, description })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        afficherMessage(msgEl, data.error || "Échec de l'envoi de la plainte.", "error");
        return;
      }

      afficherMessage(msgEl, "Plainte envoyée avec succès.", "success");
      document.getElementById("plainte-form").reset();
      await chargerMesPlaintes();
    } catch (err) {
      afficherMessage(msgEl, "Erreur réseau. Réessayez.", "error");
      console.error("Erreur soumission:", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer la plainte";
    }
  });

  chargerTransactions();
  chargerMesPlaintes();

})();
