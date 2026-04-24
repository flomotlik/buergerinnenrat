# Sortition-Algorithmus für Script-Nutzung

> Stand: 2026-04-24
> Ergänzung zu Reports 01–04 in diesem Ordner, speziell zu **Gap 2 (Stratifizierter Sampling-Algorithmus)** aus Report 04.

## TL;DR

- **Empfehlung:** `sortitionfoundation/stratification-app` — Python, GPL-3.0, aktiv gepflegt (Stand 2026-01-20), implementiert den Leximin-Algorithmus aus Flanigan et al., *Nature* 2021 ("Fair algorithms for selecting citizens' assemblies").
- Das Repo ist als Desktop-GUI konzipiert (Eel + PyInstaller-Executables), aber die Kern-Datei `stratification.py` ist eine **eigenständige Python-Library** (107 KB) und direkt importierbar — die GUI in `script.py` kann man ignorieren.
- Eingabe: zwei CSV-Dateien (`respondents.csv` + `categories.csv`). Ausgabe: Liste der ausgewählten IDs.
- Drei Algorithmen sind eingebaut: **Leximin** (empfohlen, fairste bekannte Methode), **Maximin**, **Nash-Welfare**, plus ein Legacy-Quoten-Pfad.
- **panelot.org** ist das gleiche Algorithmus-Ökosystem (Mit-Autor Paul Gölz), aber nur als Web-UI — kein öffentliches Repo, nicht für Script-Nutzung.

## 1. Optionen im Überblick

