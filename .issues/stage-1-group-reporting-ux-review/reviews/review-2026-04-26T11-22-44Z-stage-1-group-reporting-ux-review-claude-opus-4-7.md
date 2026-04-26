---
review_of: stage-1-group-reporting-ux-review
review_type: topic
review_mode: topic
review_topic: Stage 1 group reporting UX review
reviewed_at: 2026-04-26T11-22-44Z
tool: claude
model: claude-opus-4-7
duration_seconds: 572
---

# Stage 1 Group-Reporting UX Review

Reviewer: Claude (Opus 4.7) — UX, frontend, a11y angle
Scope: `apps/web/src/stage1/*`, `packages/core/src/stage1/reporting.ts`, `apps/web/src/index.css` print rules, `apps/web/tests/e2e/stage1.spec.ts`
Branch: `worktree-agent-ac76adcb`, head `bff9984`
Question: ist die UX in einer realen Verfahrens-Sitzung (Bürgermeister + Verwaltung + Gemeinderat an einem Bildschirm) tragfähig?

<review>

<findings>

<finding severity="high" id="H1">
  <title>Underfill-Liste ist falsch sortiert — Vergleichsfunktion stimmt nicht mit dem Kommentar überein</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:101-107</location>
  <description>
Der `underfills`-Memo behauptet "ranked by (target - actual) descending — biggest gaps first", aber die Vergleichsfunktion lautet `b.n_h_target - a.n_h_target - (a.n_h_target - a.n_h_actual - (b.n_h_target - b.n_h_actual))`. Ausmultipliziert: `2*b.target - 2*a.target + a.actual - b.actual` — das sortiert nach einer Mischung aus 2× target-Diff plus invertierter actual-Diff, nicht nach Soll-Ist-Lücke. Konsequenz im Group-Meeting: die "wichtigste" Zeile (das Stratum mit der größten Untererfüllung) erscheint nicht zwingend oben in der amber-Liste. Beispiel mit Soll/Ist je Stratum:
- A: Soll 5, Ist 1 → Lücke 4 → Score `2*5 - 2*5 + 1 - 1 = 0` (wenn allein gegen sich verglichen — irrelevant) — gegen B: Soll 10, Ist 9, Lücke 1 → `2*10 - 2*5 + 1 - 9 = 2` → B steht VOR A obwohl A die größere Lücke hat.
Das ist im Code kein Algorithmus-Bug (die Daten in `result.strata` sind korrekt), aber die UI lügt über die Reihenfolge. In einer Sitzung, in der die Gruppe darauf schaut "welche Strata haben am wenigsten Personen", ist das ein konkretes Vertrauensproblem.
  </description>
  <fix>
Ersetze die Sort-Funktion durch:
```ts
.sort((a, b) => (b.n_h_target - b.n_h_actual) - (a.n_h_target - a.n_h_actual))
```
Test: Vitest-Case mit den oben skizzierten A/B-Strata, der bestätigt dass A vor B steht.
  </fix>
</finding>

<finding severity="high" id="H2">
  <title>Stale Result nach Parameter-Änderung — alte Ergebnis-Sektion bleibt sichtbar, während Vorschau bereits neue Werte zeigt</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:142-165 (start), 220-373 (config sections), 375-578 (result section)</location>
  <description>
`output` wird nur in `start()` (`setOutput(null)` in Zeile 148, dann `setOutput(out)` in Zeile 159) und `handleFile()` (Zeile 111) zurückgesetzt. Wenn die Gruppe nach einem Lauf die Stichprobengröße N ändert, eine Achse umschaltet oder einen neuen Seed wählt, dann zeigt:
- der Vorschau-Block die NEUE Allokation (Zeile 315 `Show when={preview().result !== null}`),
- die Ergebnis-Sektion (Zeile 375 `Show when={output()}`) noch das ALTE Ergebnis mit altem Seed im Footer (Zeile 439).

In einer Group-Meeting-Situation, in der drei Personen den Bildschirm lesen, ist das eine echte Quelle für "ich glaube wir schauen auf widersprüchliche Zahlen, wer hat recht?". Auch der Audit-Download-Button verweist auf das alte Ergebnis — wenn jemand nach einem Parameter-Wechsel auf "Audit herunterladen" klickt, bekommt er einen Audit, der nicht zur sichtbaren Vorschau passt.
  </description>
  <fix>
Eine `createEffect`, die `setOutput(null)` aufruft, sobald `targetN()`, `selectedAxes()`, `seed()` oder `parsed()` sich ändern. Alternativ: visuell die Ergebnis-Sektion mit "veraltet — bitte erneut Ziehen" überlagern, sobald ein Eingabe-Signal sich seit dem letzten Lauf verändert hat. Variante 1 (komplett verstecken) ist konservativer und entspricht dem Verhalten von Stage 3.
  </fix>
</finding>

<finding severity="high" id="H3">
  <title>Print-Protokoll enthält weder Signatur noch Audit-Hash — die ausgedruckte Seite ist als Verfahrens-Protokoll nicht beweiskräftig</title>
  <location>apps/web/src/index.css:12-51, apps/web/src/stage1/Stage1Panel.tsx:436-440 (was tatsächlich in der DOM steht)</location>
  <description>
Die einzige Signatur-Information im DOM ist `Seed: <span class="font-mono">{out().signedAudit.doc.seed}</span>` (Zeile 439-440). Es gibt keinen sichtbaren `signature`, keinen `public_key`, kein `input_csv_sha256`. Der Markdown-Bericht (`packages/core/src/stage1/reporting.ts:281-291`) enthält Signatur, Public Key und Algorithmus — die HTML-Druckansicht NICHT. Damit ist der Workflow inkonsistent: das Tool sagt der Gruppe "die Auswahl ist signiert und nachvollziehbar", aber das Stück Papier, das in der Sitzung abgeheftet wird, hat von dieser Signatur keine Spur. Akzeptanz-Kriterium aus Issue-Brief ("Print version actually produces a usable group protocol") ist verletzt.

Zusätzlich: die Print-CSS blendet `[data-testid='stage1-bmg-hint']` aus (Zeile 17), entfernt also die Quellen-Citation für §46 BMG. Für ein archivfähiges Protokoll wäre genau die Quellen-Citation hilfreich.
  </description>
  <fix>
Im Result-Block einen sichtbaren Signatur-Footer rendern (analog zur Markdown-Section "## Signatur"), der mindestens enthält:
```
Signatur: {algo} {signature[:16]}…
Öffentlicher Schlüssel: {pubkey[:16]}…
Eingabedatei-Hash (SHA-256): {sha256[:16]}…
Erstellt am: {timestamp_iso}
```
Optional: per CSS `display: none` im Bildschirm-Modus, `display: block` im `@media print` — so klemmt es nicht den Bildschirm zu. Plus: BMG-Hinweis im Print NICHT ausblenden (nur das amber-Styling abnehmen).
  </fix>
</finding>

<finding severity="high" id="H4">
  <title>Seed-Default ist Unix-Sekunde, der Hint sagt aber "in der Sitzung gemeinsam wählen" — Default und Anweisung widersprechen sich</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:23-25 (defaultSeed), 277-298 (Eingabe), 299-309 (Hinweis-Aside)</location>
  <description>
