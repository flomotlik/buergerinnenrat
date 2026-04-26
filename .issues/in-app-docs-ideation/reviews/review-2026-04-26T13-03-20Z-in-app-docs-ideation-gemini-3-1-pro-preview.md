---
review_of: in-app-docs-ideation
review_type: topic
review_mode: topic
review_topic: In-app docs ideation for Stage 1 algorithm + tech-stack audit
reviewed_at: 2026-04-26T13-03-20Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 73
---

<review>

<proposals>

<proposal id="P1" priority="must">
  <title>Spielzeug-Beispiel mit visueller Hamilton-Zuteilung</title>
  <was>Interaktiver oder statischer Schritt-für-Schritt Walkthrough eines kleinen Ziehungs-Beispiels.</was>
  <wo>/docs/algorithmus</wo>
  <fuer_wen>Verwaltungs-Mitarbeiter:in (mit optionalen Deep-Dives für Auditor:innen)</fuer_wen>
  <was_rein>Ein 100->10 Beispiel mit 2 Achsen (Alter, Geschlecht). Visuelle Darstellung der Hamilton-Methode: Balken füllen sich, der größte Rest bekommt den letzten Sitz.</was_rein>
  <was_raus>Komplexe mathematische Formeln und Edge-Cases der Sortition für das erste Verständnis.</was_raus>
  <verlinkungen>https://en.wikipedia.org/wiki/Largest_remainder_method</verlinkungen>
  <vertrauen>Macht die "Black Box" greifbar und beweist, dass keine Magie stattfindet, sondern nachvollziehbare, faire Mathematik angewendet wird.</vertrauen>
</proposal>

<proposal id="P2" priority="must">
  <title>Transparenz- und Technologie-Manifest</title>
  <was>Tabelle der sicherheits- und zertifizierungsrelevanten Kernkomponenten (PRNG, Solver, Audit-Schema).</was>
  <wo>/docs/tech-stack</wo>
  <fuer_wen>Technische Auditor:in</fuer_wen>
  <was_rein>Liste: Mulberry32 (PRNG), highs.wasm (Solver), Web Crypto (Signatur). Jeweils fixierte Version, dedizierte Aufgabe, Link zum Source/Paper und expliziter Hinweis auf die byte-identische Python-Validierung.</was_rein>
  <was_raus>Reine UI-Frameworks wie Solid oder Tailwind, da diese den Ziehungs-Algorithmus nicht tangieren.</was_raus>
  <verlinkungen>docs/stage1-validation-report.md, https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32</verlinkungen>
  <vertrauen>Ermöglicht nachvollziehbare Verifikation und signalisiert, dass die Architektur für Auditierbarkeit ausgelegt wurde.</vertrauen>
</proposal>

<proposal id="P3" priority="should">
  <title>Reproduzierbarkeits-Anleitung für Auditor:innen</title>
  <was>Schritt-für-Schritt Guide, wie eine bereits durchgeführte Ziehung lokal verifiziert wird.</was>
  <wo>/docs/reproduzierbarkeit</wo>
  <fuer_wen>Technische Auditor:in</fuer_wen>
  <was_rein>Konkrete Anleitung: 1. Audit-JSON aus der UI exportieren. 2. `scripts/stage1_reference.py` mit der JSON als Input ausführen. 3. Output (Indices) abgleichen. Snippets für die benötigten CLI-Befehle.</was_rein>
  <was_raus>Allgemeine Python-Tutorials oder Setup-Anleitungen für absolute Anfänger.</was_raus>
  <verlinkungen>Link zum GitHub Repository (`scripts/` Ordner)</verlinkungen>
  <vertrauen>Das ultimative Vertrauenssignal: "Glaube uns nicht, rechne es mithilfe des Audit-Logs selbst nach."</vertrauen>
</proposal>

