/* =====================================================================
   progression.js — Gestionnaire de progression gamifié (sessionStorage)
   Utilisé sur TOUTES les pages du site « Lis un cœur ».
   La progression est réinitialisée à chaque fermeture d'onglet.
   ===================================================================== */

/**
 * Registre des badges :
 *   clé   = identifiant interne du module (utilisé dans sessionStorage)
 *   value = { nom: nom affiché du badge, icone: emoji affiché }
 */
var BADGES = {
  signal:      { nom: "Maître des Ondes",             icone: "🌊" },
  coeur_ecg:   { nom: "Explorateur Anatomique",       icone: "🫀" },
  labo:        { nom: "Technicien de Laboratoire",     icone: "🔬" },
  pathologies: { nom: "Expert Diagnostic",             icone: "🩺" },
  metiers:     { nom: "Ingénieur Polyvalent",          icone: "🛠️" },
  curieux:     { nom: "Détective du Son",   icone: "🎧" },
  matlab:      { nom: "Expert Matlab",      icone: "💻" },
  montre:      { nom: "Ingénieur Biomédical", icone: "⌚" },
  filtre:      { nom: "Dompteur de Fréquences", icone: "🎹" }
};

/** Badges obligatoires pour le diplôme (les badges bonus n'en font pas partie) */
var BADGES_OBLIGATOIRES = ["signal", "coeur_ecg", "labo", "pathologies", "metiers"];

/** Badges bonus (missions secondaires, non requis pour le diplôme) */
var BADGES_BONUS = ["curieux", "matlab", "montre", "filtre"];

/** Clé sessionStorage pour stocker les badges */
var CLE_PROGRESSION = "lisuncoeur_badges";

/* ----- Fonctions utilitaires ----- */

/** Vérifie si sessionStorage est disponible et fonctionnel. */
function _sessionStorageDisponible() {
  try {
    var cle = "__ss_test__";
    sessionStorage.setItem(cle, "1");
    var ok = sessionStorage.getItem(cle) === "1";
    sessionStorage.removeItem(cle);
    return ok;
  } catch (e) {
    return false;
  }
}

/** Récupère l'objet de progression depuis sessionStorage. */
function _lireProgression() {
  try {
    var data = sessionStorage.getItem(CLE_PROGRESSION);
    if (!data) return {};
    var parsed = JSON.parse(data);
    return (typeof parsed === "object" && parsed !== null) ? parsed : {};
  } catch (e) {
    console.error("[Progression] Erreur lecture sessionStorage:", e);
    return {};
  }
}

/** Écrit l'objet de progression dans sessionStorage avec vérification. */
function _ecrireProgression(obj) {
  try {
    var json = JSON.stringify(obj);
    sessionStorage.setItem(CLE_PROGRESSION, json);
    // Vérification immédiate de la relecture
    var relecture = sessionStorage.getItem(CLE_PROGRESSION);
    if (relecture !== json) {
      console.error("[Progression] ERREUR: les données écrites ne correspondent pas à la relecture !");
      console.error("  Écrit:", json);
      console.error("  Relu:", relecture);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Progression] ERREUR écriture sessionStorage:", e);
    alert("⚠️ Impossible de sauvegarder ta progression. Vérifie que ton navigateur autorise les données de session.");
    return false;
  }
}

/* ----- API publique ----- */

/**
 * Valide un module et attribue le badge correspondant.
 * @param {string} idModule — l'identifiant du module (clé de BADGES).
 * @returns {boolean} true si le badge vient d'être attribué
 */
function validerModule(idModule) {
  if (!BADGES[idModule]) {
    console.warn("[Progression] Module inconnu :", idModule);
    return false;
  }

  var prog = _lireProgression();
  if (prog[idModule]) {
    console.log("[Progression] Badge déjà obtenu :", BADGES[idModule].nom);
    return false; // déjà obtenu
  }

  prog[idModule] = {
    badge: BADGES[idModule].nom,
    date: new Date().toISOString()
  };

  var ok = _ecrireProgression(prog);
  if (!ok) {
    console.error("[Progression] Échec de sauvegarde pour le module:", idModule);
    return false;
  }

  console.log("🏅 Badge obtenu :", BADGES[idModule].nom);

  // Vérification immédiate : relire et confirmer
  var verification = _lireProgression();
  if (verification[idModule]) {
    console.log("[Progression] ✅ Vérifié : badge bien enregistré dans sessionStorage");
  } else {
    console.error("[Progression] ❌ ERREUR : le badge n'a PAS été sauvegardé malgré l'écriture !");
  }

  // Afficher la notification toast
  if (typeof afficherToastBadge === "function") {
    afficherToastBadge(BADGES[idModule]);
  }

  return true;
}

/**
 * Vérifie si un module a été validé.
 * @param {string} idModule
 * @returns {boolean}
 */