Default-Seed ist `Math.floor(Date.now() / 1000)`, also z.B. `1714134000`. Dieser Wert wird beim Mount sofort in das `<input type="number">` gesetzt (Zeile 50). Daneben steht `(Default)` als Status-Label (Zeile 295-297). Direkt darunter steht der amber Hinweis (Zeile 299-309): "Wählen Sie den Seed-Wert gemeinsam in der Verfahrens-Sitzung (z.B. eine Zahl, die alle Anwesenden vereinbaren — Lottozahlen, Datum, Würfelwurf)". 

Das Tool behauptet, dass der Default ein Tech-Detail ist und die Gruppe einen eigenen Wert wählen soll — präsentiert aber gleichzeitig den Default als "scheint OK". Eine schnelle Verwaltungsmitarbeiter:in im Meeting wird auf "Versand-Liste ziehen" klicken, ohne den Default zu überschreiben. Damit ist die im Hinweis benannte Schutzfunktion ("verhindert, dass die Auswahl unbemerkt durch Probieren verschiedener Seeds beeinflusst werden kann") faktisch nicht aktiv: die Sitzung lässt einen Wert stehen, den eine Person zur Click-Zeit kennt.

Das ist ein Spannungsfeld zwischen "App muss vorgeführbar sein, also etwas drinstehen" und "Nutzer:in soll bewusst handeln". Aktuell führt das Design zu Default-Akzeptanz, was den Audit-Anspruch unterläuft.
  </description>
  <fix>
Drei Optionen, eine davon wählen:
1. **Leerer Seed-Default + Run-Block bis Eingabe.** Initialwert `null`, Placeholder `"z.B. 7"`, Run-Button bleibt disabled bis ein Wert eingegeben ist. `seedSource` ist dann immer `'user'`. Aufwand klein, kommuniziert klar dass die Wahl Pflicht ist.
2. **Default behalten, aber Run-Button-Label ändern, wenn Default-Seed aktiv ist.** "Mit Default-Seed ziehen (nicht in Sitzung vereinbart)" vs. "Mit vereinbartem Seed ziehen". Visuell auffällig genug, dass die Gruppe es bemerkt.
3. **Default = leer, "Würfeln"-Button**. Alternativ ein Button "Zufallszahl in der Sitzung erzeugen" der eine Zahl zieht und sichtbar in das Feld setzt — die Gruppe sieht den Würfelwurf und akzeptiert ihn explizit.
Empfehlung: Option 1 — am ehrlichsten zum Hint.
  </fix>
</finding>

<finding severity="high" id="H5">
  <title>Bar-Chart unterscheidet Soll vs. Ist nur durch Farbe — kein Muster, keine SVG-`<title>`-Elemente, Legende erst nach dem Chart</title>
  <location>apps/web/src/stage1/AxisBreakdown.tsx:73-101 (rect/text), 108-117 (Legende)</location>
  <description>
- Die zwei Balken sind `fill="#94a3b8"` (Soll, slate-400) und `fill="#3b82f6"` (Ist, blue-500). Keine SVG-Patterns, keine Beschriftung im Balken selbst, keine `<title>`/`<desc>`-Elemente, nur ein generisches `aria-label="Verteilung der Achse {axis}"` auf dem `<svg>` (Zeile 55). Screen-Reader hört "Verteilung der Achse district" und sonst nichts — keine Werte, keine Anzahl Strata, keine Underfill-Hinweise.
- Für Rot-Grün-Schwächen ist Slate-Grau vs. Blau zwar OK, aber für Gelb-Blau-Schwäche (Tritanopie) und für Schwarz-Weiß-Druck werden die Balken praktisch nicht unterscheidbar. Print-CSS forciert `color: #000`, was SVG-`fill` zwar nicht ändert (CSS `color` ≠ SVG `fill`-Attribut), aber auf Schwarz-Weiß-Druckern landen `#94a3b8` und `#3b82f6` als ähnlich-grauer Mid-Tone. 
- Die Legende (Zeile 108-117) steht UNTER dem Chart und ist mit `print:hidden` markiert (Zeile 109) — im Druck verschwindet die Legende komplett, dann sind die zwei Balken-Reihen gar nicht zuordenbar.
  </description>
  <fix>
1. SVG `<rect>`-Elemente bekommen `<title>`-Kinder (`<rect>...<title>Soll: 12 Personen</title></rect>`) — Tooltip + Screen-Reader-Lesung.
2. SVG-Wrapper bekommt `<desc>` mit kompakter Tabular-Zusammenfassung der Buckets ("3 Werte: weiblich Soll 25 Ist 24 Pool 250; männlich Soll 24 Ist 24 Pool 248; divers Soll 1 Ist 1 Pool 12").
3. Soll-Balken bekommt SVG-Pattern (gestreift) statt nur Farbe — print-tauglich, colorblind-tauglich.
4. Legende NICHT mit `print:hidden` versehen, sondern im Print mit grauem Border lassen.
5. Inline-Beschriftung pro Balken ergänzen: kleines Label "Soll" / "Ist" links neben den Balken (statt nur in der Legende).
  </fix>
</finding>

<finding severity="high" id="H6">
  <title>Stage 1 Upload hat keine Datei-Vorschau — die Gruppe sieht nicht, was sie hochgeladen hat</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:192-218 (Step 1) vs. apps/web/src/csv/CsvImport.tsx:85-121 (Stage 3 Vorschau-Tabelle)</location>
  <description>
Stage 1 zeigt nach Upload nur eine Zeile: "{N} Zeilen geladen ({M} Spalten, ...-getrennt, Encoding ...)". Stage 3 (`CsvImport.tsx:85-121`) zeigt eine 10-Zeilen-Vorschautabelle, in der jede Spalte sichtbar ist und die Mappings überschrieben werden können. Im Group-Meeting will die Gruppe verifizieren "ja, das ist die richtige Datei, die Spalten sind die erwarteten" — Stage 1 verlangt blindes Vertrauen.

Folge: wenn die hochgeladene CSV versehentlich die falsche Datei ist (z.B. ein Test-Dump statt das aktuelle Melderegister), wird der Fehler erst nach dem Lauf bemerkt — wenn der Gemeinderat schon den Audit-Hash für seine Sitzungsnotizen aufgeschrieben hat.
  </description>
  <fix>
Nach dem `pool-summary`-`<p>` (Zeile 206) eine kompakte Vorschau-`<table>` mit den ersten 5 Zeilen einbauen — gleicher visueller Aufbau wie `csv-preview` in CsvImport.tsx, aber ohne das Mapping-Dropdown. Optional ein Toggle "Vorschau zeigen/ausblenden" mit Default "zeigen" für Group-Meeting-Modus.
  </fix>
</finding>

<finding severity="high" id="H7">
  <title>"Stratum-Abdeckung" als Card-Headline ist Statistik-Jargon — Verwaltungs-Mitarbeiter:in versteht das nicht ohne Erklärung</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:399-411 (Card-Label und Wert), packages/core/src/stage1/reporting.ts:233 (gleiche Terminologie im Markdown)</location>
  <description>
Die mittlere Karte heißt "Stratum-Abdeckung" und zeigt "12 / 15" mit Untertitel "80.0 % der Strata mind. 1 Person". Drei Begriffe in einem Sub-Sub-Label, von denen "Stratum" und "Strata" Statistik-Jargon sind. CLAUDE.md sagt explizit "wenn Verwaltungs-Mitarbeiter:in (think city-clerk education level)..." — diese Person erkennt "Stratum" nicht. Im UI gibt es keine Erklärung, kein Tooltip, kein Glossar.

