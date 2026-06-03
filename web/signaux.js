/* =====================================================================
   signaux.js — Le "moteur" du site
   ---------------------------------------------------------------------
   Ce fichier sait :
     1. fabriquer un faux signal ECG réaliste (genererECG)
     2. y ajouter du bruit pour le rendre "sale" (ajouterBruit)
     3. le nettoyer avec un filtre simple (filtrer)
     4. retrouver les pics R, c'est-à-dire les battements (detecterPicsR)
     5. en déduire la fréquence cardiaque en battements/minute (calculerBPM)

   Tout est volontairement simple et commenté : c'est NOUS qui l'avons écrit.
   ===================================================================== */

/* --- Petit générateur de hasard "reproductible" -----------------------
   On veut un bruit qui a l'air aléatoire, mais qui redonne TOUJOURS le
   même résultat (pratique pour que la démo soit identique à chaque fois).
   On utilise pour ça une "graine" (seed). */
function creerHasard(graine) {
  let etat = graine >>> 0;
  return function () {
    etat |= 0; etat = (etat + 0x6D2B79F5) | 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // un nombre entre 0 et 1
  };
}

/* --- Une "bosse" en forme de cloche (gaussienne) ----------------------
   Chaque onde de l'ECG (P, Q, R, S, T) est dessinée comme une cloche.
   - centre : où se trouve la bosse (en secondes)
   - largeur : à quel point elle est étalée
   - hauteur : sa taille (négative = creux) */
function cloche(t, centre, largeur, hauteur) {
  const x = (t - centre) / largeur;
  return hauteur * Math.exp(-0.5 * x * x);
}

/* --- Fabrication d'UN battement cardiaque ----------------------------
   Un battement = les 5 ondes P, Q, R, S, T mises bout à bout.
   Les valeurs ci-dessous donnent une forme d'ECG classique. */
function unBattement(t, instantR) {
  return (
    cloche(t, instantR - 0.20, 0.025, 0.12) +  // onde P  (petite bosse avant)
    cloche(t, instantR - 0.025, 0.012, -0.16) + // onde Q  (petit creux)
    cloche(t, instantR, 0.011, 1.00) +          // onde R  (le grand pic !)
    cloche(t, instantR + 0.025, 0.012, -0.25) + // onde S  (creux après R)
    cloche(t, instantR + 0.32, 0.055, 0.30)     // onde T  (bosse large après)
  );
}

/* --- Génération d'un ECG "propre" ------------------------------------
   options :
     - bpm        : fréquence cardiaque voulue (ex : 72)
     - duree      : durée de l'enregistrement en secondes (ex : 24)
     - fe         : fréquence d'échantillonnage (points/seconde, ex : 200)
     - irregulier : si true, espace un peu les battements au hasard
                    (utile plus tard pour imiter une arythmie)
   Renvoie { t: [...temps...], y: [...valeurs...], fe }  */
function genererECG(options) {
  const o = Object.assign({ bpm: 72, duree: 24, fe: 200, irregulier: false, graine: 7 }, options);
  const hasard = creerHasard(o.graine);
  const nbPoints = Math.round(o.duree * o.fe);
  const periode = 60 / o.bpm; // temps entre 2 battements (secondes)

  // 1) On place les instants des pics R sur toute la durée.
  const instantsR = [];
  let instant = 0.6; // on démarre un peu après 0
  while (instant < o.duree - 0.4) {
    instantsR.push(instant);
    let prochain = periode;
    if (o.irregulier) prochain *= 0.7 + 0.6 * hasard(); // espacement variable
    instant += prochain;
  }

  // 2) Pour chaque point de temps, on additionne les battements proches.
  const t = new Array(nbPoints);
  const y = new Array(nbPoints);
  for (let i = 0; i < nbPoints; i++) {
    const temps = i / o.fe;
    t[i] = temps;
    let valeur = 0;
    for (const iR of instantsR) {
      if (Math.abs(temps - iR) < 0.5) valeur += unBattement(temps, iR); // on ne calcule que le battement proche
    }
    y[i] = valeur;
  }
  return { t, y, fe: o.fe, instantsR };
}

/* --- On salit le signal : on ajoute les parasites de la vraie vie -----
   - derive   : ondulation lente (la respiration, les mouvements)
   - secteur  : ronflement électrique régulier (le courant des prises)
   - friture  : petit grésillement aléatoire (le capteur)
   Renvoie un NOUVEAU tableau de valeurs (on ne touche pas à l'original). */
