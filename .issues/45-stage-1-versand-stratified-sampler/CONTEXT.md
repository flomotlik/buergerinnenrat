# Context — locked decisions for Issue #45

> Aus interaktiver Diskussion 2026-04-25, parallel zur Architektur-Korrektur in `sortition-tool/08-product-redesign.md`.

## Produkt-Framing (verbindlich)

- Open-Source, statische Website, GPL-3.0-or-later
- Kein Backend, kein Server, keine Cloud — alles im Browser
- Tool für Verwaltungen, sie übernehmen Datenschutz selbst
- Fokus: Auswahl-Operationen. Anschreiben, Telefonieren, Selbstauskunft-Erfassung passieren extern in anderen Tools.
- "Simples aber starkes Tool"

## Stage-1-spezifische Entscheidungen

1. **Defaults für Stratifikations-Achsen vorschlagen, überschreibbar machen.**
   - Tool erkennt Spalten `district`, `age_band`, `gender` in der Eingangs-CSV
   - Wenn vorhanden, werden diese drei als Default vorgeschlagen
   - Nutzer kann Achsen ab- oder dazuwählen (jede CSV-Spalte ist mögliche Achse)

2. **Algorithmus: proportionale Stratifikation mit Largest-Remainder-Methode.**
   - Pro Stratum: n_h = round(N × N_h / N_total) mit Largest-Remainder, damit sum(n_h) = N exakt
   - Innerhalb Stratum: Fisher-Yates-Shuffle, Mulberry32-RNG
   - Deterministisch über Seed (Default = aktuelle Unix-Zeit, sichtbar)

3. **Pure TypeScript, kein Solver, kein Pyodide.**
   - Lebt in `packages/core/src/stage1/` (neuer Submodul)
   - Sub-Sekunde für jede Eingangs-Größe bis 100.000

4. **Output 2-teilig:**
   - CSV der gezogenen Personen (alle Original-Spalten erhalten)
   - Audit-JSON mit Seed, Eingangs-CSV-SHA256, Stratifikations-Achsen, Stratum-Tabelle, Ed25519/ECDSA-signiert

5. **BMG-§46-Awareness im UI:**
   - Hinweistext: "Stratifikation kann nur über Felder erfolgen, die im Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht im Melderegister — diese kommen erst nach Selbstauskunft hinzu."
   - Kein Hard-Block, nur Hinweis (manche Nutzer haben angereicherte Eingangsdaten, das ist ihre Verantwortung)

6. **Edge-Cases:**
   - Leeres Stratum (n_h_target = 0): kein Fehler, Stratum wird übersprungen
   - n_h_target > N_h (mehr verlangt als im Stratum vorhanden): ziehe alle vorhandenen, vermerke im Audit "Stratum X unter-vertreten: 12 von 20 angefragt"
   - Nur ein Stratum: entartet zu einfacher Zufallsstichprobe — funktioniert ohne Sonderfall
   - N > sum(N_h): kann nicht alle ziehen, klare Fehlermeldung "Eingangs-Pool zu klein"

7. **UI-Position:**
   - Neuer Tab oder Route `/stage1-versand` in `apps/web/`
   - Hauptnavigation: "Versand-Liste ziehen" und "Panel ziehen" als zwei separate Wege
   - Bestehende Stage-3-Funktionalität bleibt unverändert

8. **Verfahren-State (Issue #46) noch nicht in #45-Scope.**
   - Stage 1 produziert eigenständig CSV + Audit-JSON
   - Integration in Verfahren-State-Datei kommt mit #46

## Was nicht in den Scope gehört

- Soft-Constraints / Quoten-Korridore (das ist Stage 3)
- Mehrwellige Versand-Listen (das ist Issue #48 Nachholung)
- BMG-§46-API-Anbindung (Verwaltung exportiert CSV manuell)
- Auto-Aggregation feiner Strata bei kleinen Gemeinden
- Reserve-Liste (das ist #47, Reserve gehört konzeptionell zu Stage 3)

## Performance-Erwartung

- Eingangs-CSV bis 100.000 Zeilen: <1 s gesamte Pipeline (Parse + Stratifikation + CSV-Generierung)
- Memory: O(N), unkritisch im Browser bis 100.000 Zeilen
- Keine Worker-Isolation nötig in Iteration 2 (Stage 1 ist zu schnell für UI-Block)

## Test-Erwartung

- Unit-Tests für Stratifikations-Funktion
- Integrationstest mit synthetischer 6000-Zeilen-CSV → 300 gezogen, Strata-Verteilung im erwarteten Bereich
- Playwright-Smoke: Upload → Defaults erkannt → Größe eingeben → Lauf → Download geht