Vergleich mit Stage 3: dort steht "Min-Marginale", "Max-Marginale", "Komitees" (`RunPanel.tsx:159-179`) — auch alles Jargon, aber dort ist der primäre Nutzer der/die Verfahrensbegleiter:in (kennt Maximin), während Stage 1 explizit für Verwaltung gebaut ist.
  </description>
  <fix>
Card-Label umbenennen: "Gruppen abgedeckt" oder "Erfasste Gruppen". Untertitel: "12 von 15 Bevölkerungsgruppen wurden gezogen". Im Hover/Tooltip oder als kleines `(?)`-Icon: "Eine Gruppe ist eine Kombination der gewählten Achsen, z.B. (Bezirk Zentrum, weiblich, 25–34 Jahre)." Gleiches Refactoring im Markdown-Bericht und in der Underfill-Section ("Unterbesetzte Gruppen" statt "Strata").
  </fix>
</finding>

<finding severity="medium" id="M1">
  <title>N-Eingabe hat keine `max`-Constraint — Validierung erst über die Vorschau-Fehlermeldung</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:262-276</location>
  <description>
`<input type="number" min="1">` akzeptiert beliebig große Zahlen. Erst die Vorschau (`Stage1Panel.tsx:60-69`) ruft `previewAllocation` auf, das wirft, und der Fehler erscheint im `stage1-preview-error`-`<p>` weiter unten. In einer Sitzung mit Projektor sieht das so aus: die Gruppe tippt "5000" für einen 500er-Pool, die Eingabe wird akzeptiert, der Run-Button bleibt aktiviert (`canRun()` Zeile 139-140 prüft nur `targetN > 0`), und erst beim Klick auf Ziehen kommt ein roter Block. Plus: der Run-Button selbst zeigt keinen Hinweis ("disabled wegen N > Pool").
  </description>
  <fix>
1. `<input ... max={parsed()?.rows.length}>` setzen — Browser-native Validierung mit Stepper-Cap.
2. `canRun()` zu `parsed() !== null && targetN() !== null && (targetN() ?? 0) > 0 && (targetN() ?? 0) <= (parsed()?.rows.length ?? 0) && !running()` ergänzen.
3. Direkt unter dem N-Input einen kleinen Hinweis "max. {pool.rows.length} (Pool-Größe)" rendern, sobald Pool geladen ist.
  </fix>
</finding>

<finding severity="medium" id="M2">
  <title>Filenames enthalten keinen Verfahrens-Namen — `versand-1714134000.csv` ist kein archivierbarer Dateiname</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:170 (CSV), 177 (Audit), 187 (Markdown); sortition-tool/08-product-redesign.md:48-58 (Verfahren-Konzept)</location>
  <description>
Die generierten Dateinamen sind `versand-{seed}.csv`, `versand-audit-{seed}.json`, `versand-bericht-{seed}.md`. Der `seed` ist eine Unix-Sekunde mit zehn Ziffern. Drei Probleme:

1. Im Verzeichnis der Verwaltung landen dann z.B. `versand-1714134000.csv`, `versand-1714220400.csv` — nicht zuordenbar zu einem Verfahren ohne Cross-Lookup.
2. Wenn der Seed in der Sitzung manuell gewählt wurde (z.B. `7`), wird die Datei `versand-7.csv` heißen — kollidiert sehr wahrscheinlich mit anderen Verfahren.
3. Das Produkt-Konzept (`08-product-redesign.md:48-58`) spricht explizit von `verfahren-{name}.json` als State-Datei. Die Stage-1-Outputs sollten denselben Namespace haben.

Im Group-Meeting fragen die Anwesenden "wie heißt unser Verfahren?" — das Tool fragt das nirgends.
  </description>
  <fix>
In Step 1 (oder Step 0) ein Eingabefeld "Verfahrens-Bezeichnung (für Dateinamen)" mit Default "versand" einbauen, kebab-case-validiert (regex `[a-z0-9-]+`). Die Eingabe wird zu `{verfahrensname}-{seed}.csv` etc. zusammengebaut. Bonus: derselbe Name landet im Markdown-Header an der "# Versand-Auswahl — Bericht"-Zeile, statt der Hardcode-Headline (`reporting.ts:216`).
  </fix>
</finding>

<finding severity="medium" id="M3">
  <title>Visuelle Inkonsistenz mit Stage 3 — Tab-Wechsel fühlt sich wie zwei verschiedene Tools an</title>
  <location>apps/web/src/App.tsx:64-99 (Tab-Switcher und Stage 3 Workflow-Header), apps/web/src/stage1/Stage1Panel.tsx vs. apps/web/src/csv/CsvImport.tsx + run/RunPanel.tsx</location>
  <description>
Mehrere Patterns weichen ohne erkennbaren Grund ab:

- **Upload-Pattern**: Stage 1 hat ein nacktes `<input type="file">` (Zeile 195-203), Stage 3 hat eine Drag-and-Drop-Zone mit gestricheltem Border (`CsvImport.tsx:55-71`).
- **Mapping-Schritt**: Stage 1 überspringt die Mapping-UI komplett — die CSV-Header werden direkt als Achsen verwendet. Stage 3 verlangt explizites Mapping. Wenn Verwaltungs-Mitarbeiter:in zuerst Stage 3 nutzt und dann zu Stage 1 wechselt, wirkt der fehlende Mapping-Schritt wie ein "vergessenes Feature".
- **Seed-Default**: Stage 1 = `Math.floor(Date.now()/1000)` ergibt 10-stellige Zahl (`Stage1Panel.tsx:23-25`). Stage 3 = `Math.floor(Math.random() * 0x7fffffff)` ergibt bis zu 10-stellige Zufallszahl (`RunPanel.tsx:12`). Verschiedenes Verhalten, gleicher Input-Typ — unklar warum.
- **Run-Button-Label**: Stage 1 = "Versand-Liste ziehen" (Stage1Panel.tsx:369), Stage 3 = "Lauf starten" (RunPanel.tsx:94). Tab-Labels nutzen "ziehen" für beide ("Versand-Liste ziehen", "Panel ziehen"), aber innerhalb Stage 3 ist der Button anders.
- **Ergebnis-Layout**: Stage 1 nutzt 3 große Cards + Bar-Charts + Tabelle. Stage 3 nutzt eine flache Stats-Liste + Quoten-Tabelle + Personen-Tabelle (`RunPanel.tsx:153-241`). Andere Hierarchie, andere Visualisierungen, kein gemeinsamer Stil.

Im Group-Meeting wird die Gruppe oft beide Stages durchlaufen (Stage 1 für Versand, Stage 3 nach Antworten). Heute wirken die Tabs wie zwei unabhängige Apps, was die Lernkurve doppelt belastet.
  </description>
  <fix>
Mindestens drei Quick-Wins:
1. Drag-Drop-Upload aus `CsvImport.tsx` als gemeinsame `<CsvDropzone>`-Komponente extrahieren und in Stage 1 einbauen.
2. Seed-Default-Logik in einer Util-Funktion teilen (Stage 3 sollte ebenfalls den Hint "in der Sitzung wählen" bekommen — derselbe Audit-Anspruch).
3. Run-Button-Labels harmonisieren ("Lauf starten — Versand-Liste" / "Lauf starten — Panel" oder beide nur "Ziehen").
Mittelfristig: gemeinsame `<ResultLayout>`-Komponente mit Slots für Cards / Charts / Table.
  </fix>