function ajouterBruit(signal, reglages) {
  const r = Object.assign({ derive: 0.45, secteur: 0.07, friture: 0.035, freqSecteur: 50, graine: 13 }, reglages);
  const hasard = creerHasard(r.graine);
  const fe = signal.fe;
  return signal.y.map(function (valeur, i) {
    const temps = i / fe;
    const derive = r.derive * Math.sin(2 * Math.PI * 0.22 * temps)
                 + 0.5 * r.derive * Math.sin(2 * Math.PI * 0.13 * temps + 1.0); // ondulation lente
    const secteur = r.secteur * Math.sin(2 * Math.PI * r.freqSecteur * temps);  // ronflement régulier
    const friture = r.friture * (hasard() * 2 - 1);                            // grésillement
    return valeur + derive + secteur + friture;
  });
}

/* --- Nettoyage : un filtre simple mais réel ---------------------------
   Deux étapes très visuelles :
     A) on enlève l'ondulation lente (la "dérive") en soustrayant une
        moyenne calculée sur une grande fenêtre = on garde les variations
        rapides (les battements) et on jette les lentes.
     B) on lisse légèrement pour effacer le grésillement et le ronflement,
        en remplaçant chaque point par la moyenne de ses voisins proches.
   Renvoie un nouveau tableau de valeurs nettoyées. */
function filtrer(valeurs, fe, options) {
  // options.derive  : true = on enlève l'ondulation lente, false = on n'y touche pas
  // options.lissage : "aucun" | "leger" | "fort"  (fort = on écrase TOUT, même les battements)
  const o = Object.assign({ derive: true, lissage: "leger" }, options);
  const n = valeurs.length;

  // A) Estimation de la dérive : grosse moyenne glissante (~0,8 s), puis on la retire.
  let etapeA;
  if (o.derive) {
    const demiLarge = Math.round(0.4 * fe);
    etapeA = new Array(n);
    for (let i = 0; i < n; i++) {
      let somme = 0, compte = 0;
      for (let k = i - demiLarge; k <= i + demiLarge; k++) {
        if (k >= 0 && k < n) { somme += valeurs[k]; compte++; }
      }
      etapeA[i] = valeurs[i] - somme / compte; // on retire la partie lente
    }
  } else {
    etapeA = valeurs.slice(); // on laisse l'ondulation lente
  }

  // B) Lissage pour gommer le grésillement.
  let demiLisse = 0;
  if (o.lissage === "leger") demiLisse = 2;                 // ~5 points : gomme le bruit, garde les R
  if (o.lissage === "fort")  demiLisse = Math.round(0.06 * fe); // ~25 points : écrase aussi les pics R !
  if (demiLisse === 0) return etapeA;

  const sortie = new Array(n);
  for (let i = 0; i < n; i++) {
    let somme = 0, compte = 0;
    for (let k = i - demiLisse; k <= i + demiLisse; k++) {
      if (k >= 0 && k < n) { somme += etapeA[k]; compte++; }
    }
    sortie[i] = somme / compte;
  }
  return sortie;
}

/* --- Détection des pics R (les battements) ----------------------------
   Idée : un pic R est un point bien plus haut que la moyenne, et qui est
   le plus haut de son petit voisinage. On impose aussi un écart minimum
   entre deux pics (le cœur ne peut pas battre 10 fois par seconde !).
   Renvoie la liste des indices (positions) des pics trouvés. */
function detecterPicsR(valeurs, fe) {
  const n = valeurs.length;
  const maxi = Math.max.apply(null, valeurs);
  const seuil = 0.45 * maxi;          // hauteur minimale pour être un "vrai" pic
  const ecartMin = Math.round(0.30 * fe); // au moins 0,30 s entre 2 battements
  const pics = [];
  let dernier = -ecartMin;
  for (let i = 1; i < n - 1; i++) {
    const estUnSommet = valeurs[i] > valeurs[i - 1] && valeurs[i] >= valeurs[i + 1];
    if (valeurs[i] > seuil && estUnSommet && (i - dernier) >= ecartMin) {
      pics.push(i);
      dernier = i;
    }
  }
  return pics;
}

/* --- Calcul de la fréquence cardiaque (BPM) ---------------------------
   On regarde le temps moyen entre deux pics R, puis on convertit en
   battements par minute. Renvoie un nombre arrondi. */
