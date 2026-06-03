# ❤️ Lis un cœur
### Mission ECG — En quête au cœur du signal

> Un atelier interactif pour faire découvrir les télécommunications et le traitement du signal à des lycéens de seconde, à travers l'électrocardiogramme (ECG).

Projet de stage — **ENSEIRB-MATMECA**, Département Télécommunications.

---

## 🎯 De quoi s'agit-il ?

Nous sommes un binôme d'étudiants de l'ENSEIRB-MATMECA. Pendant notre stage, nous accueillons des lycéens de seconde (eux-mêmes en stage d'observation) pour leur faire découvrir notre école, les télécommunications et les métiers du domaine.

Pour rendre ça concret, on s'appuie sur un projet réalisé cette année : **l'analyse automatique de l'ECG**, c'est-à-dire l'enregistrement de l'activité électrique du cœur. L'idée est de montrer comment un ordinateur arrive à « lire » un cœur et à repérer une maladie, et d'expliquer que c'est exactement la même logique que dans les télécoms : **capter une information, la nettoyer, en extraire le sens.**

Ce dépôt contient le **site web interactif** qui sert de support à l'atelier.

---

## 📋 Le cadre en bref

| Élément | Détail |
|---|---|
| **Public** | 2 lycéens de seconde par session (aucune connaissance en informatique ni en programmation) |
| **Durée** | 1 bloc de 4 h |
| **Lieu** | Salle informatique de l'école (un ordinateur par élève) |
| **Support principal** | Un site web interactif que nous créons nous-mêmes |
| **Contrainte importante** | Les élèves ne codent pas : ils cliquent sur des boutons et bougent des curseurs |
| **Matériel physique** | Un bracelet connecté (montre) relié à un téléphone. Pas de vrai capteur ECG : on travaille sur des signaux déjà enregistrés. |

---

## 🏆 Objectifs pédagogiques

À la fin des 4 h, chaque lycéen doit :

- avoir compris ce qu'est **un signal** et ce qu'est **le bruit** ;
- avoir compris **à quoi sert un filtre** (nettoyer un signal) ;
- savoir qu'un **ECG est un signal**, composé d'ondes caractéristiques (les ondes **P, QRS, T**) ;
- avoir réussi, **par lui-même**, à transformer un signal cardiaque « sale » en un diagnostic ;
- repartir avec **l'envie d'en savoir plus** sur nos métiers.

---

## 🧵 Le fil rouge : « Devenez ingénieurs biomédicaux »

Toute la session raconte une seule histoire :

> « Aujourd'hui, vous devenez ingénieurs biomédicaux. Votre mission : construire l'outil qui lit un cœur et détecte une maladie. Tout ce qu'on apprend sert à cette mission. »

Chaque notion (signal, bruit, filtre, cœur) est une **pièce que les élèves débloquent** pour accomplir leur mission finale : diagnostiquer un patient.

---

## 🌐 Le site web (structure des pages)

Le site suit exactement le déroulé de l'atelier — **une idée par page** :

| Page | Contenu | Bloc |
|---|---|---|
| **Accueil** |  Page d’accueil avec les liens vers les autres pages | Bloc 0 |
| **C'est quoi un signal ?** | Joue avec les différentes notions élémentaires | Bloc 1 |
| **Le cœur/ECG** | Explication du fonctionnement du coeur/ ECG | Bloc 3 |
| **Labo ECG** | Montre différentes étapes pour calculer le bpm| Bloc 4 |
| **Détective des pathologies** | Le jeu de diagnostic | Bloc 5 |
| **Métiers / Et après ?** | Court et concret | Bloc 6 |

### ⚙️ Contrainte technique importante

Le site doit fonctionner **dans un simple navigateur, sans rien à installer**, et marcher **même si le wifi tombe**.

---

## ⏱️ Déroulé des 4 heures

| Horaire | Bloc | En une phrase |
|---|---|---|
| 00:00 – 00:25 | **0. Accueil + Démo choc + Mission** | On se présente, on surprend avec une démo en direct, on lance la mission |
| 00:25 – 00:50 | **1. C'est quoi un signal ?** | On découvre ce qu'est un signal et ses propriétés de base |
| 00:50 – 01:15 | **2. Le bruit et les filtres** | On comprend pourquoi un signal est « sale » et comment le nettoyer |
| 01:15 – 01:25 | *Pause 1* | — |
| 01:25 – 01:55 | **3. Le cœur et l'ECG** | On relie le cœur (biologie) au signal électrique qu'il produit |
| 01:55 – 02:45 | **4. Le Labo ECG** | Les élèves nettoient eux-mêmes un signal cardiaque *(cœur de la séance)* |
| 02:45 – 02:55 | *Pause 2* | — |
| 02:55 – 03:25 | **5. Détective des pathologies** | Les élèves diagnostiquent des cœurs malades |
| 03:25 – 03:55 | **6. Défi final + Métiers** | Patient mystère, métiers, remise d'un « diplôme » |
| 03:55 – 04:00 | *Clôture* | Questions, retours |

### Les 3 règles de rythme

1. **On alterne en permanence** — jamais plus de ~10-15 min d'explication sans manipulation par les élèves.
2. **On montre avant d'expliquer** — d'abord la curiosité (une démo qui surprend), puis le « pourquoi ».
3. **On fait des pauses** — deux pauses prévues, et on change souvent de posture (tableau / écran).

---

## 🩺 Les pathologies abordées

- **Tachycardie** = cœur trop rapide (plus de 100 BPM)
- **Bradycardie** = cœur trop lent (moins de 60 BPM)
- **Fibrillation** = rythme chaotique, où les belles ondes nettes disparaissent

---

## 🧰 Matériel à préparer (checklist)

- [ ] Montre connectée + téléphone (testés à l'avance) pour la démo du Bloc 0
- [ ] *(Option)* Application de mesure du pouls par caméra
- [ ] Fichiers son : version propre, version bruitée, version nettoyée (Bloc 2)
- [ ] Le site web fonctionnel et testé sur les ordinateurs de la salle (navigateur, sans installation, fonctionnel hors-ligne)
- [ ] Signaux ECG enregistrés : normal, tachycardie, bradycardie, fibrillation, et le « patient mystère »
- [ ] Diplômes « ingénieur biomédical junior » à imprimer
- [ ] Tableau / feutres pour les explications (signal, cœur)

---

## 👥 Auteurs

Binôme d'étudiants de l'**ENSEIRB-MATMECA** — Département Télécommunications.

---

*Document de préparation — susceptible d'évoluer au fil de la mise au point du site et des premiers tests.*