<proposal id="P4" priority="should">
  <title>Kontextuelle Hilfestellung (Glossar-Tooltips) im Workflow</title>
  <was>Inline-Definitionen für methodische und rechtliche Fachbegriffe direkt in der App-UI.</was>
  <wo>Stage 1 Main UI, Stage 3 Panels</wo>
  <fuer_wen>Verwaltungs-Mitarbeiter:in</fuer_wen>
  <was_rein>Dezent unterstrichene Begriffe (z.B. "Stratum", "Soll", "Hamilton") zeigen beim Hover kurze, nicht-technische Erklärungen in verständlicher Sprache an.</was_rein>
  <was_raus>Lange Absätze oder mathematische Herleitungen. Nur 1-2 kompakte Sätze pro Tooltip.</was_raus>
  <verlinkungen>Keine externen Links in Tooltips, aber Weiterleitung (`Mehr erfahren...`) zur `/docs/glossar` Seite.</verlinkungen>
  <vertrauen>Baut Frustration ab, verhindert Interpretationsfehler bei der Eingabe und signalisiert professionelle Begleitung des Nutzers.</vertrauen>
</proposal>

</proposals>

<question_answers>
<answer id="1">Ein kleines Toy-Example (z.B. 100 Einwohner -> 10 Ziehungen, 2 Achsen wie Alter und Geschlecht) ist ideal, da sich große Zahlen schwer mental verarbeiten lassen. Die Hamilton-Zuteilung sollte unbedingt visuell als "sich füllende Quoten-Balken" (ganzzahlige Quoten) und "Resteverteilung" (größte Reste, die noch einen Sitz bekommen) dargestellt werden. Ein statischer, illustrierter Walkthrough ist robuster und flüssiger lesbar als ein komplexer interaktiver Playground.</answer>
<answer id="2">Für Auditor:innen relevant sind die Kernkomponenten der Sortition: highs.wasm, Web Crypto, Mulberry32, Hamilton-Logik, Fisher-Yates, sowie die Python-Referenz. Diese sollten auf einer dedizierten Route (z.B. `/docs/tech-stack`) oder in einem Tab "Audit & Technologie" leben. Format: Eine klare Tabelle. Version Pinning ist hierbei extrem wichtig (z.B. highs.wasm@1.8.0), damit ein Prüfer exakt nachvollziehen kann, welche Abhängigkeiten in das Audit-Zertifikat eingeflossen sind.</answer>
<answer id="3">Das beste Pattern für Progressive Disclosure ist hier ein Tab-System auf den Dokuseiten: Tab 1 "Einfach erklärt" (Narrativ und visualisiert für die Verwaltung) und Tab 2 "Technische Details" (Formeln, deterministische PRNG-Details, Edge Cases für Auditor:innen). Das trennt die Zielgruppen sauber, ohne sie voneinander abzuschotten.</answer>
<answer id="4">In der App-UI (Results View), direkt oberhalb oder neben dem Audit-Footer, sollte ein klares, aber dezentes Vertrauens-Badge ("Zertifiziert durch unabhängige Validierung") stehen. Beim Klick öffnet sich ein Hinweis auf die "byte-identische Validierung (TS/Python) über 21 Setups" mit einem Deep-Link auf den Validation Report. Das platziert Vertrauen prominent, ohne den Workflow zu blockieren.</answer>
<answer id="5">Mandatory Links in der in-app Doku: BMG §46 (für den rechtlichen Rahmen), Sortition Foundation Methodik (als Practitioner-Standard) und OECD Methodology. Nice-to-have für Deep-Dives: Flanigan et al. (für algorithmische Fairness). Die Links sollten inline im Kontext platziert werden; eine isolierte Bibliographie-Seite wird von Verwaltungs-Mitarbeitern selten proaktiv aufgesucht.</answer>
<answer id="6">Ein stilisiertes Beispiel ("Stadtbezirke Nord/Süd/West, Alter 18-35/36+, Geschlecht m/w/d") ist am besten, da PII-frei und sofort greifbar. Die Limitierung durch das BMG §46 (z.B. Bildungsabschluss liegt dem Melderegister nicht vor) muss explizit aber positiv formuliert werden: "Um rechtssicher und datenschutzkonform zu bleiben, stratifiziert die App ausschließlich nach den vom Einwohnermeldeamt legal beziehbaren Datenpunkten (BMG §46)."</answer>
<answer id="7">Ja. In `/docs/reproduzierbarkeit` als eigener, technisch fokussierter Bereich. Das ausgegebene Audit-Schema entfaltet seinen Wert erst, wenn man erklärt, wie es zur Verifikation angewandt wird. Schritt-für-Schritt-Befehle (Download Audit JSON -> Ausführen des Referenz-Scripts -> Hash-Vergleich) sind Pflicht.</answer>
<answer id="8">Algorithmische Limitierungen (fehlende IPF, Mulberry32 als Non-Crypto-Grade PRNG, keine Cross-Stratum Minima) müssen offen im "Technische Details"-Tab kommuniziert werden. Um nicht-technische Nutzer nicht zu verunsichern, werden diese als "Designentscheidungen für Transparenz und Reproduzierbarkeit im Browser" gerahmt (z.B. "Um die Ziehung offline im Browser nachvollziehbar zu machen, nutzen wir deterministischen Zufall").</answer>
<answer id="9">Ein Two-Column-Layout für Desktop-Geräte (links Narrativ/Erklärung, rechts Begleitgrafiken oder technische Formeln in einer abgesetzten Sidebar) ist ideal. Auf Mobile bricht dies graceful zu einer Single-Column um. Das ermöglicht Querlesen der Kerngeschichte, ohne Details zu verstecken.</answer>
<answer id="10">Eine eigene SPA-Route `/docs` mit Deep-Links (`/docs#hamilton`) ist optimal. In der Main-App (z.B. Stage 1 Panel) sollten diese Links als kleine, unaufdringliche `(?)` Info-Icons hinter komplexen Begriffen oder Schritt-Überschriften integriert werden, um die UI ruhig zu halten.</answer>
<answer id="11">Ein Glossar sollte auf einer dedizierten Unterseite `/docs/glossar` leben, damit es als Nachschlagewerk fungiert. Es wird direkt durch die Inline-Tooltips (siehe Proposal P4) referenziert und verlinkt.</answer>
<answer id="12">Ja, die "Einfach Erklärt"-Ansichten der Doku MÜSSEN print-friendly via CSS (`@media print`) sein. Verwaltungs-Mitarbeiter müssen in der Praxis oft dem Gemeinderat einen Papierausdruck der zugrundeliegenden Methodik als Anlage beilegen. Ein teurer serverseitiger PDF-Export ist nicht nötig, eine saubere Browser-Druckfunktion reicht völlig aus.</answer>
</question_answers>