</finding>

<finding severity="medium" id="M4">
  <title>Run-Verhalten bei 0 ausgewählten Achsen ist still — keine Warnung, dass es eine einfache Zufallsstichprobe ohne Stratifikation wird</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:139-140 (canRun), 245-256 (AxisPicker mit ohne Pflichtfeld), packages/core/src/stage1/stratify.ts:34-40 (degenerierter Single-Bucket-Pfad)</location>
  <description>
`canRun()` prüft nur Pool + N > 0 + nicht-läuft. Wenn die Gruppe alle Achsen abwählt, ist `selectedAxes() === []` — der Algorithmus läuft als einfache Zufallsstichprobe ohne Stratifikation (sortify.ts:34-40 fängt das ab). Die UI sagt das nirgends explizit. Die Vorschau zeigt "1 Strata, Soll-Summe N" und ein einzelnes "(gesamt)"-Zeile — die Gruppe denkt evtl., dass das ein Fehler ist oder dass Stratifikation aktiv ist.

Auch der umgekehrte Fall: wenn die Heuristik 0 empfohlene Achsen findet (z.B. CSV mit Spalten "name, anschrift, email"), sind alle Checkboxen abgewählt, kein "vorgeschlagen"-Badge irgendwo — und kein Hinweis "Keine empfohlenen Achsen erkannt — bitte manuell wählen oder Stichprobe ohne Stratifikation laufen lassen".
  </description>
  <fix>
1. Bei `selectedAxes().length === 0` direkt unter dem AxisPicker einen amber Hinweis: "Keine Stratifikation gewählt — die Stichprobe wird rein zufällig aus dem gesamten Pool gezogen (Simple Random Sample). Bestätige, dass du das wirklich willst."
2. Bei `defaultAxes().length === 0` (Heuristik findet nichts) einen separaten Hinweis: "Keine bekannten Achsen-Spalten erkannt (`district`, `gender`, `age_band`). Bitte manuell wählen, falls Stratifikation gewünscht."
  </fix>
</finding>

<finding severity="medium" id="M5">
  <title>Run-Button kann unter dem Vorschau-Block off-screen verschwinden — Gruppe sieht den Call-to-Action nicht</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:316-371 (Vorschau-Block + AxisBreakdown-For-Loop), 361-371 (Button)</location>
  <description>
Der Vorschau-Block (Zeile 315-360) rendert für jede gewählte Achse einen `AxisBreakdown` per `<For>`. Bei drei Achsen (Default kleinstadt-Fixture: district mit 4 Werten, gender mit 3, age_band mit 6) ist das gut 13 Zeilen × 28px = ~400 px plus Padding. Plus die Warning-Section, plus der Soll-Summe-Header. Auf einem 13"-Laptop oder kleinem Projektor ist der "Versand-Liste ziehen"-Button (Zeile 362) bereits below-the-fold, sobald die Gruppe die Vorschau-Block sieht.

Konsequenz: die Gruppe scrollt durch die Vorschau, vergisst den Button am Ende, oder klickt ihn ungesehen. Schlechter Affordance-Anchor für die wichtigste Aktion.
  </description>
  <fix>
Den Button entweder oberhalb der Vorschau (zwischen Seed-Hint und Vorschau-Block) oder als sticky-Footer (`position: sticky; bottom: 0; background: white; border-top`) platzieren. Sticky-Variante hat den Vorteil, dass die Vorschau scrollbar bleibt und der Button immer sichtbar ist.
  </fix>
</finding>

<finding severity="medium" id="M6">
  <title>Print-Output bei vielen Strata explodiert — `details > *` wird komplett expandiert, eine 200-Zeilen-Tabelle landet auf Papier</title>
  <location>apps/web/src/index.css:33-38, apps/web/src/stage1/Stage1Panel.tsx:498-541 (collapsible details + Tabelle)</location>
  <description>
Print-Regel: `.stage1-report details > *:not(summary) { display: block !important; }` — erzwingt das Auflisten des kompletten Cross-Product. Bei axes=[district(10) × gender(3) × age_band(6) × education(5)] = bis zu 900 Strata. Pool-Sample mit 6.000 Zeilen kann durchaus 400-500 occupied Strata haben. Gedruckt sind das 5-10 A4-Seiten reine Tabelle.

Im Group-Meeting will die Gruppe ein 1-2 Seiten Protokoll. Die heutige Lösung schießt darüber hinaus.
  </description>
  <fix>
Print-Regel umkehren: das `details`-Element NICHT zwangs-expandieren. Stattdessen einen separaten kompakten Print-Block einfügen, der nur die Marginal-Aggregate (per Achse) und die top-N underfilled Strata zeigt — die Cross-Product-Tabelle gehört in den Markdown-Bericht oder in die Audit-JSON, nicht ins Sitzungsprotokoll. Konkret:
```css
.stage1-report details { display: block !important; }
.stage1-report details > summary { display: none !important; }
.stage1-report details > *:not(summary) { display: none !important; }
```
plus einen extra `<section class="print-only">` in `Stage1Panel.tsx`, der nur Cards + AxisBreakdowns + Underfill-Liste enthält.
  </fix>
</finding>

<finding severity="medium" id="M7">
  <title>BMG-Hint und Seed-Hint sind beide amber — visueller Anxiety-Boost ohne Anlass</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:222-243 (BMG-Hint), 299-309 (Seed-Hint)</location>
  <description>
Zwei amber-Border + amber-Background-Blöcke direkt nacheinander. Amber/Gelb signalisiert in den meisten UI-Konventionen "Warnung" oder "Achtung" (siehe auch wie es in Stage1Panel.tsx selbst verwendet wird: Underfill-Section ist amber, Vorschau-Warnung ist amber). Der BMG-Hint ist aber INFORMATION ("hier sind die rechtlichen Pflichten"), keine Warnung. Der Seed-Hint ist HINWEIS ("denkt an gemeinsame Wahl"), nicht "etwas ist schief".

Im Group-Meeting wirken zwei amber Blöcke vor dem ersten Klick wie "das Tool warnt mich vor zwei Sachen" — Vertrauensverlust ohne Ursache.
  </description>
  <fix>
BMG-Hint auf neutrales Slate-50 mit slate-300-Border umstellen — bleibt visuell abgesetzt aber ohne Warnungs-Konnotation. Amber-Codierung nur für: Vorschau-Underfill-Warnung, Result-Underfill-Liste, Underfill-Card. Seed-Hint kann ebenfalls neutral sein, oder mit Info-Icon (`<svg>` ℹ︎) statt Farbcode arbeiten.
  </fix>
</finding>

<finding severity="medium" id="M8">
  <title>Vorschau wird auf jedem N-Tastenanschlag neu berechnet — bei großem Pool hängt die UI</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:60-84 (createMemo für preview + previewMarginals), 269-275 (onInput ohne Debounce)</location>
  <description>
`preview` ist ein `createMemo`, das auf `parsed()`, `targetN()`, `selectedAxes()` reagiert. `previewAllocation()` macht `bucketize()` (O(N)) + sortiert die Keys + ruft `largestRemainderAllocation()` mit O(K)-Sort. Bei N=20.000 Pool und Tippen von "30000" sind das 5 Tastenanschläge × ~50ms = ~250ms blockierende Solid-Updates. Zusätzlich `previewMarginals` baut `marginalAggregates` auf jedem Tastenanschlag. Auf einem schwachen Verwaltungs-Laptop fühlt sich das Eingabefeld klebrig an.