function calculerBPM(picsIndices, fe) {
  if (picsIndices.length < 2) return 0;
  let sommeEcarts = 0;
  for (let i = 1; i < picsIndices.length; i++) {
    sommeEcarts += (picsIndices[i] - picsIndices[i - 1]) / fe; // écart en secondes
  }
  const ecartMoyen = sommeEcarts / (picsIndices.length - 1);
  return Math.round(60 / ecartMoyen);
}

/* --- Diagnostic simple à partir du BPM -------------------------------- */
function diagnostiquer(bpm) {
  if (bpm < 60) return { etat: "Bradycardie", texte: "cœur trop lent (moins de 60 bpm)", couleur: "orange" };
  if (bpm > 100) return { etat: "Tachycardie", texte: "cœur trop rapide (plus de 100 bpm)", couleur: "rouge" };
  return { etat: "Rythme normal", texte: "entre 60 et 100 bpm, tout va bien", couleur: "vert" };
}

/* --- Trouve le sommet (maximum local) le plus proche d'une position -----
   Quand l'élève clique sur le graphe, on "aimante" son clic vers le vrai
   sommet le plus proche, pour que le marqueur tombe pile sur le pic. */
function trouverSommetProche(valeurs, indexApprox, demiFenetre) {
  const n = valeurs.length;
  const debut = Math.max(0, indexApprox - demiFenetre);
  const fin = Math.min(n - 1, indexApprox + demiFenetre);
  let meilleur = debut;
  for (let i = debut; i <= fin; i++) {
    if (valeurs[i] > valeurs[meilleur]) meilleur = i;
  }
  return meilleur;
}

/* --- Compare les pics choisis par l'élève aux vrais pics ----------------
   Pour chaque pic choisi, on regarde s'il y a un vrai pic tout proche.
   Renvoie : combien de bons (trouves), combien d'oubliés (manques),
   combien d'erreurs (faux). */
function evaluerSelection(picsVrais, picsChoisis, fe, tolerance) {
  const tol = Math.round((tolerance || 0.15) * fe);
  const restants = picsVrais.slice();
  let trouves = 0, faux = 0;
  for (const c of picsChoisis) {
    let idx = -1, meilleureDist = tol + 1;
    for (let k = 0; k < restants.length; k++) {
      const d = Math.abs(restants[k] - c);
      if (d <= tol && d < meilleureDist) { meilleureDist = d; idx = k; }
    }
    if (idx >= 0) { trouves++; restants.splice(idx, 1); }
    else faux++;
  }
  return { trouves: trouves, manques: restants.length, faux: faux, total: picsVrais.length };
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = { genererECG, ajouterBruit, filtrer, detecterPicsR, calculerBPM, diagnostiquer, trouverSommetProche, evaluerSelection };
}

/* =====================================================================
   Mini-jeu Tinder — "Signal ou Objet ?" (signal.html uniquement)
   ===================================================================== */
