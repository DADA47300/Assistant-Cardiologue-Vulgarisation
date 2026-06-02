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