| Tool | Form | Algorithmus | Lizenz | Eignung für Script |
| --- | --- | --- | --- | --- |
| [`sortitionfoundation/stratification-app`](https://github.com/sortitionfoundation/stratification-app) | Python-Library + optionale Desktop-GUI | Leximin, Maximin, Nash, Legacy | GPL-3.0 | **Ja** — `stratification.py` direkt importierbar |
| [panelot.org](https://panelot.org/) | Web-UI | Leximin (Nature 2021) | unklar, kein Repo | Nein — nur manuelle Nutzung |
| [`sortitionfoundation/groupselect-app`](https://github.com/sortitionfoundation/groupselect-app) | Python | Subgruppen-Bildung innerhalb eines Panels | GPL-3.0 | Für Kleingruppen-Einteilung nach der Hauptauswahl, nicht für die Losung selbst |
| Eigenbau | — | frei | — | Nur wenn nachweisbarer Grund — Nature-Algorithmus ist bereits "state of the art" |

## 2. Wissenschaftlicher Hintergrund

- **Paper (Open Access):** Flanigan, B., Gölz, P., Gupta, A., Hennig, B., Procaccia, A. D. "Fair algorithms for selecting citizens' assemblies." *Nature* 596, 548–552 (2021). <https://www.nature.com/articles/s41586-021-03788-6>
- **Problem:** Stratifizierte Zufallsauswahl mit Quotenkorridoren ist **nicht trivial** — naive Quoten-Rejection-Sampling-Methoden sind entweder nicht quotenkonform **oder** haben drastisch ungleiche Auswahlwahrscheinlichkeiten pro Person.
- **Leximin-Kern:** Maximiere iterativ die *kleinste* Auswahlwahrscheinlichkeit unter allen Freiwilligen (lexikografisch) — bei Einhaltung aller Quotenkorridore. Ergebnis: nachweisbar fairste erreichbare Verteilung.
- **Mechanik:** gemischt-ganzzahlige lineare Programmierung (MIP, über `python-mip`) + konvexe Optimierung (`cvxpy`) + Pipage-Rounding zur Auswahl eines konkreten Panels aus der optimalen Verteilung.
- **Referenzen:** Sortition Foundation UK hat mit diesem Algorithmus 40+ Bürgerräte weltweit durchgeführt; in DE u.a. Teil des Konsortiums für den bundesweiten Bürgerrat Ernährung 2023/24.

## 3. Repo-Inventar `sortitionfoundation/stratification-app`

| Datei | Rolle |
| --- | --- |
| `stratification.py` (107 KB) | **Die Library** — Algorithmen, IO-Klassen, Haushalts-Check |
| `script.py` (12 KB) | Eel-basierte Desktop-GUI — für Script-Nutzung nicht nötig |
| `test_stratification.py` (20 KB) | Unit-Tests |
| `test_end_to_end.py` (3 KB) | E2E-Tests |
| `pyproject.toml` | `uv`-Projekt; Python ≥3.11, <3.13 |
| `web/` | HTML/JS/CSS für die Desktop-GUI |
| `fixtures/`, `docs/` | Beispieldaten, Dokumentation |

**Autoren:** Nick Gill, Brett Hennig (Sortition Foundation), Paul Gölz (Autor des Nature-Papers).

**Dependencies (Library-relevant):**
- `cvxpy==1.5.3` — konvexe Optimierung
- `mip==1.15.0` — Mixed Integer Programming (CBC-Solver out-of-the-box, Gurobi optional)
- `toml==0.10.2` — Settings
- *(nur für GUI:)* `eel`, `pyinstaller`
- *(nur für Google-Sheets-Eingabe:)* `gspread`, `oauth2client`

**Öffentliche API (`stratification.py`):**

```python
# IO-Klassen
class PeopleAndCatsCSV(PeopleAndCats):          # CSV-Eingabe
class PeopleAndCatsGoogleSheet(PeopleAndCats):  # Google-Sheets-Eingabe (optional)

# Konfiguration
class Settings: ...
class SelectionError(Exception): ...
class InfeasibleQuotasError(Exception): ...

# Algorithmen (Low-Level)
def find_distribution_leximin(...)
def find_distribution_maximin(...)
def find_distribution_nash(...)
def find_random_sample(...)             # Legacy-Quoten
def find_random_sample_legacy(...)

# Top-Level-Wrapper (empfohlen)
def run_stratification(src, settings, number_people_wanted, test_selection=False)
```

## 4. Eingabe-Format

### `categories.csv` — Stratifikations-Quoten

Definiert pro Stratifikations-Dimension (Kategorie) die Mindest- und Höchstzahl an Panel-Plätzen:

```csv
category,name,min,max
age_bracket,18-29,7,9
age_bracket,30-44,13,15
age_bracket,45-59,12,14
age_bracket,60-74,11,13
age_bracket,75+,5,7
gender,female,24,26
gender,male,24,26
gender,diverse,0,2
district,Innenstadt,8,10
district,Ehrenfeld,6,8
...
```

Regeln:
- Für jede Kategorie gilt: `sum(min) ≤ number_people_wanted ≤ sum(max)`
- Quoten werden aus Melderegister-Anteilen × Panel-Größe abgeleitet, typischerweise mit ±1 bis ±2 Personen Korridor
- Mehrere Kategorien werden **gleichzeitig** erfüllt (nicht hintereinander) — daher MIP

### `respondents.csv` — Rückmelder mit Merkmalen

Alle Personen aus Stufe 2 (die auf die Einladung geantwortet haben) mit ihren Stratifikations-Merkmalen:

```csv
nationbuilder_id,first_name,last_name,address,zip,age_bracket,gender,district,education
R0001,Anna,Müller,...,50667,30-44,female,Innenstadt,hoch
R0002,Bernd,Schulz,...,50933,45-59,male,Ehrenfeld,mittel
...
```

Wichtig:
- **Spaltennamen** in `respondents.csv` müssen mit den **Kategorien** in `categories.csv` übereinstimmen
- Ein ID-Feld ist Pflicht (per Konvention `nationbuilder_id`, konfigurierbar)
- Adress-Spalten ermöglichen den Haushalts-Dedup-Check (`check_same_address`) — sinnvoll, weil zwei Personen aus demselben Haushalt im Panel politisch problematisch sind

## 5. Minimales Script

```python
# scripts/buergerrat_sortition.py
from stratification import PeopleAndCatsCSV, Settings, run_stratification

settings = Settings(
    id_column="nationbuilder_id",
    check_same_address=True,
    check_same_address_columns=["address", "zip"],
    max_attempts=10,
    selection_algorithm="leximin",   # 'leximin' | 'maximin' | 'nash' | 'legacy'
    # weitere Felder siehe stratification.py class Settings
)

src = PeopleAndCatsCSV(
    category_file="categories.csv",
    respondents_file="respondents.csv",
)

number_people_wanted = 50
people_selected, output_lines = run_stratification(
    src, settings, number_people_wanted, test_selection=False,
)

with open("selected.csv", "w") as f:
    for person_id in people_selected:
        f.write(person_id + "\n")

with open("sortition.log", "w") as f:
    f.write("\n".join(output_lines))
```

> Hinweis: Die exakten `Settings`-Felder und ihre Defaults stehen in `stratification.py`. Vor produktivem Einsatz dort nachsehen und einmal mit Testdaten durchspielen — `fixtures/` enthält Beispiele.

## 6. Solver-Performance

- **CBC** (über `python-mip` standardmäßig gebündelt): reicht für Panels bis ~100 Personen und Rückmelder-Pools bis ~5.000 problemlos.
- **Gurobi**: akademische Lizenz gratis, kommerzielle kostenpflichtig; 10–100× schneller bei großen Instanzen. Nur nötig bei extrem großen bundesweiten Verfahren.
- **Reproduzierbarkeit:** Seed setzen (siehe Settings/Nature-Paper), Algorithmus-Version und Input-Hashes loggen — bei öffentlichen Bürgerräten wird die Losung teilweise live per Video-Stream durchgeführt.

## 7. Integration in den Bürgerrat-Workflow

Der Algorithmus deckt nur **Stufe 2** des Prozesses ab (Auswahl aus Rückmeldern). Drumherum bleibt:

| Schritt | Verantwortung |
| --- | --- |
| 1. Antrag Gruppenauskunft nach § 46 BMG | Stadt / Rechtsamt |
| 2. Melderegister-Stichprobe ziehen (z.B. 5.000 aus 300.000) | Einwohnermeldeamt liefert die Stichprobe randomisiert — die App erhält schon anonyme Daten |
| 3. Serienbrief mit Token erzeugen und per Post versenden | Eigenes Script (WeasyPrint / LaTeX) + Druck-/Versandpartner |
| 4. Rücklauf-Erfassung (Web-Formular, Selbstauskunft zu Bildung/Migration) | adhocracy+ oder separates Mini-Tool |
| 5. **Stratifizierter Los-Lauf auf Rückmeldern** | **`stratification-app`** |
| 6. Einladung der Finalen ins PRIVATE adhocracy+-Projekt | `apps/projects/forms.py:46-71` (Bulk-Invite-CSV) |
| 7. DSGVO-Löschung der Melderegister-Daten nach Prozessende | Eigenes Skript / Celery-Beat |

## 8. Rechtlicher Hinweis zum Merkmalsatz

Aus Report 03 (Teil A) — nicht alle Merkmale, die man stratifizieren will, darf man aus dem Melderegister ziehen:

| Merkmal | Aus § 46 BMG zulässig? | Wie erheben? |
| --- | --- | --- |
| Alter | ✅ | Melderegister (Stufe 1) |
| Geschlecht | ✅ | Melderegister (Stufe 1) |
| Anschrift / Stadtteil | ✅ | Melderegister (Stufe 1) |
| Staatsangehörigkeit | ✅ | Melderegister (Stufe 1) |
| Familienstand | ✅ | Melderegister (Stufe 1) |
| **Bildungsabschluss** | ❌ | Selbstauskunft (Stufe 2) |
| **Migrationshintergrund** | ❌ | Selbstauskunft (Stufe 2) |
| **Einkommen** | ❌ | Selbstauskunft (Stufe 2, heikel) |

→ **Konsequenz für das Script**: Die `respondents.csv` wird aus zwei Quellen zusammengeführt — Melderegister-Merkmale aus Stufe 1 + Selbstauskunfts-Merkmale aus Stufe 2. Die Library arbeitet mit beidem nahtlos, aber du musst den Merge sauber machen (über das Token-Feld).

## 9. Open Points

- **Panel-Selektions-Algorithmus der "Es geht LOS"-App** ist nicht öffentlich dokumentiert — ob sie auch Leximin oder etwas Eigenes verwenden, ist unklar (siehe Report 02 §2.1 + Unsicherheiten). Bei Nachfrage bei Demokratie Innovation e.V. mitklären.
- **`Settings`-Feld-Liste** habe ich in diesem Report nicht vollständig dokumentiert — bei tatsächlicher Umsetzung aus `stratification.py` lesen oder ein Test-CSV durchlaufen lassen.
- **GPL-3.0-Bindung**: Wenn der Output-Code (eigene Wrapper-Skripte) verteilt wird und `stratification` importiert, greift GPL. Für internes Kommunal-Tooling ist das unproblematisch; bei kommerziellem Weitervertrieb Rechts-Check.

## 10. Nächster konkreter Schritt

Ein Prototyp-Skript `scripts/buergerrat_sortition.py` (oder später in eine neue App `apps/buergerrat/` unter `sortition.py`) mit:

1. Lesen eines Test-`respondents.csv` (z.B. 500 synthetische Personen)
2. Kategorien-Definition mit 3–4 Dimensionen (Alter, Geschlecht, Stadtteil, Bildung)
3. Aufruf `run_stratification(..., selection_algorithm="leximin")`
4. Export der ausgewählten IDs + Audit-Log

Aufwand: 0.5–1 Tag bis lauffähig, plus Tests.

## Quellen

1. <https://github.com/sortitionfoundation/stratification-app> — Repository (geprüft 2026-04-24, zuletzt aktiv 2026-01-20)
2. <https://www.nature.com/articles/s41586-021-03788-6> — Flanigan et al., "Fair algorithms for selecting citizens' assemblies", *Nature* 2021
3. <https://panelot.org/> und `/about` — Schwesterprojekt Web-UI
4. <https://github.com/sortitionfoundation/groupselect-app> — Subgruppen-Bildung
5. <https://procaccia.info/wp-content/uploads/2022/06/repfair.pdf> — Procaccia et al., "Is Sortition Both Representative and Fair?"
6. <https://www.sortitionfoundation.org/services> — Sortition Foundation Services
7. Report 02 in diesem Ordner — für Alternativ-Kontext und "Es geht LOS"-Abgrenzung
8. Report 03 Teil C in diesem Ordner — für methodischen Kontext (Zwei-Stufen-Verfahren, OECD)