<top_priority_recommendations>
<recommendation>P1: Entwickle das 100->10 Toy-Example mit visuell verständlicher Hamilton-Verteilung zuerst. Das baut am schnellsten Verständnis und Vertrauen bei der Hauptnutzergruppe (Verwaltung/Gemeinderat) auf.</recommendation>
<recommendation>P4: Implementiere Hover-Tooltips für methodische Fachbegriffe, um Verständnis-Hürden und Eingabefehler direkt im Workflow abzubauen.</recommendation>
<recommendation>P3: Erstelle die Reproduzierbarkeits-Anleitung. Sie ist essenziell, um die starke Glaubwürdigkeitsbehauptung ("Auditierbar") auch operativ einzulösen.</recommendation>
</top_priority_recommendations>

<watch_outs>
<watch_out>Mathematik-Schock: Verwaltungs-Mitarbeiter:innen dürfen in der Standardansicht nicht mit tiefgreifenden mathematischen Formeln oder Sortition-Edge-Cases konfrontiert werden. Die Standardansicht (Tab 1) muss strikt narrativ und visuell erklärend bleiben.</watch_out>
<watch_out>Veraltete Versionsangaben im Audit: Wenn die `/docs/tech-stack` Tabelle manuell gepflegt wird, divergiert sie rasch von der `package.json`. Die Dokumentation sollte Versionsnummern von highs.wasm und Co. idealerweise direkt während des Build-Prozesses einbinden, um Abweichungen auszuschließen.</watch_out>
</watch_outs>

<verdict value="ideation_complete" critical="0" high="0" medium="0">
Die In-App-Dokumentation sollte über eine konsequente Zwei-Zielgruppen-Strategie ("Progressive Disclosure", z.B. via Tabs) strukturiert werden. Für die Verwaltungs-Mitarbeiter:innen liegt der Fokus auf kontextuellen Tooltips und einem stark vereinfachten, visuellen Spielzeug-Beispiel. Für technische Auditor:innen muss hingegen maximale Transparenz hinsichtlich des Tech-Stacks, klarer Limitierungen und konkreter Schritt-für-Schritt-Anleitungen zur Reproduzierbarkeit der Ziehung in einem dedizierten Detailbereich geschaffen werden.
</verdict>

</review>
```