Issue-Kontext (`07-two-stage-workflow-analysis.md:49-55`) sagt aber explizit "Stage 1 ist für 6.000-20.000 Pools gedacht, sub-100ms" — also genau die Dimension, in der das jetzt schon spürbar wird.
  </description>
  <fix>
1. `targetN`-Update mit `setTimeout` (~150ms debounce) hinter ein zweites Signal `targetNDebounced` setzen, das die Vorschau triggert. `targetN` selbst bleibt für die Eingabe reaktiv.
2. ODER: Vorschau erst auf `onChange` (= blur) statt `onInput` neu berechnen.
Alternative: Bucketize-Cache nach `axes.join('|')` pro Pool memoizen, damit nur die Allokation pro Tastenanschlag läuft, nicht das Bucketize.
  </fix>
</finding>

<finding severity="medium" id="M9">
  <title>Es gibt keine "andere CSV laden / zurücksetzen"-Aktion — sobald die Gruppe die falsche Datei hochgeladen hat, ist der Workflow steckend</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:109-122 (handleFile setzt überall, aber kein Reset-Pfad)</location>
  <description>
Wenn die Gruppe nach dem Upload merkt "das war die falsche Datei", muss sie:
1. den File-Input erneut ansprechen (Browser-Native: dieselbe Datei zweimal löst `onChange` nicht aus, andere Datei tut es).
2. Es gibt keinen sichtbaren "Andere CSV wählen"-Button.
3. Es gibt keinen "Verfahren zurücksetzen"-Button. Pool, Axes, N, Seed, Result behalten ihre Werte über alle Iterationen.

Im Group-Meeting passiert "wir nehmen die andere Datei" oft (z.B. das Melderegister vom letzten Quartal vs. das aktuelle). Aktuell muss man die Browser-Seite neu laden — beleidigt das Vertrauen ("warum funktioniert eine offensichtliche Aktion nicht").
  </description>
  <fix>
Neben dem File-Input ein "Andere Datei wählen"-Button (sekundär gestylt) der `setParsed(null); setFile(null); setOutput(null); setError(null); setTargetN(null); setSelectedAxes([]); setDefaultAxes([])` aufruft und den File-Input clear-t. Optional: eine "Verfahren neu starten"-Aktion am Boden der Result-Sektion, die alles zurücksetzt aber den Seed-Default-Wert beibehält.
  </fix>
</finding>

<finding severity="medium" id="M10">
  <title>Audit-JSON-Button-Label "Audit-JSON herunterladen" ist Tech-Sprache — Verwaltung kennt JSON nicht</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:553-559</location>
  <description>
"JSON" bedeutet für Verwaltungs-Mitarbeiter:in nichts. Auch "Audit" ist primär ein Wirtschaftsprüfer-Begriff. Der eigentliche Wert ("signiertes Protokoll, das die Auswahl unbestreitbar macht") wird nicht kommuniziert.

Vergleich Stage 3: dort steht "Audit-JSON exportieren (Ed25519)" (`RunPanel.tsx:255-256`) — noch technischer, gleicher Mangel. Aber Stage 1 ist der primäre Verwaltungs-Touchpoint.
  </description>
  <fix>
Button-Label: "Signierte Quittung (JSON)" oder "Quittung mit Signatur (.json)". Bonus: einen kleinen Helper-Text unter der Button-Reihe: "CSV ist die Versand-Liste. Bericht ist das Sitzungsprotokoll. Signierte Quittung beweist, welche Personen wann gezogen wurden — bei Streit relevant."
  </fix>
</finding>

<finding severity="low" id="L1">
  <title>AxisBreakdown-Docstring sagt "side-by-side bars", Implementierung stapelt vertikal</title>
  <location>apps/web/src/stage1/AxisBreakdown.tsx:11-13 (Doc), 75-91 (rect-Layout)</location>
  <description>
Doc-Kommentar: "each axis-value gets one row with two side-by-side bars (Soll grey, Ist blue)". Tatsächlich rendert der Code beide Balken bei `x={120}` und stapelt sie vertikal über `y+2` (Soll) und `y+13` (Ist). Das ist visuell sinnvoll — pro Axis-Value ein vertikales Mini-Bar-Pair — aber der Kommentar führt in die Irre. Future-Reviewer (oder LLMs) lesen die Doc und suchen einen Bug, der keiner ist.
  </description>
  <fix>
Doc-Kommentar präzisieren: "each axis-value gets one row with two stacked bars (Soll grey above, Ist blue below)" oder den Code auf echte side-by-side umbauen (zwei x-Positionen, halbe Breite). Stacked passt visuell besser — Doc anpassen.
  </fix>
</finding>

<finding severity="low" id="L2">
  <title>Markdown-Bericht enthält keinen Verfahrens-Namen, hat statisches "Versand-Auswahl — Bericht"</title>
  <location>packages/core/src/stage1/reporting.ts:216</location>
  <description>
Hardcoded `lines.push('# Versand-Auswahl — Bericht');`. In einem Aktenordner mit zehn Verfahren sind alle Berichte gleich betitelt. Das Markdown-Format ist genau dafür da, dass die Datei sich selbst beschreibt.
  </description>
  <fix>
Wenn M2 (Verfahrens-Name als Eingabe) umgesetzt wird, Audit-Doc um `verfahren_name` erweitern und in Reporting nutzen: `# Versand-Auswahl — ${audit.verfahren_name ?? 'unbenannt'}`. Bis dahin: zumindest Datum aus `timestamp_iso` in den Titel ziehen.
  </fix>
</finding>

<finding severity="low" id="L3">
  <title>Coverage-Card bei totalStrata=0 zeigt "0 / 0" mit em-dash-Suffix — degenerierter SRS-Lauf wirkt fehlerhaft</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:393-415, packages/core/src/stage1/reporting.ts:108 (NaN bei /0)</location>
  <description>
Wenn `axes=[]` (degenerated SRS), entsteht ein "(gesamt)"-Stratum mit `key={}`. `coverageMetric` zählt das mit (totalStrata=1, coveredStrata=1 wenn was gezogen wurde). Coverage-Card zeigt dann "1 / 1 — 100.0 % der Strata mind. 1 Person". Für den Nutzer ohne Stratifikation ist diese Karte komplett bedeutungslos und das "100 %"-Signal lügt fast — es gibt nur ein Stratum, das ist trivial.
  </description>
  <fix>
Wenn `selectedAxes().length === 0`, die Coverage-Card und die Underfill-Card ausblenden (oder den Header durch "Stratifikation deaktiviert" ersetzen). Cards-Grid wird dann zu einer einzigen "Gezogen"-Card, was korrekt den Tatbestand widerspiegelt.
  </fix>
</finding>

<finding severity="low" id="L4">
  <title>SVG-Achsen-Beschriftung kann bei langen Werten überlappen — kein Tooltip, kein truncation</title>
  <location>apps/web/src/stage1/AxisBreakdown.tsx:65-73 (Label-Spalte), 92-101 (Wert-Label)</location>
  <description>
