# Lis un cœur ❤️

Site web pédagogique réalisé dans le cadre d'un stage à l'**ENSEIRB-MATMECA**
(Département Télécommunications).

Il sert de support à un atelier de 4 h qui fait découvrir à des lycéens de seconde
les **télécommunications** et le **traitement du signal**, à travers
l'**électrocardiogramme (ECG)** : nettoyer un signal cardiaque, repérer les
battements, calculer la fréquence cardiaque et reconnaître des pathologies.

## Comment l'ouvrir

Aucune installation : **double-cliquez sur `index.html`** (testé sur Firefox).
Tout fonctionne hors-ligne (les bibliothèques et les polices sont incluses dans le dépôt).

## Les pages

| Page | Rôle | État |
|------|------|------|
| `index.html` | Accueil / mission | ✅ |
| `labo.html` | Labo ECG : nettoyer un signal et trouver la fréquence cardiaque | ✅ |
| C'est quoi un signal ? | notions de base | à venir |
| Le cœur et l'ECG | biologie + ondes P-QRS-T | à venir |
| Détective des pathologies | reconnaître tachy/brady/fibrillation | à venir |
| Métiers & débouchés | les métiers du domaine | à venir |

## Comment c'est fait

- **HTML / CSS / JavaScript** classique, sans framework (lisible et facile à modifier).
- `signaux.js` : notre "moteur". Il fabrique un faux ECG réaliste, le bruite, le
  filtre, détecte les pics R et calcule la fréquence cardiaque. Tout est commenté.
- `style.css` : l'habillage commun (thème "papier ECG").
- `lib/` : la bibliothèque de graphiques (Plotly), stockée en local.
- `fonts/` : les polices, stockées en local.

Les signaux ECG sont **générés** par le programme (et volontairement simplifiés)
pour rester clairs et lisibles par des lycéens.

## Auteurs

Damien Belharet & Dima Husseini — Stage 2026, ENSEIRB-MATMECA.