(function () {
  'use strict';

  /* --- Les 10 cartes ------------------------------------------------- */
  var CARTES = [
    { emoji: "🚦", nom: "Feu tricolore",      sous: "Signal visuel",             estSignal: true  },
    { emoji: "🪨", nom: "Un caillou",          sous: "Matière morte",             estSignal: false },
    { emoji: "📡", nom: "Box Wi-Fi",           sous: "Signal électromagnétique",  estSignal: true  },
    { emoji: "🪑", nom: "Une chaise en bois",  sous: "Objet inerte",              estSignal: false },
    { emoji: "❤️", nom: "Cœur qui bat",        sous: "Signal électrique",         estSignal: true  },
    { emoji: "💧", nom: "Une bouteille d'eau", sous: "Objet",                     estSignal: false },
    { emoji: "📻", nom: "Talkie-Walkie",       sous: "Signal radio",              estSignal: true  },
    { emoji: "🍎", nom: "Une pomme",           sous: "Nourriture",                estSignal: false },
    { emoji: "🎇", nom: "Fibre optique",       sous: "Signal lumineux",           estSignal: true  },
    { emoji: "☕", nom: "Tasse de café",       sous: "Objet",                     estSignal: false },
  ];

  /* --- Garde : ne s'exécute que si la pile existe dans la page ------- */
  var pile = document.getElementById('tinder-pile');
  if (!pile) return;

  var notifEl    = document.getElementById('tinder-notif');
  var resultatEl = document.getElementById('tinder-resultat');
  var jeuZone    = document.getElementById('tinder-jeu-zone');
  var compteurEl = document.getElementById('tinder-compteur');
  var btnSignal  = document.getElementById('tinder-btn-signal');
  var btnObjet   = document.getElementById('tinder-btn-objet');
  var btnRejouer = document.getElementById('tinder-btn-rejouer');

  var deck         = [];
  var indexCourant = 0;
  var score        = 0;
  var enAnimation  = false;
  var notifTimer   = null;

  /* --- Mélange (Fisher-Yates) ---------------------------------------- */
  function melanger(arr) {
    var t = arr.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
    }
    return t;
  }

  /* --- Démarrage / redémarrage --------------------------------------- */
  function demarrer() {
    deck         = melanger(CARTES);
    indexCourant = 0;
    score        = 0;
    enAnimation  = false;
    resultatEl.classList.add('cache');
    jeuZone.classList.remove('cache');
    afficherPile();
    mettreAJourCompteur();
  }

  /* --- Construction de la pile (top 3 cartes) ------------------------ */
  function afficherPile() {
    pile.innerHTML = '';
    var restantes = deck.length - indexCourant;
    var nbVis = Math.min(3, restantes);
    if (nbVis === 0) return;

    /* On insère de bas en haut pour que l'ordre DOM = ordre z-index */
    for (var offset = nbVis - 1; offset >= 0; offset--) {
      var data = deck[indexCourant + offset];
      var el = document.createElement('div');
      el.className = 'tinder-carte';
      el.innerHTML =
        '<span class="tinder-badge tinder-badge-signal">SIGNAL ✅</span>' +
        '<span class="tinder-badge tinder-badge-objet">❌ OBJET</span>' +
        '<span class="tc-emoji">' + data.emoji + '</span>' +
        '<strong class="tc-nom">' + data.nom + '</strong>' +
        '<span class="tc-sous">' + data.sous + '</span>' +
        '<span class="tc-hint">← glisse à gauche ou à droite →</span>';

      if (offset === 0) {
        el.classList.add('tc-active');
      } else if (offset === 1) {
        el.classList.add('tc-dessous1');
      } else {
        el.classList.add('tc-dessous2');
      }
      pile.appendChild(el);
    }

    /* Activer le drag sur la carte du dessus */
    var topCard = pile.querySelector('.tc-active');
    if (topCard) activerDrag(topCard);
  }

  function mettreAJourCompteur() {
    var n = Math.min(indexCourant + 1, CARTES.length);
    compteurEl.textContent = 'Carte ' + n + ' / ' + CARTES.length;
  }

  /* --- Drag & Drop (souris + tactile) -------------------------------- */
  function activerDrag(el) {
    var SEUIL = 80;
    var startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
    var bSig = el.querySelector('.tinder-badge-signal');
    var bObj = el.querySelector('.tinder-badge-objet');

    function onMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      var p = e.touches ? e.touches[0] : e;
      dx = p.clientX - startX;
      dy = p.clientY - startY;
      el.style.transform = 'translate(' + dx + 'px,' + (dy * 0.25) + 'px) rotate(' + (dx * 0.05) + 'deg)';
      var ratio = Math.min(Math.abs(dx) / SEUIL, 1);
      bSig.style.opacity = dx > 20  ? ratio : 0;
      bObj.style.opacity = dx < -20 ? ratio : 0;
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onEnd);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend',  onEnd);
      bSig.style.opacity = 0;
      bObj.style.opacity = 0;

      if (Math.abs(dx) >= SEUIL) {
        effectuerChoix(el, dx > 0, dx > 0 ? 1 : -1);
      } else {
        /* Snap-back */
        el.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.transform  = '';
        setTimeout(function () { el.style.transition = ''; }, 420);
      }
    }

    function onStart(e) {
      if (enAnimation) return;
      dragging = true;
      dx = 0; dy = 0;
      var p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      el.style.transition = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onEnd);
      el.addEventListener('touchmove', onMove, { passive: false });
      el.addEventListener('touchend',  onEnd);
    }

    el.addEventListener('mousedown',  onStart);
    el.addEventListener('touchstart', onStart, { passive: true });
  }

  /* --- Validation d'un choix ----------------------------------------- */
  function effectuerChoix(el, reponduSignal, dir) {
    if (enAnimation) return;
    enAnimation = true;

    var carte = deck[indexCourant];
    var ok    = reponduSignal === carte.estSignal;
    if (ok) score++;

    /* Animer la carte hors-écran */
    var tx = dir * (window.innerWidth + 300);
    el.style.transition = 'transform 0.38s ease, opacity 0.38s ease';
    el.style.transform  = 'translate(' + tx + 'px,' + (dir * 30) + 'px) rotate(' + (dir * 20) + 'deg)';
    el.style.opacity    = '0';

    afficherNotif(ok, carte);
    indexCourant++;
    mettreAJourCompteur();

    setTimeout(function () {
      if (indexCourant >= deck.length) {
        afficherResultat();
      } else {
        afficherPile();
      }
      enAnimation = false;
    }, 400);
  }

  /* --- Notification 1,5 s ------------------------------------------- */
  function afficherNotif(ok, carte) {
    clearTimeout(notifTimer);
    var texte;
    if (ok) {
      texte = carte.estSignal
        ? '✅ Bonne réponse ! <strong>' + carte.nom + '</strong> transporte bien une information.'
        : '✅ Bonne réponse ! <strong>' + carte.nom + '</strong>, c’est un simple objet.';
    } else {
      texte = carte.estSignal
        ? '❌ Raté ! <strong>' + carte.nom + '</strong> transporte une information : c’est un signal !'
        : '❌ Raté ! <strong>' + carte.nom + '</strong> n’est pas un signal, c’est juste un objet.';
    }
    notifEl.className   = 'tinder-notif visible ' + (ok ? 'notif-ok' : 'notif-ko');
    notifEl.innerHTML   = texte;
    notifTimer = setTimeout(function () {
      notifEl.className = 'tinder-notif';
    }, 1500);
  }

  /* --- Écran de résultat --------------------------------------------- */
  function afficherResultat() {
    jeuZone.classList.add('cache');
    resultatEl.classList.remove('cache');
    document.getElementById('tinder-score-valeur').textContent = score;

    var emoji, commentaire;
    if (score <= 4) {
      emoji       = '😅';
      commentaire = "Oups ! Un signal, c’est vraiment le transport d’une information. On revoit ça ensemble !";
    } else if (score <= 7) {
      emoji       = '🙂';
      commentaire = "Pas mal ! Tu as compris la base, mais il y a quelques pièges.";
    } else {
      emoji       = '🎉';
      commentaire = "Excellent ! Tu as un vrai radar à signaux !";
    }
    document.getElementById('tinder-resultat-emoji').textContent = emoji;
    document.getElementById('tinder-commentaire').textContent    = commentaire;
  }

  /* --- Boutons cliquables -------------------------------------------- */
  btnSignal.addEventListener('click', function () {
    if (enAnimation || indexCourant >= deck.length) return;
    var top = pile.querySelector('.tc-active');
    if (top) effectuerChoix(top, true, 1);
  });

  btnObjet.addEventListener('click', function () {
    if (enAnimation || indexCourant >= deck.length) return;
    var top = pile.querySelector('.tc-active');
    if (top) effectuerChoix(top, false, -1);
  });

  btnRejouer.addEventListener('click', demarrer);

  /* --- Lancement initial -------------------------------------------- */
  demarrer();

}());