`text x={0}` rendert den Achsen-Wert (z.B. `01-zentrum-bezirk-am-flussufer` als Stadt-Bezirksnamen) — feste 120 SVG-Einheiten Breite stehen zur Verfügung (`x={120}` Bar-Position). Bei langen Bezirksnamen oder Spalten-Werten ("Hauptschulabschluss", "Migrationshintergrund-Türkisch") läuft das Label in den Bar-Bereich rein. Kein `text-overflow`, kein `<title>`-Tooltip.

In realen Melderegister-Daten passiert das. Stadt-Wien-Sprengel haben bis zu 30 Zeichen.
  </description>
  <fix>
1. Label-Spalte breiter (`x={140}` für die Bars statt 120, Label-Spalte 130 Einheiten breit).
2. SVG-Text mit `<title>` umhüllen, damit Hover den vollen Wert zeigt.
3. Optional: `textLength` und `lengthAdjust="spacingAndGlyphs"` mit max-Pixel-Cap, oder JS-Truncation auf 25 Zeichen + Ellipsis.
  </fix>
</finding>

<finding severity="low" id="L5">
  <title>Vorschau-Header hat keinen visuellen Anker zum darunterstehenden "Ziehen"-Button — Beziehung "schau das an, dann klick" nicht klar</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:316-360 (Vorschau-Container), 361-371 (Button-Wrapper als Geschwister-`<div>`)</location>
  <description>
Der Vorschau-Block ist ein `<div class="border rounded p-3 bg-slate-50">`, der "Ziehen"-Button steht in einem nachfolgenden `<div>` ohne visuelle Beziehung. Eine Verwaltungs-Mitarbeiter:in mit Cursor unten könnte denken "Vorschau ist abgeschlossen, das war's" — der Run-Button wirkt wie ein separater Block.
  </description>
  <fix>
Vorschau-Container umschließt auch den Button: `<div class="border rounded p-3 bg-slate-50 space-y-3">…Vorschau…<button ...>Versand-Liste ziehen</button></div>`. Visuelle Botschaft: "Vorschau prüfen → unten klicken". Plus: über dem Button ein winziger Helper-Text "Wenn die Vorschau passt, klicke unten auf Ziehen."
  </fix>
</finding>

<finding severity="low" id="L6">
  <title>Vorschau-Warnung ("0 Personen Strata") kann auf 0 Wert verharren während die Strata-Anzahl bei verschachtelten Achsen explodiert</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:329-351, packages/core/src/stage1/reporting.ts:166-188</location>
  <description>
`previewAllocation` listet nur OCCUPIED Strata (Stratum mit `n_h_pool > 0`). `zeroAllocationStrata` zählt von diesen die mit `n_h_target === 0` — also "diese Bevölkerungsgruppe existiert im Pool, bekommt aber bei der Allokation 0 Personen weil zu klein". Das ist OK.

Aber: leere Cross-Product-Cells (Stratum, das im Pool gar nicht vorkommt — z.B. district=Aschach × education=Promotion mit n=0 in dieser Stadt) werden gar nicht gezählt. Wenn die Gruppe district × age_band × gender × education × migration_background wählt = 4×6×3×5×3 = 1080 mögliche Cells, von denen vielleicht 200 besetzt sind, dann erscheint im Vorschau nur "200 Strata, Soll-Summe 50". Keine Warnung à la "Du hast 5 Achsen gewählt, das sind 1080 mögliche Kombinationen, aber nur 200 davon sind im Pool besetzt — die Strata werden sehr klein."

Folge: die Gruppe versteht nicht, warum nach dem Lauf so viele Strata "underfilled" sind. Pre-Run-Warnung würde das adressieren.
  </description>
  <fix>
`AllocationPreview` um `theoreticalStrataCount` (= Produkt der distinct values pro Achse) erweitern. Wenn `theoreticalStrataCount > 2 × occupiedStrata`, Warnung im Vorschau-Block: "Du hast {axes.length} Achsen mit {theoretical} möglichen Kombinationen gewählt, aber nur {occupied} davon kommen im Pool vor. Mit feineren Achsen werden die Strata kleiner und Underfill wahrscheinlicher."
  </fix>
</finding>

</findings>

<question_answers>

<answer id="1" verdict="awkward">
Walking through CSV-Upload → Quoten/Axes → N+Seed → Vorschau → Ziehen → Result kann technisch in einer Sitzung durchgeführt werden, aber an drei Stellen würde die Gruppe stocken: (a) **nach Upload** — keine Datei-Vorschau (Stage1Panel.tsx:204-212), nur Zeilen-/Spalten-Count, also keine Verifikation "richtige Datei" (siehe H6); (b) **bei Seed-Eingabe** — Default ist 10-stelliger Unix-Timestamp, daneben sagt der amber Hint man solle in der Sitzung wählen — Mismatch zwischen Default und Anweisung (H4, Stage1Panel.tsx:50, 277-309); (c) **bei "Stratum-Abdeckung"-Card** — Statistik-Jargon ohne Tooltip (H7, Stage1Panel.tsx:399-411). Stage 1 funktioniert für Tech-affine Verwaltung, aber für die im Issue angesprochene "city-clerk education level" sind diese drei Stellen reibungsverursachend.
</answer>

<answer id="2" verdict="usable">
Die Vorschau-Sektion (Stage1Panel.tsx:315-360) zeigt vier sinnvolle Signale: Strata-Count + Soll-Summe (Header), zero-allocation und underfill-Warnungen (Zeile 329-351), und pro-Achsen-Bar-Charts im Preview-Modus (Zeile 352-358). Die Warnungen sind klar formuliert ("Strata bekommen nach proportionaler Allokation 0 Personen. Sind das Strata, die bewusst leer bleiben sollen, oder zu viele/zu feine Achsen?" — gibt eine konkrete Frage zurück an die Gruppe). Was fehlt: Hinweis bei sehr vielen Achsen / dünn besetzten Cross-Products (siehe L6, kein Warnsignal "du hast 5 Achsen gewählt"), und die Vorschau wird auf jedem Tastenanschlag neu berechnet (M8). Nicht überfordernd, aber für 6k+ Pools spürbar lag.
</answer>

<answer id="3" verdict="awkward">
Hierarchie ist im Prinzip richtig (Cards oben, Charts in Mitte, Detail-Tabelle unten als `<details>`), aber zwei Punkte stören: (a) **Card-Beschriftung "Stratum-Abdeckung"** (Stage1Panel.tsx:401) ist zu fachlich — siehe H7. (b) **Card-Reihenfolge**: "Gezogen" → "Stratum-Abdeckung" → "Unterbesetzt". Logisch wäre "Gezogen" → "Unterbesetzt" (das sind die zwei Top-Level-Outcome-Zahlen) → "Coverage" als Detail-Indikator. Underfilled ist die einzige amber/red-codierte Card und gehört in die Aufmerksamkeits-Mitte oder rechts. (c) **Seed-Footer in Mini-Schrift** (Stage1Panel.tsx:436-440) — der ganze Aufruf zur Audit-Reproduzierbarkeit hängt am Seed, aber er steht in `text-xs text-slate-500`. Sollte mindestens `text-sm` mit dunklerer Farbe sein.
</answer>

