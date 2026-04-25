# 08 — Was das Tool ist (und was nicht)

> Stand: 2026-04-25. Ersetzt die Produkt-Annahmen aus Masterplan v1 und Doc 07.

## In einem Satz

Open-Source-Website, läuft im Browser ohne Server, hilft Verwaltungen Personen für Bürger:innenräte zufallsgerecht auszuwählen.

## Wer baut, wer benutzt, wer wartet

- **Bauer:** ich (offene Lizenz, GPL-3.0-or-later)
- **Nutzer:** Gemeinde-Mitarbeiter:innen, ehrenamtliche Verfahrens-Begleiter:innen, kleine Vereine die ein Bürgerforum machen
- **Wartung Datenschutz:** der Nutzer auf seinem eigenen Rechner. Tool berührt keinen Server, ich habe keine Datenverantwortung.
- **Geschäftsmodell:** keines.

## Was das Tool macht

Drei Auswahl-Schritte. Jeder mit Klartext-CSV-In, Klartext-CSV-Out, signiertem Audit-Snapshot.

### Schritt 1: Versand-Liste ziehen

- **Eingabe:** Melderegister-Auszug als CSV (Pflichtfelder: ID, Bezirk, Geschlecht, Alter, Staatsangehörigkeit). Andere Felder werden ignoriert. Datei verlässt den Browser nicht.
- **Konfiguration:** Wieviel Briefe? Welche Stratifikation (z.B. proportional pro Stadtbezirk)?
- **Ausgabe:** CSV mit den ausgewählten Personen, plus signierte JSON-Quittung "wer wurde wann gezogen, mit welchem Seed, aus wievielen".
- **Algorithmus:** stratifizierte Zufallsstichprobe. Kein Solver. <100 ms für 20.000 Eingangs-Personen.

### Schritt 2: Panel ziehen aus Antwortenden

- **Eingabe:** CSV der Antwortenden mit Selbstauskunft (Bildung, Migrationshintergrund, was die Quote braucht).
- **Konfiguration:** Panel-Größe, Quoten-Korridore pro Kategorie.
- **Ausgabe:** Panel + Reserve-Liste (z.B. 30 + 30 Personen), plus signierter Audit-Snapshot.
- **Algorithmus:** Maximin-Sortition (kanonisch, sortition-algorithms-Library). Pool-Größe typisch 50–300 Personen, Wallzeit Sub-Sekunde bis ~10 Sekunden.

### Schritt 3: Nachholung / Ergänzung

Drei Sub-Operationen, alle als Erweiterung eines bereits gezogenen Schritts:

**3a. "Brauche mehr Briefe in Bezirk X."** Re-Stratifikation mit Lücken-Berechnung, ziehe N zusätzliche Versand-Adressen, **disjunkt** zur ersten Versand-Liste.

**3b. "Eine Person aus dem Panel sagt ab."** Ziehe einen Ersatz aus der Reserve mit Stratum-Match. Falls Reserve leer für dieses Stratum: hole die nächste Person aus Antwortenden-Pool die das Stratum füllt.

**3c. "Reserve aufgebraucht, brauche neue."** Erweitere Reserve durch Nachzieher aus Antwortenden, mit Force-Out auf alle bisherigen Auswahl-Personen.

Alle drei brauchen die Auswahl-Historie als Input. Das geht nur, wenn das Tool den State irgendwo hält.

## Wo der State liegt

**Eine Datei.** `verfahren-{name}.json` — vom Nutzer auf der eigenen Platte gespeichert. Enthält:

```
- Verfahren-Metadaten (Name, Datum, Zielpanelgröße)
- Versand-Liste (Person-IDs, Seed, Zeitstempel, Hash der Eingangs-CSV)
- Antwort-Status pro Person (mailed, declined, accepted, dropped_out)
- Selbstauskunft pro Antwortendem
- Panel + Reserve-Listen mit Zeitstempel
- Signatur-Kette (jede Operation signiert + verkettet zum Vorgänger)
```

Vor jeder Operation lädt der Nutzer diese Datei hoch. Nach jeder Operation lädt er die aktualisierte Version runter. Kein Backend, keine Cloud, keine IndexedDB-Magic die sich nicht erklären lässt.

**Optional Convenience:** das Tool kann den letzten Stand auch in IndexedDB cachen (für "Browser-Tab versehentlich geschlossen"). Aber die Datei ist die Source of Truth.

## Was das Tool ausdrücklich nicht macht

- Briefe drucken oder verschicken
- Telefonate führen oder protokollieren
- Antworten erfassen (Selbstauskunft-Eingabe macht der Nutzer extern, z.B. Excel/LimeSurvey)
- Bürger:innenräte moderieren
- Personen-Daten an irgendeinen Server senden
- Mehrere Nutzer gleichzeitig am selben Verfahren arbeiten lassen (es gibt keinen Server, nur Datei-Austausch per E-Mail/USB)

Das ist die Grenze. Was außerhalb passiert, machen andere Tools.

## Was im aktuellen Code passt und was nicht

