# Contexte projet — Site « Lis un cœur » (à donner à une IA agent)

Tu interviens sur un site web pédagogique déjà bien avancé. Lis ce document en entier
avant toute modification : il décrit le but, les contraintes **non négociables**, l'état
actuel, et les conventions à respecter. Ne casse pas l'existant ; respecte le style et
l'architecture déjà en place.

---

## 1. Le projet en deux phrases

« Lis un cœur » est un site interactif support d'un **atelier de 4 h** mené par deux
étudiants de l'ENSEIRB-MATMECA (Damien Belharet & Dima Husseini) pour faire découvrir les
**télécommunications et le traitement du signal** à **2 lycéens de seconde** (sans aucune
connaissance en code). Le fil rouge : « Aujourd'hui vous devenez ingénieurs biomédicaux ;
votre mission : construire l'outil qui lit un cœur et détecte une maladie. » On apprend le
signal, le bruit, les filtres, l'ECG, puis on diagnostique.

Les élèves **ne codent jamais** : ils cliquent sur des boutons et bougent des curseurs.

---

## 2. Contraintes techniques NON NÉGOCIABLES

- **100 % statique, hors-ligne, sans installation.** Le site doit tourner en ouvrant les
  fichiers en local (`file:///…`), sans serveur, sans build, sans accès réseau (le wifi de
  la salle peut tomber). Aucune dépendance CDN : tout est dans le dossier (polices, Plotly).
- **Pas de framework.** HTML/CSS/JavaScript « vanilla ». Pas de React, pas de bundler, pas
  de npm dans le livrable. Le JS existant mélange `var`/`function` et `const`/`let` ; reste
  dans cet esprit simple et lisible, sans étape de compilation.