<answer id="4" verdict="awkward">
Bar-Charts sind verständlich für sehende Nutzer:innen mit normalem Farbsehen, aber: (a) **Soll/Ist-Distinktion ist farbabhängig** (AxisBreakdown.tsx:78-90, slate-400 vs blue-500) — kein Pattern, keine `<title>`-Tooltips, keine inline-Beschriftung pro Balken (H5). (b) **Beschriftung "Soll N · Ist M (Pool P)"** rechts vom Balken (Zeile 92-101) ist textuell redundant zur visuellen Länge — gut für Lesbarkeit, weniger gut bei langen Achsen-Werten (überlappung möglich, L4). (c) **`aria-label` ist generisch** (Zeile 55): Screen-Reader bekommt nur den Achsen-Namen, keine Werte. (d) **Print-Legende verschwindet** (`print:hidden` Zeile 109) — auf Papier sind die Balken nicht zuordenbar. Funktional OK für ein Sitzungs-Display, blockiert aber a11y und Print-Use.
</answer>

<answer id="5" verdict="usable">
Die Doppel-Präsentation (Card oben mit Anzahl + amber-Liste unten mit Erklärung) hat einen klaren Zweck: Card ist die Top-Line-Zahl für "wie schlimm?", Liste ist der Drill-Down "welche Strata genau, wie groß sind die Lücken". Das ist keine Redundanz im UX-Sinne, sondern Hierarchie. Der erklärende Satz (Stage1Panel.tsx:450-455 "Diese Strata bekamen weniger Personen als die proportionale Allokation vorgesehen hat — Pool zu klein. Im echten Verfahren bedeutet das: bei diesen Gruppen wurden alle verfügbaren Personen angeschrieben.") ist gut formuliert — sagt der Gruppe sowohl WARUM (Pool zu klein) als auch WAS BEDEUTET (alle verfügbaren angeschrieben), was eine Handlungs-Implikation ist. Einziger Wermutstropfen: die Sortierung der Liste ist bugged (H1) und die Begriffe "Strata"/"Stratum" sollten zu "Gruppen" werden (H7).
</answer>

<answer id="6" verdict="awkward">
Vier-Buttons-Set ist sinnvoll (CSV / Audit-JSON / Markdown / Drucken), aber: (a) **Filenames** enthalten keinen Verfahrens-Namen — `versand-1714134000.csv` ist im Aktenordner unzuordenbar (M2). (b) **"Audit-JSON herunterladen"** ist Tech-Sprache (M10). (c) **Markdown-Bericht** ist inhaltlich vollständig (Header, Parameter, Coverage, Marginale, Strata-Tabelle, Warnungen, Signatur — `reporting.ts:215-294`), aber **Hardcode-Titel** "# Versand-Auswahl — Bericht" sollte den Verfahrens-Namen tragen (L2). (d) **"Drucken"** funktioniert, das gedruckte Resultat ist aber inkomplett (kein Signatur-Footer im DOM, H3) und kann bei vielen Strata explodieren (M6). Reihenfolge der Buttons: empfehle "Bericht (Markdown)" links als primärer Output für die Sitzung, "Drucken" rechts als sekundär — aktuelle Reihenfolge betont CSV als ersten, was technisch richtig ist (CSV ist die Operation), aber für die Sitzung ist der Bericht relevanter.
</answer>

<answer id="7" verdict="awkward">
Print-CSS funktioniert in Grundzügen (index.css:12-51): Tab-Nav, Hints, Vorschau, Run-Button werden ausgeblendet, Backgrounds entfernt, Strata-Details expandiert, Typo verkleinert, Page-Breaks vor Headern vermieden. Aber: (a) **kein Signatur-Footer** im HTML, der gedruckt würde (H3) — der Markdown-Bericht hat es, der Print nicht. (b) **`details > *:not(summary)` zwangs-expandiert** lässt 100+-Strata-Tabellen auf Papier landen (M6). (c) **Bar-Chart-Legende ausgeblendet** (`AxisBreakdown.tsx:109` `print:hidden`), Balken nicht mehr zuordenbar. (d) **`color: #000 !important`** auf alles funktioniert nicht für SVG-`fill`, also bleiben Balken farbig — auf Schwarz-Weiß-Druckern entstehen ähnlich-graue Mid-Tones (auch H5). Insgesamt: erste Iteration eines Print-Stils, aber als Sitzungsprotokoll-Stand reicht es nicht.
</answer>

<answer id="8" verdict="awkward">
Die Formulierung (Stage1Panel.tsx:303-308) ist inhaltlich korrekt und gut motiviert: "Wählen Sie den Seed-Wert gemeinsam in der Verfahrens-Sitzung (z.B. eine Zahl, die alle Anwesenden vereinbaren — Lottozahlen, Datum, Würfelwurf). Er steht im Audit-Protokoll und macht den Lauf reproduzierbar. Bewusst öffentlich-vor-Lauf wählen verhindert, dass die Auswahl unbemerkt durch Probieren verschiedener Seeds beeinflusst werden kann." — das ist verständlich für die Zielgruppe. Aber: (a) der **Default-Wert ist gleichzeitig 10-stelliger Unix-Timestamp** und daneben steht "(Default)" — Verwaltung sieht "OK das System hat schon was vorgeschlagen" und übergeht den Hint (H4). (b) Der zweite Satz ("Er steht im Audit-Protokoll …") ist eine Behauptung ohne Verifikations-Anleitung — wo genau steht das? Würde durch ein konkretes "Im Audit-JSON unter `seed`-Feld" geerdeter. Insgesamt: Hint ist inhaltlich gut, scheitert aber am Default-Wert-Defaults und am fehlenden Forcing-Mechanismus.
</answer>

<answer id="9" verdict="awkward">
Mehrere a11y-Lücken: (a) **SVG-Bar-Charts** haben generisches `aria-label` ohne Werte, keine `<title>`/`<desc>`-Tags, Soll/Ist-Distinktion farbabhängig (AxisBreakdown.tsx:50-106, siehe H5). (b) **Tab-Switcher** in App.tsx:73-98 nutzt `<button>` mit `border-b-2`-Styling, hat aber kein `role="tablist"` / `role="tab"` / `aria-selected` — Screen-Reader hört zwei Buttons "Versand-Liste ziehen" und "Panel ziehen" ohne Tab-Semantik. (c) **`<details>`/`<summary>`** für Strata-Tabelle (Stage1Panel.tsx:498-541) ist semantisch korrekt, OK. (d) **File-Input** (Zeile 195-203) hat kein sichtbares `<label>` — Screen-Reader bekommt nur "Datei wählen" (Browser-default), keine "Melderegister-CSV"-Beschriftung. (e) **Color-Card-Codierung** (Zeile 416-423: bg-amber bei underfilled > 0) hat keine Text-Komponente die "achtung" sagt — nur die Zahl + Label. Color-only-Status. (f) **Form-Labels** für N und Seed sind `<label>`-Tags, aber NICHT mit `for=`/`id=` verknüpft (Zeile 263-264, 278-279) — Click-on-Label fokussiert nicht das Input. Insgesamt: native HTML-Basis ist solide, aber drei oder vier konkrete Patches nötig vor a11y-Audit.
</answer>

