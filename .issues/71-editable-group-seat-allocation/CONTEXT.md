# Design-Entscheidungen für #71 (Editierbare Gruppen-Sitz-Allokation)

Erfasst am 2026-05-04 via `/issue:discuss`.

## Decisions (locked — research/planner müssen folgen)

### Scope-Grenze: nur Stage-3-Override für die bestehende BR-Pipeline
- Diese Issue behandelt **ausschließlich** das Override der Sitz-Allokation in **Stage 3** (Panel-Ziehung aus Antwortenden) der bestehenden Bürgerinnenrat-Pipeline.
- Der vom User beschriebene **Parteitag-/Landesparteitag-Workflow** (sequenzielle Auswahl mit Ask-and-Replace, eine Person pro Slot anschreiben, bei Absage nächste ziehen) ist ein **fundamental anderer Pipeline-Typ** und passt nicht in dieses Issue.
- → **Neues Issue #73 anlegen**: "Sequenzielle Personenauswahl-Pipeline (Parteitag-Stil): pro Sitz eine Person, Absage → Replacement, Quoten als harte Vorgabe von Beginn." Siehe Abschnitt unten.

### Override-Granularität: 1-D Achsen-Override
- Override erfolgt pro **Achse** (Altersband ODER Bezirk ODER Geschlecht ODER …), nicht pro Stratum-Cell.
- UI-Pattern: User wählt eine Achse, sieht alle Werte dieser Achse mit Baseline/Override/Diff. Andere Achsen werden vom Solver auto-verteilt.
- N-D Cell-Override (z.B. "Männer 20–30 in Bezirk X = 5 Sitze") ist **explizit out-of-scope** für #71.

### Override-Semantik: ersetzt Bounds
- Bei aktivem Override für eine Achse: `min == max == override_value` pro Wert. Die min/max-Bounds werden überschrieben.
- UI: Bounds-Editor für die overridete Achse wird ausgeblendet (oder als read-only mit Hinweis "Override aktiv — siehe Override-Editor").
- Engine-Constraint: Override ist **harte** Constraint im LP, kein soft-prefer.

### Begründungs-Pflicht: hart
- Override-Toggle aktiviert ein Pflicht-Textfeld "Begründung".
- Validierung: **min. 20 Zeichen** non-whitespace.
- Speichern + Sign-Button **blockiert**, solange Begründung leer/zu kurz.
- Begründung ist Teil des Audit-Manifests und der Signatur (Override + Rationale + Timestamp werden gemeinsam signiert).

### Audit-Trail bleibt wie in ISSUE.md beschrieben
- `seat_allocation.baseline`, `seat_allocation.override`, `seat_allocation.override_rationale`, `seat_allocation.override_timestamp`, `seat_allocation.deviation` im Manifest.
- Signatur deckt diese Felder mit ab (kein nachträgliches Editieren ohne neue Signatur).

## Claude's Discretion (research darf hier explorieren)

- **UI-Pattern für die "Override aktivieren"-Toggle pro Achse**: separater Tab pro Achse, oder Akkordeon mit Override-Toggle pro Achse, oder modaler Override-Wizard.
- **Visualisierung des Diff** (Baseline | Override | Diff): Tabelle, Bar-Chart, Slider-mit-Marker. Mockup vor Implementierung.
- **Auto-Verteilung der nicht-overrideten Achsen**: wie sich der Solver verhält, wenn Override eine starke Verzerrung erzeugt. Vermutlich: Solver findet Maximin-optimal innerhalb des Override-Constraints; falls infeasible → klare Fehlermeldung mit Hinweis "Override und andere Bounds sind inkompatibel".
- **Dropdown-Hint statt Free-Text**: Vorschlag-Dropdown häufiger Begründungen ("Geschlechter-Parität", "Alters-Quote", "Geografische Repräsentation") **zusätzlich** zum Free-Text — als UX-Hilfe, aber nicht als Pflicht-Struktur. Optional.
- **Reset-Button-Position und -Wording**.
- **Quality-Metric `seat_allocation_drift`**: konkrete Berechnungs-Formel (L1 vs L2 vs max-deviation). Research soll Vorschlag mit Begründung machen.

## Deferred (out of scope für #71)

- **Parteitag-Workflow** (sequenzielle Auswahl, Replacement) → **neues Issue #73**.
- **Stage-1-Override** (Versand-Sample-Verzerrung): Wenn überhaupt, dann als separate Issue. Eingriff in Stage 1 widerspricht der Bevölkerungs-Repräsentativität schon vor dem Anschreiben — ist konzeptionell anders gelagert als das Stage-3-Quoten-Override.
- **N-D Cell-Override** für mehr-dimensionale Strata-Kombinationen.
- **Auto-Justierung** ("wie viel Sitze muss ich shiften, damit min 50% unter 50 erreicht wird?") — späteres Komfort-Feature.
- **Override-History / Undo-Stack** — nur "letzter Override + Reset", keine Versionierung.
- **Multi-User-Approval-Chain** für Override-Setzen.

## Korrektur: kein Spin-off-Issue nötig

Beim ursprünglichen `/issue:discuss`-Lauf hatte ich einen vermeintlich neuen Pipeline-Modus (Parteitag-Stil mit sequenzieller Auswahl + Status-Pflege pro Sitz) als Issue #73 vorgeschlagen. **Das war eine Über-Engineering-Fehleinschätzung.**

Korrektur (2026-05-04): Das Tool braucht **keine zwei Pipeline-Modi**. Bürgerinnenrat, Landeskonferenz und Parteitag nutzen alle dieselben drei Tool-Primitive: **Auswahl** (statistisch + Quoten), **Override** (#71), **Nachwahl** (#48 3b). Anschreib-/Antwort-Status pflegen Verfahrens-Begleiter:innen extern (eigene Excel-Tabelle), nicht im Tool.

→ #73 wurde als superseded geschlossen (GitHub #7), lokales Verzeichnis archiviert unter `.issues/archived/73-...-superseded/`.

#71 ist daher **kein BR-spezifisches Feature**, sondern eine **generische Override-Operation**, die für alle Use Cases gleich funktioniert. Der Override greift auf die Quoten-Konfig der Auswahl-Operation, unabhängig davon ob diese für BR-Stage-3 oder direkt-für-Parteitag aufgerufen wird.

## Bezug

- **Bezug zu #70**: Personenauswahl-Use-Case ist Treiber für Override-Feature. #71 ist generisch für alle Use Cases im Use-Case-Hub aus #70.
- **Bezug zu #72**: Excel-Upload ist orthogonal — beeinflusst Datei-Eingang, nicht die Quoten-Allokation.
- **Bezug zu #45/#46/#47/#48**: Override greift auf den Output der Auswahl-Operation (#45 für Stage-1, bestehender Maximin-Code für Stage-3) und vor dem Sign+Persist-Schritt (#46). Nachwahl (#48 3b) ist eine separate Operation und nicht von Override betroffen.
