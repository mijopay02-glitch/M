(function () {
  'use strict';

  const ENTREPRISES_ENDPOINT = "https://listentreprise.mijocomplexe.workers.dev/";
  const PAY_PAGE_URL = "pay.html";
  const MERCHANT_PARAM = "businessId";
  const BUSINESS_ID_REGEX = /^biz-[a-zA-Z0-9]{10,32}$/;
  const FETCH_TIMEOUT_MS = 8000;
  const MAX_ENTREPRISES = 200; // anti-DoS côté rendu si l'API renvoie un payload énorme

  let entreprisesData = [];

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function urlLogoValide(url) {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      // https uniquement, et on restreint au domaine supabase attendu (déclaré dans le CSP connect-src)
      return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
    } catch (e) {
      return false;
    }
  }

  function initiale(nom) {
    const clean = (nom || "?").trim();
    return escapeHtml(clean.charAt(0).toUpperCase() || "?");
  }

  function creerCarteBusiness(biz) {
    if (!biz || typeof biz !== "object") return null;
    if (typeof biz.businessId !== "string" || !BUSINESS_ID_REGEX.test(biz.businessId)) return null;

    const nomSain = String(biz.nom || "Entreprise").slice(0, 100);

    const a = document.createElement("a");
    a.className = "biz-card";
    a.href = `${PAY_PAGE_URL}?${MERCHANT_PARAM}=${encodeURIComponent(biz.businessId)}`;

    if (urlLogoValide(biz.logoUrl)) {
      const img = document.createElement("img");
      img.className = "biz-logo";
      img.src = biz.logoUrl;
      img.alt = nomSain;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        const fallback = document.createElement("div");
        fallback.className = "biz-logo";
        fallback.textContent = initiale(nomSain);
        img.replaceWith(fallback);
      };
      a.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "biz-logo";
      fallback.textContent = initiale(nomSain);
      a.appendChild(fallback);
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "biz-name";
    nameSpan.textContent = nomSain;
    a.appendChild(nameSpan);

    return a;
  }

  function renderGrid(list) {
    const content = document.getElementById("content");
    const label = document.getElementById("results-label");

    if (!list.length) {
      content.textContent = "";
      const stateDiv = document.createElement("div");
      stateDiv.className = "state";
      stateDiv.textContent = "Aucune entreprise ne correspond à votre recherche.";
      content.appendChild(stateDiv);
      return;
    }

    label.textContent = `${list.length} entreprise${list.length > 1 ? "s" : ""} disponible${list.length > 1 ? "s" : ""}`;

    const grid = document.createElement("div");
    grid.className = "grid";

    list.forEach(biz => {
      const carte = creerCarteBusiness(biz);
      if (carte) grid.appendChild(carte);
    });

    content.textContent = "";
    content.appendChild(grid);
  }

  function afficherErreur(message) {
    const content = document.getElementById("content");
    content.textContent = "";
    const errDiv = document.createElement("div");
    errDiv.className = "state error";
    errDiv.textContent = message;
    content.appendChild(errDiv);
  }

  async function loadEntreprises() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(ENTREPRISES_ENDPOINT, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Le serveur a répondu avec le statut ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Réponse inattendue du serveur (format invalide)");
      }

      const data = await res.json();

      if (!data || data.success !== true || !Array.isArray(data.entreprises)) {
        throw new Error((data && data.error) || "Format de données invalide");
      }

      entreprisesData = data.entreprises.slice(0, MAX_ENTREPRISES);
      renderGrid(entreprisesData);

    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err && err.name === "AbortError"
        ? "Le chargement a pris trop de temps. Réessayez."
        : "Impossible de charger les entreprises. Réessayez plus tard.";
      afficherErreur(msg);
      // Détail technique uniquement en console, jamais affiché à l'utilisateur
      console.error("Erreur de chargement :", err);
    }
  }

  document.getElementById("search-input").addEventListener("input", function (e) {
    const q = e.target.value.trim().toLowerCase().slice(0, 100);
    const filtered = q
      ? entreprisesData.filter(b => typeof b.nom === "string" && b.nom.toLowerCase().includes(q))
      : entreprisesData;
    renderGrid(filtered);
  });

  loadEntreprises();

})();
