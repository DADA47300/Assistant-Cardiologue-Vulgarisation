import os
import subprocess
import sys
from bs4 import BeautifulSoup

PRENOMS = [
    "Eléa", "Paolina", "Romane", "Jeanne", "Lisa", "Amaïa", "Milena", "Marine",
    "Armand", "Florian", "Eliès", "Victor", "Rémi", "Adam", "Baptiste", "Clément",
    "Lucas", "Benjamin", "Clémentine", "Emma", "Pauline", "Line", "Manon", "Abigail",
    "Léa", "Timéo", "Noah", "Mathis", "Elio", "Gabriel", "Louis", "Amir", "Titouan",
    "Valentin",
]

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
SOURCE    = os.path.join(BASE_DIR, "diplome.html")
OUT_DIR   = os.path.join(BASE_DIR, "diplomes_imprimes")
TEMP_FILE = os.path.join(BASE_DIR, "_temp_diplome.html")

os.makedirs(OUT_DIR, exist_ok=True)

with open(SOURCE, encoding="utf-8") as f:
    html_source = f.read()

errors = []
for prenom in PRENOMS:
    soup = BeautifulSoup(html_source, "html.parser")
    span = soup.find("span", class_="nom")
    if span is None:
        print(f"[ERREUR] balise <span class='nom'> introuvable dans diplome.html")
        sys.exit(1)
    span.string = prenom

    with open(TEMP_FILE, "w", encoding="utf-8") as f:
        f.write(str(soup))

    safe = prenom.replace(" ", "_")
    out_pdf = os.path.join(OUT_DIR, f"diplome_{safe}.pdf")
    result = subprocess.run(
        ["weasyprint", TEMP_FILE, out_pdf],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"[ERREUR] {prenom}: {result.stderr.strip()}")
        errors.append(prenom)
    else:
        print(f"[OK] {prenom} → diplome_{safe}.pdf")

if os.path.exists(TEMP_FILE):
    os.remove(TEMP_FILE)

if errors:
    print(f"\n{len(errors)} erreur(s) : {', '.join(errors)}")
else:
    print(f"\n✅ {len(PRENOMS)} diplômes générés dans diplomes_imprimes/")