<answer id="10" verdict="awkward">
Drei Pfade durchgespielt: (a) **CSV ohne erkannte Spalten** (z.B. `name,email,phone`) — `autoGuessMapping` gibt nur `__ignore__` zurück (parse.ts:132-139), `recommendedAxes` produziert leere Liste (Stage1Panel.tsx:32-42), AxisPicker zeigt alle Spalten als Toggle ohne grünes "vorgeschlagen"-Badge. Kein Hinweis "keine empfohlenen Achsen" (M4). User wundert sich. (b) **N > Pool-Größe** — Vorschau wirft, Fehler erscheint im `stage1-preview-error`-`<p>` (Zeile 310-313), aber Run-Button bleibt aktiviert (`canRun()` Zeile 139-140 prüft nur N > 0) — Klick auf Ziehen wirft erneut, Catch in Zeile 161 setzt `error()`. Doppelte Fehlermeldung an zwei Stellen (M1). (c) **Alle Achsen abgewählt** — kein Fehler, läuft als degenerated SRS, UI sagt nichts (M4). Fehlermeldungen sind sprachlich sauber Deutsch und konkret ("Eingangs-Pool hat nur 500 Personen, mehr als das ist nicht ziehbar (angefragt: 600)" — `stratify.ts:133-135`), aber die Reaktion auf falsche Eingaben ist insgesamt zu nachsichtig — es gibt keine präventive Validierung am Eingabe-Feld selbst.
</answer>

<answer id="11" verdict="awkward">
Tab-Labels "Versand-Liste ziehen" und "Panel ziehen" (App.tsx:84, 96) sind beschreibend, aber für eine Erstnutzung ohne Kontext bedeutet "Versand-Liste vs Panel" nichts — die Verwaltung weiß nicht, dass es zwei Stages gibt, geschweige denn welche zuerst. Der **BMG §46-Hint** (Stage1Panel.tsx:222-243) ist juristisch korrekt und nennt die Quelle, aber er erscheint **erst nach dem CSV-Upload** und erklärt nur was nicht im Melderegister steht — nicht "warum braucht man Stage 1 vor Stage 3" oder "was passiert nach diesem Schritt". Die Gesamtworkflow-Doku in `08-product-redesign.md` ist gut, kommt aber im UI nicht vor. Empfehlung: oberhalb der Tabs in App.tsx einen mini-Workflow-Hinweis "1. Versand-Liste ziehen (Melderegister) → 2. Antworten sammeln (extern) → 3. Panel ziehen (Antwortende)" — heute fehlt diese Orientierung.
</answer>

<answer id="12" verdict="awkward">
Stage 1 und Stage 3 wirken wie zwei verschiedene Apps unter demselben Tab-Header (M3): unterschiedliche Upload-Patterns (input vs Drag-Drop), unterschiedliche Seed-Defaults (Unix-Sekunde vs Math.random), unterschiedliche Run-Button-Texte ("Ziehen" vs "Lauf starten"), unterschiedliche Result-Layouts (Cards+Charts vs Stats-Liste+Tabellen), unterschiedliche Spalten-Mapping-Anforderungen (keine vs Pflicht). Stage 1 ist neuer und hat in einigen Aspekten BESSERE UX (Cards + Bar-Charts), aber die Inkonsistenz signalisiert Verwaltungs-Mitarbeiter:innen, dass die Stages als getrennte Tools entwickelt wurden, was Misstrauen schürt ("ist das eine zusammenhängende App?"). Konkrete Inkonsistenzen sind alle in M3 aufgeführt — keine ist alleine kritisch, in der Summe aber erheblich. Am wichtigsten: **gemeinsamer Upload-Component** + **gemeinsamer Seed-Default** + **harmonisierte Button-Labels**.
</answer>

</question_answers>

<strengths>
<strength>Pre-Run-Vorschau (Stage1Panel.tsx:315-360) trennt Soll-Allokation cleverly von Ist-Ergebnis — die Gruppe sieht "was würde passieren" bevor RNG/Audit/Signatur involviert sind. Kein vergleichbares Pattern in Stage 3.</strength>
<strength>Underfill-Erklärung (Stage1Panel.tsx:450-455) ist methodisch klar formuliert: nennt URSACHE ("Pool zu klein") und HANDLUNGS-IMPLIKATION ("alle verfügbaren Personen wurden angeschrieben"). Nicht-Statistiker:in versteht die Bedeutung sofort.</strength>
<strength>BMG §46-Quellen-Citation als verlinkter `<a>` zum Gesetzestext (Stage1Panel.tsx:233-241) ist substanziell — die Behauptung "Bildung etc. nicht im Melderegister" ist verifizierbar, ohne dass die Verwaltungs-Mitarbeiter:in den Browser verlassen muss.</strength>
<strength>Strata-Tabelle als `<details>` collapsible (Stage1Panel.tsx:498-541) hält die Top-Line-View aufgeräumt, ohne die Detail-Information zu verlieren — gute Hierarchie-Entscheidung.</strength>
<strength>Markdown-Bericht (`reporting.ts:211-295`) ist inhaltlich vollständig: Header, Parameter, Coverage, Marginale-Tabellen mit Soll-/Ist-Prozenten, Cross-Product-Tabelle, Warnungen, Signatur — wäre als Aktenordner-Ablage in einer Sitzung sofort nutzbar (sobald Verfahrens-Name darin steht).</strength>
<strength>"vorgeschlagen"-Badge im AxisPicker (`AxisPicker.tsx:38-42`) macht die Heuristik-Vorschläge transparent — User sieht "Tool hat empfohlen, ich habe akzeptiert" vs. eigene Wahl.</strength>
<strength>Bundle-Delta laut Commit-Message +14 kB raw / +4 kB gzip — die zusätzliche Reporting-UI wurde ohne Chart-Library-Import gebaut (native SVG, AxisBreakdown.tsx). Disziplinierte Bundle-Hygiene für eine static-site-PWA.</strength>
<strength>Codepoint-Sort statt localeCompare (`stratify.ts:84-87`, `reporting.ts:70-72`) — hartes Determinismus-Commitment für TS/Python-Parität, im UI-Code respektiert.</strength>
</strengths>

<verdict value="warn" critical="0" high="7" medium="10">
  <summary>
Stage 1 ist als technisches Fundament tragfähig (alle Tests grün, signierter Audit, deterministisch, sub-Sekunden-Performance), aber als UX für eine Verfahrens-Sitzung mit Verwaltungs-Mitarbeiter:innen, Bürgermeister:in und Gemeinderat noch nicht versandfertig. Die sieben High-Findings bündeln vier Themen: (1) **Datenintegrität an der UI** — falscher Underfill-Sort (H1), stale Result nach Parameter-Änderung (H2); (2) **Workflow-Konsistenz** — Default-Seed widerspricht dem Hint (H4), keine CSV-Vorschau wie in Stage 3 (H6), Stage 1/3-Pattern-Drift (M3); (3) **Verwaltungs-Verständlichkeit** — Statistik-Jargon ohne Tooltip (H7), keine Verfahrens-Bezeichnung in Filenames (M2); (4) **Audit-Print-Pfad** — Druckansicht ohne Signatur-Footer (H3), Bar-Charts nur farb-codiert (H5). Keine dieser Mängel blockiert komplett — die Gruppe kann den Workflow durchlaufen — aber jede einzelne führt zu Reibung, Misstrauen oder unbrauchbaren Artefakten. Vor dem ersten Pilot-Verfahren sollten mindestens H1, H2, H3, H4 und M2 behoben sein. H5/H6/H7 sind bessere Verständlichkeit, M3 ist mittelfristige Refactoring-Arbeit.
  </summary>
  <blockers>
  </blockers>
</verdict>

</review>