/* =====================================================================
   Section Spectre — Visualiseur de fréquences (signal.html uniquement)

   Sons synthétiques pour la démo (remplaçables par de vrais fichiers) :
     btn-spectre-1 → sawtooth  100 Hz  (grave, barres à gauche)
     btn-spectre-2 → sine     6500 Hz  (aigu,  barres à droite)
     btn-spectre-3 → bruit blanc       (toutes les fréquences)

   Pour utiliser de vrais fichiers audio à la place, remplacez la
   fonction `creer` de chaque son par :
     var a = new Audio('audio/mon-fichier.mp3');
     a.loop = true;
     var src = audioCtx.createMediaElementSource(a);
     src.connect(gainNode);
     a.play();
     return src;   (et adaptez arreter() pour stopper l'élément audio)
   ===================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('canvas-spectre');
  if (!canvas) return;

  canvas.width  = 600;
  canvas.height = 250;
  var ctx = canvas.getContext('2d');

  var audioCtx     = null;
  var analyser     = null;
  var gainNode     = null;
  var sourceActive = null;
  var animId       = null;
  var idxActif     = -1;

  var SONS = [
    {
      id: 'btn-spectre-1',
      texte: 'Voix Grave (Basses)',
      creer: function () {
        var osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 100;
        return osc;
      }
    },
    {
      id: 'btn-spectre-2',
      texte: 'Sifflement (Aigus)',
      creer: function () {
        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 6500;
        return osc;
      }
    },
    {
      id: 'btn-spectre-3',
      texte: 'Chut ! (Bruit complet)',
      creer: function () {
        var taille = audioCtx.sampleRate * 2;
        var buf    = audioCtx.createBuffer(1, taille, audioCtx.sampleRate);
        var data   = buf.getChannelData(0);
        for (var i = 0; i < taille; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
        var src   = audioCtx.createBufferSource();
        src.buffer = buf;
        src.loop   = true;
        return src;
      }
    }
  ];

  function initAudio() {
    if (audioCtx) { audioCtx.resume(); return; }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.28;
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function arreter() {
    if (sourceActive) {
      try { sourceActive.stop(); } catch (e) {}
      sourceActive.disconnect();
      sourceActive = null;
    }
    cancelAnimationFrame(animId);
    if (idxActif >= 0) {
      var b = document.getElementById(SONS[idxActif].id);
      if (b) { b.classList.remove('actif'); b.textContent = '▶ ' + SONS[idxActif].texte; }
      idxActif = -1;
    }
  }

  function jouer(idx) {
    initAudio();
    if (idx === idxActif) { arreter(); dessinerVide(); return; }
    arreter();

    idxActif = idx;

    // Mémoriser ce bouton (le Set évite le double-comptage)
    if (window._boutonsSectreCliques) {
      window._boutonsSectreCliques.add(idx);
      if (typeof window.verifierVictoireOndes === 'function') window.verifierVictoireOndes();
    }

    sourceActive = SONS[idx].creer();
    sourceActive.connect(gainNode);
    sourceActive.start();

    var btn = document.getElementById(SONS[idx].id);
    if (btn) { btn.classList.add('actif'); btn.textContent = '⏹ ' + SONS[idx].texte; }

    lancerAnimation();
  }

  function lancerAnimation() {
    cancelAnimationFrame(animId);
    /* On affiche les 128 premières bins (0-11 kHz) sur les 256 disponibles */
    var afficher = Math.floor(analyser.frequencyBinCount / 2);
    var data     = new Uint8Array(analyser.frequencyBinCount);
    var barreL   = canvas.width / afficher;
    var zoneH    = canvas.height - 24;

    function frame() {
      animId = requestAnimationFrame(frame);
      analyser.getByteFrequencyData(data);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < afficher; i++) {
        var h     = (data[i] / 255) * zoneH;
        var ratio = i / afficher;
        /* Dégradé bleu électrique (#3B82F6) → violet sombre (#6D28D9) */
        var r = Math.round(59  + ratio * 50);
        var g = Math.round(130 - ratio * 90);
        var b = Math.round(246 - ratio * 29);
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(i * barreL, zoneH - h, barreL - 1, h);
      }
      dessinerLabels();
    }
    frame();
  }

  function dessinerLabels() {
    ctx.fillStyle = '#64748b';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('← Graves (basses fréquences)', 6, canvas.height - 6);
    ctx.textAlign = 'right';
    ctx.fillText('Aigus (hautes fréquences) →', canvas.width - 6, canvas.height - 6);
    ctx.textAlign = 'left';
  }

  function dessinerVide() {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    /* Barres décoratives fantômes */
    var nb = 64, bW = canvas.width / nb, zoneH = canvas.height - 24;
    for (var i = 0; i < nb; i++) {
      var h     = 3 + Math.abs(Math.sin(i * 0.4)) * 5;
      var ratio = i / nb;
      ctx.fillStyle = 'rgba(' + Math.round(59 + ratio * 50) + ',' +
                                Math.round(130 - ratio * 90) + ',' +
                                Math.round(246 - ratio * 29) + ',0.18)';
      ctx.fillRect(i * bW, zoneH - h, bW - 1, h);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font      = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶ Lance un son pour voir son spectre en direct !', canvas.width / 2, zoneH / 2 + 5);
    ctx.textAlign = 'left';
    dessinerLabels();
  }

  SONS.forEach(function (s, i) {
    var btn = document.getElementById(s.id);
    if (btn) btn.addEventListener('click', function () { jouer(i); });
  });

  dessinerVide();
}());