| Komponente | Status |
|---|---|
| CSV-Import + UTF-8/Win1252-Detection | passt |
| Quoten-Editor mit Korridoren | passt |
| Engine A (HiGHS-Maximin TS) | passt für schnelle UI-Vorschau |
| Engine B (Pyodide + sortition-algorithms) | **soll Default werden** für die echte Auswahl, weil kanonisch + Audit-belastbar |
| Reference C (nativ Python) | nur Entwickler-Tool, nicht im Browser nötig |
| Audit-Export (Ed25519 signiert) | passt für einzelnen Lauf, muss zur Kette über mehrere Operationen erweitert werden |
| Panel-Ops (Replace/Extend) | halb fertig — funktioniert mechanisch, aber ohne Reserve-Konzept und ohne Stratum-Filter |
| **Stage 1 (Versand-Auswahl)** | **fehlt komplett** |
| **Verfahren-State-Datei (Persistenz)** | **fehlt komplett** |
| **Reserve-Liste als first-class Konzept** | **fehlt komplett** |

## Was das für die Iteration-2-Issues heißt

| Issue | Was bleibt | Was ändert sich |
|---|---|---|
| #26 Worker-Isolation | bleibt 1:1 | — |
| #36 Hash-Parity | bleibt 1:1 | — |
| #41 Pipage-Rounding | bleibt 1:1 | — |
| #43 LP-Tuning | bleibt 1:1 | — |
| #29 Property-Tests | bleibt 1:1 | — |
| #28 Seed-Sweep | bleibt 1:1 | — |
| #42 Engine B Pyodide | **Priorität rauf** — wird Default-Engine, nicht "Verifikations-Backbone" | Engine A bleibt als UI-Vorschau |
| #40 Engine A Column Generation | **Priorität runter** — nice-to-have, nicht kritisch wenn Engine B Default ist | bleibt als optionale Verbesserung |
| #27 Cross-Runtime-Drift | bleibt | wertvoll als Engine-A-vs-B-Validierung |
| #30 Native Large-Pool-Benchmark | Pool-Größen 60/100/150/200/300 statt 500/1000/2000 | siehe DISCUSSION.md |
| #44 CI-Benchmark-Gate | Baseline n=100 statt n=500 | siehe DISCUSSION.md |
| #39 Panel-Ops UI | scope wächst — Reserve-Liste wird first-class | siehe DISCUSSION.md |

## Was neu dazu kommt

Vier neue Issues als Track Z:

| ID | Slug | Est | Priorität |
|---|---|---|---|
| 45 | stage-1-versand-stratified-sampler | 2 PT | critical |
| 46 | verfahren-state-file-persistence | 1.5 PT | critical |
| 47 | reserve-list-first-class | 1.5 PT | high |
| 48 | nachholung-operations-3a-3b-3c | 2 PT | high |

Track Z gesamt: ~7 PT.

## Vorgeschlagene neue Bearbeitungs-Reihenfolge für Iteration 2

1. **#46** Verfahren-State-File (Datenformat + Schema). Voraussetzung für alles andere.
2. **#45** Stage-1-Sampler (proportionale Stratifikation). Funktioniert auf rohem Melderegister-CSV.
3. **#42** Engine B Pyodide. Wird Default-Engine für Schritt 2.
4. **#26** Worker-Isolation. UI bleibt responsiv beim Pyodide-Lauf.
5. **#47** Reserve-Liste first-class.
6. **#48** Nachholung-Operationen 3a/3b/3c.
7. **#27, #28, #29, #30, #36, #41, #43, #44** parallel oder danach (Hygiene, Algorithmus-Robustheit).
8. **#40** Engine A echte Column Generation — nur wenn Zeit übrig ist. Engine B macht das Problem ohnehin obsolet als Hauptweg.
9. **#39** Panel-Ops UI mit Reserve-Integration als finaler Polish.

Iteration-2-Total: ~28–30 PT statt ursprünglich 22.5 PT. Wenn etwas raus muss: #40 zuerst.

## Was wegfällt

Aus dem Masterplan v1 + Iteration-1-Findings nicht mehr relevant für dieses Framing:

- Lizenz-Komplexität Apache vs GPL — GPL-3.0-or-later, fertig, weil OSS sowieso
- DSFA / Compliance-Workstream — entfällt, kein Daten-Verantwortlicher (Tool, nicht Dienst)
- BITV / Erklärung zur Barrierefreiheit — Smoke-Test reicht, kein Pflicht-MVP
- Patent-FTO Procaccia/Flanigan — kommerzielles Geschäftsmodell entfällt, kein Risiko
- Pilot-Akquise / Marktvalidierung — entfällt, baue für die eigene Gemeinde, andere können's nehmen wenn's passt
- AVV-Templates / DSGVO-Verträge — entfällt, kein Auftragsverarbeiter
- iOS-Safari — bleibt Desktop Chromium + Firefox, fertig
- i18n DE/EN — DE only ist ok, andere Sprachen wenn Bedarf da ist
- Kommunal-Format-Adapter (EWO/MESO/VOIS) — Nutzer macht CSV-Vorbereitung selbst

Das streicht ~50 % der Masterplan-v1-Items. Was übrig bleibt, ist Algorithmus + UI + Dateiformate.

## Nächster Schritt

Wenn du diesem Framing zustimmst:
1. Ich schreibe die 4 neuen ISSUE.md (#45–48)
2. Ich aktualisiere README.md mit der neuen Reihenfolge
3. Ich committe die ganzen Vorbereitungen (Frontmatter-Fix + Doc 07 + Doc 08 + neue Issues + Discussions) als zusammenhängende Änderung
4. Du startest cloop

Falls du etwas anders willst (z.B. Engine A statt Engine B als Default, oder Stage 1 weglassen, oder andere Reihenfolge): sag's, ich passe an.