- **Pas de `localStorage`** pour la progression : on utilise **`sessionStorage`** (la
  progression se réinitialise volontairement à la fermeture de l'onglet).
- **Compatibilité Firefox `file://`** : attention aux comportements liés à l'origine `null`
  (voir la règle des badges, §6).

---

## 3. Pile technique

- HTML/CSS/JS natifs.
- **Plotly** (`lib/plotly-basic.min.js`, embarqué localement) pour les graphes du Labo.
- **Canvas 2D** maison pour l'oscilloscope temps réel de l'acquisition et le spectrogramme.
- Polices **auto-hébergées** dans `fonts/` : **Bricolage Grotesque** (titres) et
  **Atkinson Hyperlegible** (texte courant).
- Une feuille de style commune `style.css` + des `<style>` propres à chaque page pour le
  spécifique.

---

## 4. Arborescence des fichiers

```text
index.html        Accueil / mission + progression (badges, diplôme)
signal.html       Module « C'est quoi un signal ? »   (badge : signal)
coeur.html        Module « Le cœur et l'ECG »          (badge : coeur_ecg)
labo.html         Module « Le Labo ECG »               (badge : labo)   ← le module central
spectro.html      Module Bonus « La photo du son »     (futur badge : curieux)
progression.js    Gestionnaire de badges (sessionStorage) + toast + confettis
signaux.js        Bibliothèque partagée : maths du signal/ECG + câblage des jeux de signal.html
style.css         Habillage commun (thème « papier ECG »)
fonts/            Polices woff2 (Bricolage, Atkinson)
lib/              plotly-basic.min.js
```

Note : `acquisition.html` a été **fusionné dans labo.html** (étape 1 « Capter ») et peut être
supprimé. Le module « Détective des pathologies » n'existe pas encore (voir §9).

---

## 5. Système de design (à réutiliser tel quel)

Variables CSS définies dans `:root` de `style.css` :

- `--papier` #fbfaf6 (fond), `--encre` #16302a (texte), `--encre-doux` #4b6058
- `--signal` #0e9f6e (vert, couleur « signal »), `--signal-fonce` #0b7a55
- `--battement` #e11d48 (rouge, couleur « cœur/pic R »), `--attention` #d97706
- `--carte` #ffffff, `--bord` #e3e7e2, `--rayon` 16px, `--ombre` (ombre douce)
- `--titre` = Bricolage (titres en gras), `--texte` = Atkinson (corps)
- Fond du `body` : léger quadrillage façon papier d'électrocardiogramme.

Classes communes : `.barre` (nav du haut), `.page` (conteneur centré), `.mission`
(bandeau vert du role-play), `.carte` (carte blanche), `.bouton` (+ `.bouton.secondaire`),
`.message` (+ `.bon` / `.pas-encore`), `.etapes .pastille` (barre d'étapes), `.cache`
(masquer), `.pied` (pied de page).

**Règle de placement du style** : ce qui est spécifique à une page va dans son `<style>` ;
ce qui est réutilisable (ex. les sous-listes dépliables) va dans `style.css`, dans un bloc
commenté. Les icônes sont des emojis (cohérent avec tout le site).

---

## 6. Progression & badges — RÈGLE CRITIQUE

`progression.js` expose : `validerModule(id)`, `moduleValide(id)`, `modulesValides()`,
`tousLesBadges()`, `reinitialiserTout()`, `afficherToastBadge()`, `lancerConfettis()`.
Clé `sessionStorage` : `"lisuncoeur_badges"`. Quatre badges :
`signal` 🌊, `coeur_ecg` 🫀, `labo` 🔬, `pathologies` 🩺.

Le badge d'un module est attribué **à l'intérieur du module**, à la fin, par
`validerModule("…")`. Pour fiabiliser l'affichage sur l'accueil en `file://`, l'accueil
lit aussi un paramètre d'URL `index.html?badge=<id>` et valide le badge correspondant.

⚠️ **RÈGLE À NE JAMAIS ENFREINDRE** : le paramètre `?badge=<id>` ne doit figurer **que** sur
le bouton « Retour à l'accueil pour voir ton badge » qui apparaît **une fois le module
terminé**. Tous les liens de navigation « quitter / Accueil / logo » pointent vers
`index.html` **nu** (sans paramètre). Sinon, revenir à l'accueil en cours de route attribue
le badge prématurément (bug déjà rencontré et corrigé). `signal.html` est le modèle correct.

---

## 7. État actuel, module par module

### index.html — Accueil
- Bandeau mission + liste des modules + section « Ta progression » (barre + 4 cartes de
  badges + bouton diplôme + confettis quand les 4 badges sont obtenus).
- La pastille **« Le Labo ECG » est dépliable** : au clic, elle révèle une **sous-liste**
  des 4 mini-parties (Capter / Nettoyer / Zoomer / Repérer) qui pointent vers
  `labo.html?etape=0..3`.
- **Verrouillage** : tant que le badge `labo` n'est pas obtenu, seule « Capter » est
  cliquable ; les autres sous-étapes sont grisées avec un 🔒. Une fois le badge obtenu,
  tout se déverrouille (mode révision). Motif réutilisable : `.pastille-expandable` >
  `.pastille-tete` + `.sous-liste` > `.sous-liste-inner`, et `.sous-item.verrou`.

### signal.html — « C'est quoi un signal ? » (badge : signal) — COMPLET
Page la plus riche. Contient : un jeu « Tinder des signaux » (objet vs signal, swipe), un
bac à sable amplitude/fréquence avec son, un défi de synchronisation, la lecture de la
période sur le graphe, une démo d'**échantillonnage** (signal discret), et un module
**spectre** (voix grave / aigus / bruit blanc). Badge « Maître des Ondes ».

### coeur.html — « Le cœur et l'ECG » (badge : coeur_ecg) — COMPLET
Anatomie simplifiée → ondes P, QRS, T → synchronisation cœur + ECG en direct. Badge
« Explorateur Anatomique ».

### labo.html — « Le Labo ECG » (badge : labo) — MODULE CENTRAL, COMPLET
Barre d'étapes à **4 étapes verrouillées linéairement** (on ne saute pas une étape non
faite ; on peut revenir en arrière sur une étape déjà faite ; tout se déverrouille une fois
le badge obtenu). Deep-link `?etape=N` (borné au niveau débloqué).

1. **Capter** — oscilloscope canvas temps réel + sélecteur de capteur (électrodes hôpital
   vs montre de sport) + « machine à bruit » (respiration → dérive lente, mouvement →
   sursauts, secteur 50 Hz → grésillement) + jauge de qualité. But : montrer d'où vient la
   saleté. Bouton « Envoyer l'enregistrement au labo ».
2. **Nettoyer** — réception animée du signal (Plotly), puis console à 2 curseurs
   (anti-tangage / anti-grésillement) + jauge de qualité avec un « point d'équilibre »
   (sweet spot 40-60/40-60). Le bouton « Valider » disparaît après validation ; reste
   « Passer au zoom ».
3. **Zoomer** — trouver la bonne largeur d'affichage (ni trop large ni trop serré).
4. **Repérer** — l'élève clique lui-même les pics R sur le graphe ; vérification ; puis
   calcul du **BPM** et **diagnostic** ; attribution du badge.

Détails d'implémentation : `FE = 200` Hz, signal de 24 s. Variables d'état clés dans le
script inline : `etapeActuelle`, `etapeMax` (verrouillage), `filtreValide`, `propre`
(signal nettoyé), `plageActuelle` (zoom). Fonction de navigation : `allerEtape(n)` (refuse
`n > etapeMax`), `majPastilles()` met à jour actif/fait/verrou. L'oscilloscope est isolé
dans une IIFE exposant `window.__oscillo = { start, stop, resize }`.

### spectro.html — « La photo du son » (Module Bonus) — COMPLET
Une page bonus simplifiée, accessible à la fin du labo, centrée sur la lecture du spectrogramme. Contient 3 mini-parties :

1. **Lire la photo du son** : 3 sons (grave, aigu, sirène) avec dessin en direct de la trace.

2. **La signature du bruit** : Un battement de cœur traversé par la ligne 50 Hz, avec un bouton pour appliquer le filtre et la faire disparaître.

3. **Trouve l'intrus** : Un jeu où il faut cliquer sur la ligne du parasite positionnée aléatoirement.
Technique : Aucune vraie FFT n'est calculée. La "photo" est directement dessinée sur le Canvas à partir d'un modèle (lignes horizontales pour le son continu, barres verticales pour les battements) pour plus de légèreté et un fonctionnement 100% hors-ligne fiable.

### pathologies.html — « Détective des pathologies » — À CONSTRUIRE IMMÉDIATEMENT
Ce module doit être découpé en 3 mini-parties distinctes (barre d'étapes linéaires, comme le Labo) :

    Étape 1 : Comprendre la mécanique : Une zone interactive montrant une animation visuelle de cœur (ex: un SVG ou un gros emoji qui bat). Un curseur ou des boutons permettent de basculer entre : Rythme Normal, Tachycardie (le cœur bat super vite), Bradycardie (le cœur bat au ralenti), Fibrillation (le cœur tremble de façon chaotique), et Extrasystole (un raté visuel ponctuel). L'élève voit l'impact mécanique sur l'organe et le signal ECG théorique correspondant en dessous.

    Étape 2 : Le jeu du diagnostic (Style Tinder) : Un jeu de rôle séquentiel avec 5 à 6 patients max. Chaque patient a un mini-profil textuel (ex: « Papy Jean, 82 ans, grosse fatigue au réveil »). L'élève voit défiler son signal ECG et doit cliquer sur le bon diagnostic parmi 4 choix : Sain, Tachycardie, Bradycardie, Fibrillation.

        Mécanique humoristique : Si l'élève se trompe, le patient "râle" avec un message personnalisé (« Aïe, vous me donnez le mauvais traitement ! »). S'il a juste, le patient est sauvé et un court message de prévention santé/sport s'affiche (« Bien joué ! Éviter le stress et courir régulièrement protège le cœur... »).

    Étape 3 : Le Patient Mystère (Le Boss de fin) : Une transition graphique dramatique inspirée de Smash Bros (Silhouette noire + texte "UN NOUVEAU PATIENT MYSTÈRE ARRIVE !"). C'est l'épreuve ultime qui rassemble TOUTES les connaissances acquises : l'élève reçoit un signal brut ultra-salit, il doit lui-même le filtrer (console de nettoyage), appliquer le bon zoom, cliquer sur les pics R pour obtenir le BPM, et poser le diagnostic final pour sauver ce patient spécial.

Réussir l'étape 3 attribue le 4ème badge obligatoire : pathologies (Détective Médical), déclenchant le diplôme final sur l'accueil.

---

## 8. API de signaux.js (bibliothèque partagée)

Maths du signal/ECG (haut du fichier) :
- `genererECG({ bpm, duree, fe, graine })` → objet ECG (axe temps `.t` + échantillons),
  un battement = ondes P-QRS-T générées par `unBattement`/`cloche`, hasard reproductible
  via `creerHasard(graine)`.
- `ajouterBruit(signal, reglages)` → signal bruité (dérive, secteur, etc.).
- `filtrer(valeurs, fe, { derive, lissage })` → signal filtré (correction de dérive +
  lissage `"aucun"|"leger"|"fort"`).
- `detecterPicsR(valeurs, fe)` → indices des pics R.
- `calculerBPM(picsIndices, fe)` → fréquence cardiaque.
- `diagnostiquer(bpm)` → `{ etat, texte, couleur }` (normal / tachy / brady…).
- `trouverSommetProche(valeurs, index, demiFenetre)` → cale un clic sur le pic le plus proche.
- `evaluerSelection(picsVrais, picsChoisis, fe, tolerance)` → `{ total, trouves, manques, faux }`.

⚠️ Le bas de `signaux.js` contient aussi des helpers **spécifiques à signal.html** (jeu de
swipe, audio, spectre/animation). Ne casse pas ces parties en touchant à la lib.

Note pour l'agent : Pour le module pathologies, tu devras utiliser ou étendre genererECG pour simuler facilement des rythmes lents (brady), rapides (tachy), chaotiques (fibrillation) ou avec des anomalies isolées (extrasystoles).
---

## 9. Idée directrice à poursuivre & TODO

**Idée de navigation en « mini-parties »** : chaque module gagne à être découpé en
sous-étapes qu'on déclenche entre deux passages à l'oral (montrer → manipuler → expliquer),
conformément à la règle pédagogique « jamais plus de 10-15 min sans manipulation ». C'est
déjà fait dans le Labo (barre d'étapes) et reflété par la sous-liste dépliable de l'accueil.
Le même motif peut être appliqué à `signal.html` et `coeur.html` plus tard.

Restant à construire (par ordre logique du déroulé) :

Créer la page pathologies.html en suivant scrupuleusement la structure en 3 étapes décrite au §7.

S'assurer que le bouton de fin valide le badge pathologies avec la règle de redirection index.html?badge=pathologies.

---

## 10. Conventions à respecter quand tu modifies

- Reste **statique / hors-ligne / `file://`** ; pas de réseau, pas de build, pas de framework.
- `sessionStorage` (jamais `localStorage`) pour la progression.
- **Règle des badges** (§6) : liens de nav → `index.html` nu ; `?badge=<id>` seulement sur
  le bouton de fin de module.
- Réutilise les variables et classes de `style.css` ; mets le spécifique dans le `<style>`
  de la page, le réutilisable dans `style.css` (bloc commenté).
- Verrouillage linéaire des étapes par défaut ; déverrouillage complet une fois le badge du
  module obtenu (mode révision) — cohérent avec ce qui est fait dans le Labo.
- Public = lycéens de seconde : langage simple, tutoiement, ton « fait par des étudiants »,
  zéro jargon non expliqué, aucune manipulation de code par l'élève.
- Teste tes modifications dans le navigateur (oscilloscope animé, curseurs réactifs,
  verrouillage, badge attribué uniquement en fin de parcours).