function moduleValide(idModule) {
  var prog = _lireProgression();
  return !!prog[idModule];
}

/**
 * Retourne la liste des identifiants de modules validés.
 * @returns {string[]}
 */
function modulesValides() {
  var prog = _lireProgression();
  return Object.keys(BADGES).filter(function (k) { return !!prog[k]; });
}

/**
 * Vérifie si tous les badges OBLIGATOIRES ont été obtenus (diplôme).
 * Les badges bonus ne comptent pas.
 * @returns {boolean}
 */
function tousLesBadges() {
  var valides = modulesValides();
  return BADGES_OBLIGATOIRES.every(function (id) {
    return valides.indexOf(id) !== -1;
  });
}

/**
 * Vérifie si un badge est un badge bonus.
 * @param {string} idModule
 * @returns {boolean}
 */
function estBadgeBonus(idModule) {
  return BADGES_BONUS.indexOf(idModule) !== -1;
}

/**
 * Réinitialise toute la progression (après confirmation).
 */
function reinitialiserTout() {
  if (confirm("Tu veux vraiment effacer toute ta progression et tes badges ?")) {
    sessionStorage.removeItem(CLE_PROGRESSION);
    sessionStorage.removeItem("diplome_affiche");
    location.reload();
  }
}

/* =====================================================================
   TOAST DE FÉLICITATIONS (s'affiche dans chaque module à l'obtention)
   ===================================================================== */

/**
 * Affiche une notification de badge obtenu, en haut de l'écran.
 * @param {{ nom: string, icone: string }} badge
 */
function afficherToastBadge(badge) {
  // Évite les doublons
  if (document.getElementById("toast-badge")) return;

  var toast = document.createElement("div");
  toast.id = "toast-badge";
  toast.innerHTML =
    '<div class="toast-badge-inner">' +
      '<span class="toast-badge-icone">' + badge.icone + '</span>' +
      '<div class="toast-badge-texte">' +
        '<strong>🏅 Badge obtenu !</strong>' +
        '<span>' + badge.nom + '</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(toast);

  // Animation d'entrée
  requestAnimationFrame(function () {
    toast.classList.add("toast-visible");
  });

  // Retrait après 4 s
  setTimeout(function () {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-sortie");
    setTimeout(function () { toast.remove(); }, 500);
  }, 4000);
}

/* =====================================================================
   MINI-CONFETTIS (légèrement inspiré de canvas-confetti, mais 100 % maison)
   Utilisé sur la page index quand tous les badges sont débloqués.
   ===================================================================== */

function lancerConfettis() {
  var canvas = document.createElement("canvas");
  canvas.id = "confettis-canvas";
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;" +
    "pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  function redimensionner() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  redimensionner();
  window.addEventListener("resize", redimensionner);

  var couleurs = ["#0e9f6e", "#e11d48", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
  var particules = [];
  var nbParticules = 150;

  for (var i = 0; i < nbParticules; i++) {
    particules.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      r: Math.random() * 6 + 3,
      dx: (Math.random() - 0.5) * 4,
      dy: Math.random() * 3 + 2,
      rot: Math.random() * 360,
      drot: (Math.random() - 0.5) * 8,
      couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
      forme: Math.random() > 0.5 ? "rect" : "circle",
      opacite: 1
    });
  }

  var images = 0;
  var maxImages = 180; // ~3 secondes à 60 fps

  function dessiner() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var tousFinis = true;
    for (var j = 0; j < particules.length; j++) {
      var p = particules[j];
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.05; // gravité
      p.rot += p.drot;

      // Fondu vers la fin
      if (images > maxImages * 0.6) {
        p.opacite = Math.max(0, p.opacite - 0.015);
      }

      if (p.opacite > 0 && p.y < canvas.height + 50) {
        tousFinis = false;
        ctx.save();
        ctx.globalAlpha = p.opacite;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.couleur;
        if (p.forme === "rect") {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    images++;
    if (!tousFinis && images < maxImages) {
      requestAnimationFrame(dessiner);
    } else {
      canvas.remove();
    }
  }
  dessiner();
}

/* =====================================================================
   DIAGNOSTIC : Log l'état de la progression au chargement (aide au debug)
   ===================================================================== */
(function diagnosticChargement() {
  var page = window.location.pathname.split("/").pop() || "index.html";
  console.log("[Progression] 📍 Page:", page);
  console.log("[Progression] 📦 sessionStorage disponible:", _sessionStorageDisponible());
  console.log("[Progression] 🔑 Clé utilisée:", CLE_PROGRESSION);
  var raw = null;
  try { raw = sessionStorage.getItem(CLE_PROGRESSION); } catch(e) {}
  console.log("[Progression] 📄 Données brutes:", raw);
  console.log("[Progression] 🏅 Modules validés:", modulesValides());
})();
