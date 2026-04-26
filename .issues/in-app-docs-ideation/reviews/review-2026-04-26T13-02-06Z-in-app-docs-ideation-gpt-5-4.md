---
review_of: in-app-docs-ideation
review_type: topic
review_mode: topic
review_topic: In-app docs ideation for Stage 1 algorithm + tech-stack audit
reviewed_at: 2026-04-26T13-02-06Z
tool: codex
model: gpt-5.4
duration_seconds: 170
---

<review>

<proposals>

<proposal id="P1" priority="must">
  <title>Füge einen eigenständigen Dokumentations-Hub unter /docs hinzu</title>
  <was>Eine schlanke In-App-Startseite für alle Stage-1-Erklärinhalte: Überblick, Vertrauen-Signale, Deep-Dive-Einstiege, Quellen, Technik. Verankert in der bestehenden SPA statt als externes Repo-Markdown.</was>
  <wo>Neue Route <code>/docs</code>; Einstieg über einen Link in der Hauptnavigation neben Stage 1 / Stage 3 und einen Sekundärlink im Stage-1-Header von <code>apps/web/src/App.tsx</code> und <code>apps/web/src/stage1/Stage1Panel.tsx</code>.</wo>
  <fuer_wen>Beide, mit progressiver Disclosure ab der Startseite.</fuer_wen>
  <was_rein>- Drei Einstiegskarten: "Einfach erklärt", "Prüfen &amp; reproduzieren", "Technik &amp; Quellen".
- Drei sichtbare Trust-Signale oberhalb des Folds:
  1. TS-Implementierung gegen unabhängige Python-Referenz byte-identisch validiert.
  2. Audit-JSON wird signiert und bindet die gezogenen Indizes.
  3. Tool läuft statisch im Browser ohne Backend.
- Kurze "Was dieses Tool macht / nicht macht"-Sektion aus <code>sortition-tool/08-product-redesign.md</code>.
- Verweise auf die tieferen Unterseiten aus P2, P4, P5, P7.</was_rein>
  <was_raus>Keine Volltext-Kopie der Repo-Dokumente; keine komplette juristische Einordnung; keine Solver-Doku für Stage 3 auf derselben Seite.</was_raus>
  <verlinkungen>- Repo: <code>sortition-tool/08-product-redesign.md</code>, <code>docs/stage1-validation-report.md</code>, <code>docs/deploy.md</code>.
- Extern: https://www.nature.com/articles/s41586-021-03788-6
- Extern: https://www.sortitionfoundation.org/how
- Extern: https://www.gesetze-im-internet.de/bmg/__46.html</verlinkungen>
  <vertrauen>Der Hub übersetzt Repo-Artefakte in sichtbare, überprüfbare Claims direkt im Produkt. Nicht "vertrau uns", sondern "hier ist die Validierung, hier ist die Signatur, hier sind die Quellen".</vertrauen>
</proposal>

<proposal id="P2" priority="must">
  <title>Baue eine Algorithmus-Seite mit Doppelbeispiel und Hamilton-Walkthrough</title>
  <was>Eine dedizierte Erklärseite für den Stage-1-Algorithmus mit einem kleinen Lernbeispiel und einem realitätsnahen Gemeinde-Beispiel.</was>
  <wo>Route <code>/docs/algorithmus</code>; verlinkt aus dem Stage-1-Panel direkt neben Achsenwahl und Audit-Download.</wo>
  <fuer_wen>Beide; Lesepfad zuerst für Verwaltungs-Mitarbeiter:in, ausklappbare Details für Auditor:in.</fuer_wen>
  <was_rein>- Oberer Teil: 100→10 Toy-Beispiel mit 3 Achsen, damit Hamilton und Underfill lesbar bleiben.
- Unterer Teil: 6000→300 realistisches Beispiel mit <code>district × age_band × gender</code>, damit die Nutzer:innen ihr Verfahren wiedererkennen.
- Visualisierung der 5 Schritte aus <code>docs/stage1-algorithm.md</code>:
  1. Personen in Strata einsortieren.
  2. Strata deterministisch sortieren.
  3. Hamilton-Allokation als Balken "Quote / Floor / Rest / Zusatzplatz".
  4. Ziehung pro Stratum via Fisher-Yates + Mulberry32.
  5. Ausgabe- und Audit-Reihenfolge.
- Inline-Definitionen für Begriffe wie Stratum, Soll, Ist, Underfill, Seed.
- Ein expliziter "Bewusste Grenzen"-Block mit: kein IPF, keine Redistribution bei Underfill, PRNG nicht kryptographisch, soziale Mitigation via öffentliche Seed-Wahl.</was_rein>
  <was_raus>Kein interaktiver Solver-Simulator in V1; keine Formelbeweise; keine Roh-JSON-Beispiele im Lesefluss.</was_raus>
  <verlinkungen>- Repo: <code>docs/stage1-algorithm.md</code>, <code>packages/core/src/stage1/stratify.ts</code>, <code>packages/core/src/stage1/reporting.ts</code>.
- Extern: https://www.gesetze-im-internet.de/bmg/__46.html
- Extern: https://www.nature.com/articles/s41586-021-03788-6
- Extern: https://www.sortitionfoundation.org/how
- Extern: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32</verlinkungen>
  <vertrauen>Das Doppelbeispiel verhindert zwei typische Vertrauensbrüche: nur Spielzeug wirkt unrealistisch, nur 6000→300 wirkt unverständlich. Die Hamilton-Grafik macht die Rundung nachvollziehbar, statt sie als Black Box zu verstecken.</vertrauen>
</proposal>

<proposal id="P3" priority="must">
  <title>Ergänze im Ergebnisbereich einen "Warum dieses Ergebnis?"-Erklärpfad</title>
  <was>Eine kontextsensitive Erklärbox direkt am Stage-1-Ergebnis, die das konkrete Ergebnis mit der generellen Doku verbindet.</was>
  <wo>Neue Komponente unterhalb von <code>apps/web/src/stage1/AuditFooter.tsx</code> im Ergebnisbereich von <code>Stage1Panel.tsx</code>.</wo>
  <fuer_wen>Primär Verwaltungs-Mitarbeiter:in, sekundär Auditor:in.</fuer_wen>
  <was_rein>- Drei knappe Abschnitte:
  1. "Wie wurden die Zielzahlen pro Gruppe berechnet?"
  2. "Warum ist das Ergebnis reproduzierbar?"
  3. "Was bedeuten Warnungen / Underfills?"
- Deep links zu <code>/docs/algorithmus</code> und <code>/docs/verifikation</code>.
- Sichtbarer Hinweis, dass die Signatur die <code>selected_indices</code> bindet.
- Falls Underfills vorliegen: Link direkt zum Limitations-Abschnitt.</was_rein>
  <was_raus>Kein Volltext-Audit im UI; keine zusätzliche Tabelle, die die bestehende Stratum-Tabelle dupliziert.</was_raus>
  <verlinkungen>- Repo: <code>apps/web/src/stage1/AuditFooter.tsx</code>, <code>packages/core/src/stage1/types.ts</code>, <code>packages/core/src/stage1/audit-builder.ts</code>.
- Extern: https://www.gesetze-im-internet.de/bmg/__46.html</verlinkungen>
  <vertrauen>Vertrauen entsteht hier durch Nähe zum Ergebnis: genau dort, wo Skepsis entsteht, steht der Erklärpfad. Das reduziert den Sprung von "Download Audit-JSON" zu "ich verstehe, was ich prüfe".</vertrauen>
</proposal>

<proposal id="P4" priority="must">
  <title>Veröffentliche eine Reproduzierbarkeits-Seite mit Schritt-für-Schritt-Prüfanleitung</title>
  <was>Ein technischer Verifikationsleitfaden, der beschreibt, wie ein Auditor dieselbe Auswahl aus CSV, Achsen, N und Seed nachrechnet.</was>
  <wo>Route <code>/docs/verifikation</code>; zusätzlich verlinkt aus AuditFooter und Audit-Download-Buttons.</wo>
  <fuer_wen>Technische Auditor:in.</fuer_wen>
  <was_rein>- Voraussetzungen: Original-CSV, Audit-JSON, Seed, Achsen, Zielgröße.
- Prüfschritte:
  1. SHA-256 der CSV vergleichen.
  2. Stage-1-Audit-Felder prüfen.
  3. TS-CLI oder Python-Referenz laufen lassen.
  4. <code>selected_indices</code> und Strata-Tabelle vergleichen.
  5. Signatur verifizieren.
- Klare Trennung: "Was ein Fachprüfer ohne Code prüfen kann" vs. "Was ein technischer Auditor mit Repo prüfen kann".
- Ein Minimalbeispiel mit erwarteten Dateinamen.
- Hinweis auf Browser-Signaturalgorithmen Ed25519 mit ECDSA-Fallback.</was_rein>
  <was_raus>Kein Copy-Paste des gesamten Shell-Skripts; keine Dev-Setup-Anleitung für das ganze Monorepo.</was_raus>
  <verlinkungen>- Repo: <code>docs/stage1-algorithm.md</code>, <code>docs/stage1-validation-report.md</code>, <code>scripts/stage1_reference.py</code>, <code>scripts/stage1_cross_validate.sh</code>, <code>apps/web/src/stage1/audit-sign.ts</code>, <code>packages/core/src/stage1/types.ts</code>.
- Extern: https://www.nature.com/articles/s41586-021-03788-6</verlinkungen>
  <vertrauen>Diese Seite macht aus dem Audit-JSON ein prüfbares Verfahren statt ein Dekorationsartefakt. Der zentrale Claim ist reproduzierbare Nachvollziehbarkeit, nicht bloß statistische Plausibilität.</vertrauen>
</proposal>

<proposal id="P5" priority="should">
  <title>Lege eine Tech-Stack- und Build-Chain-Seite mit Versions-Pinning an</title>
  <was>Eine auditorfreundliche Technikseite, die Komponenten, Versionen, Rolle im Verfahren und Verifikationspfad tabellarisch auflistet.</was>
  <wo>Route <code>/docs/technik</code>; Link im Footer, im Auditbereich und im Dokumentations-Hub.</wo>
  <fuer_wen>Technische Auditor:in, sekundär power user in Verwaltungen.</fuer_wen>
  <was_rein>- Tabelle mit Spalten: Komponente, Version, Rolle, Laufzeitort, Verifikationsquelle.
- Muss sichtbar sein:
  Solid, Vite, Tailwind, TypeScript, PapaParse, Web Crypto, Mulberry32, Hamilton, Fisher-Yates.
- Referenzspalte für "im Produkt verwendet" vs. "nur Referenz / Validierung":
  Python-Referenz, Cross-Validation-Skript, Statistical Test.
- Ein zweiter Abschnitt "Warum diese Komponente für das Audit relevant ist".
- Versionen aus <code>package.json</code>, <code>apps/web/package.json</code>, <code>packages/core/package.json</code>; idealerweise buildseitig generiert, damit kein manuelles Drift-Risiko entsteht.</was_rein>
  <was_raus>Keine komplette npm-Lizenzliste im Fließtext; keine unsortierte Dependency-Dump-Seite.</was_raus>
  <verlinkungen>- Repo: <code>package.json</code>, <code>apps/web/package.json</code>, <code>packages/core/package.json</code>, <code>docs/bundle-size.md</code>, <code>docs/deploy.md</code>.
- Extern: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32</verlinkungen>
  <vertrauen>Auditoren brauchen keine Marketing-About-Seite, sondern eine überprüfbare Build Chain. Versions-Pinning erlaubt Aussagen wie "dieser Build nutzt exakt diese Abhängigkeit".</vertrauen>
</proposal>

<proposal id="P6" priority="should">
  <title>Dokumentiere Datenfeld-Grenzen und Rechtslogik auf einer BMG-Seite</title>
  <was>Eine kurze, klare Seite dazu, welche Felder in Stage 1 zulässig sind und warum bestimmte Quoten erst nach der Selbstauskunft kommen.</was>
  <wo>Route <code>/docs/datenfelder</code>; verlinkt aus dem bestehenden BMG-Hinweis in <code>Stage1Panel.tsx</code>.</wo>
  <fuer_wen>Primär Verwaltungs-Mitarbeiter:in.</fuer_wen>
  <was_rein>- Tabelle "Schon im Melderegister nutzbar" vs. "Erst nach Rückmeldung nutzbar".
- Ein FAQ-Eintrag: "Warum kann ich nicht nach Bildung stratifizieren?"
- Ein FAQ-Eintrag: "Warum ist Staatsangehörigkeit möglich, aber Migrationshintergrund nicht?"
- Ein schmaler Hinweis auf Zweckbindung und Löschpflicht als Prozesskontext.
- Bezug zum realen Zwei-Stufen-Workflow aus <code>sortition-tool/07-two-stage-workflow-analysis.md</code>.</was_rein>
  <was_raus>Kein allgemeines DSGVO-Handbuch; keine Rechtsberatung; keine landesrechtliche Vollständigkeit.</was_raus>
  <verlinkungen>- Repo: <code>research/03-legal-framework-and-best-practices.md</code>, <code>sortition-tool/07-two-stage-workflow-analysis.md</code>, <code>apps/web/src/stage1/Stage1Panel.tsx</code>.
- Extern: https://www.gesetze-im-internet.de/bmg/__46.html</verlinkungen>
  <vertrauen>Die Seite nimmt einen der wahrscheinlichsten Misstrauensmomente vorweg: "Warum fehlen manche Merkmale?" Offen kommunizierte Grenzen stärken Glaubwürdigkeit stärker als implizites Weglassen.</vertrauen>
</proposal>

<proposal id="P7" priority="should">
  <title>Führe ein kuratiertes Glossar und eine Quellenbibliografie ein</title>
  <was>Ein kontrolliertes Begriffs- und Quellenverzeichnis, das die Doku sprachlich stabil macht und Deep-Dive-Navigation vereinfacht.</was>
  <wo>Routes <code>/docs/glossar</code> und <code>/docs/quellen</code>; Glossar-Links per Tooltip oder Inline-Underline aus Algorithmus- und Verifikationsseiten.</wo>
  <fuer_wen>Beide.</fuer_wen>
  <was_rein>- Glossar-Einträge für: Stratum, Soll, Ist, Underfill, Seed, proportional, Hamilton, Fisher-Yates, Audit-JSON, Signatur, Quell-Hash.
- Zu jedem Begriff: Plain-German-Erklärung plus technischer Alias, z.B. "Soll = n_h_target".
- Bibliografie in drei Buckets:
  1. Recht.
  2. Methodik.
  3. Implementierung / Verifikation.
- Inline-Rückverweise "wofür diese Quelle relevant ist", nicht nur rohe Linkliste.</was_rein>
  <was_raus>Kein enzyklopädisches Deliberations-Lexikon; keine Literaturseite ohne Nutzungskontext.</was_raus>
  <verlinkungen>- Repo: <code>docs/stage1-algorithm.md</code>, <code>docs/stage1-validation-report.md</code>.
- Extern: https://www.nature.com/articles/s41586-021-03788-6
- Extern: https://www.sortitionfoundation.org/how
- Extern: https://www.sortitionfoundation.org/ecps_methodology
- Extern: https://www.oecd.org/en/publications/innovative-citizen-participation-and-new-democratic-institutions_339306da-en/full-report/component-14.html
- Extern: https://www.gesetze-im-internet.de/bmg/__46.html</verlinkungen>
  <vertrauen>Vertrauen profitiert von konsistenter Sprache. Ein Glossar reduziert Fehlinterpretation zwischen Verwaltungslogik und technischer Logik; die Bibliografie zeigt, dass die Produktaussagen nicht frei erfunden sind.</vertrauen>
</proposal>

<proposal id="P8" priority="could">
  <title>Mache die In-App-Doku druckfreundlich statt einen eigenen PDF-Export zu bauen</title>
  <was>Print-CSS für die Dokumentationsseiten, damit Verwaltungen die Kernseiten als PDF drucken können, ohne ein zweites Export-System zu pflegen.</was>
  <wo>Globales Print-Styling in <code>apps/web/src/index.css</code>; betrifft <code>/docs</code>, <code>/docs/algorithmus</code>, <code>/docs/verifikation</code>.</wo>
  <fuer_wen>Beide, vor allem Verwaltungen mit Akten- oder Sitzungslogik.</fuer_wen>
  <was_rein>- Druckmodus blendet Navigation, Buttons, Tooltips aus.
- Druckmodus zeigt Quellen-URLs ausgeschrieben.
- Seitenkopf mit Dokumenttitel, Stand und Repo-/Build-Hinweis.
- Optional ein "Für Prüfakte drucken"-Link, der einfach <code>window.print()</code> auslöst.</was_rein>
  <was_raus>Kein eigener PDF-Renderer; keine Word- oder ODT-Exportfunktion im ersten Schritt.</was_raus>
  <verlinkungen>- Repo: <code>apps/web/src/index.css</code>, <code>apps/web/src/stage1/AuditFooter.tsx</code>.</verlinkungen>
  <vertrauen>Print-Fähigkeit ist hier kein Komfort-Feature, sondern ein Verwaltungs-Signal: die Doku lässt sich in Vergabe-, Prüf- oder Ratsunterlagen übernehmen, ohne ihren Quellenbezug zu verlieren.</vertrauen>
</proposal>

</proposals>

<question_answers>
<answer id="1">Nutze beide Beispiele. Das 100→10-Toy-Beispiel erklärt die Mechanik, das 6000→300-Beispiel legitimiert die Relevanz. Hamilton sollte visuell als vier Spalten gezeigt werden: Poolanteil, Quote, Floor, Rest/Zusatzplatz. Ein interaktiver Playground ist für V1 nicht nötig; besser eine statische Walkthrough-Seite plus ein kleiner "anderes N ausprobieren"-Mini-Widget in V2.</answer>
<answer id="2">Sichtbar sein sollten Laufzeit-Stack, Audit-Stack und Referenz-Stack, jeweils mit Versions-Pinning. Das gehört auf eine eigene Route <code>/docs/technik</code> und zusätzlich als Footer-Link. Format: Tabelle, nicht Prosa. Ja, Versionen sollten explizit sein, idealerweise buildseitig aus <code>package.json</code> generiert.</answer>
<answer id="3">Die richtige Struktur ist drei Ebenen, aber nicht als Tabs: Überblick auf <code>/docs</code>, Details auf thematischen Unterseiten, Quellen als letzte Ebene. Tabs verstecken Inhalte zu stark; besser einzelne Seiten mit Inline-Glossar und klaren Deep Links.</answer>
<answer id="4">Die stärksten Vertrauenssignale gehören an zwei Orte: oberhalb des Folds im Dokumentations-Hub und direkt am Ergebnis im Stage-1-Resultat. Empfohlene Claims: byte-identische TS↔Python-Validierung, signiertes Audit mit gebundenen Indizes, keine Serverübertragung. Jeder Claim braucht sofort einen "Mehr prüfen"-Link.</answer>
<answer id="5">Pflichtlinks: Nature 2021, BMG §46, Sortition Foundation Methodik, OECD-Handbuch, Mulberry32-Referenz. Nice-to-have: konkrete Bundestag-/Praxisbeispiele und eine apportionment-Referenz für Hamilton. Die App sollte sowohl Inline-Links pro Sektion als auch eine kuratierte Bibliografie-Seite haben; nur eins von beiden ist zu schwach.</answer>
<answer id="6">Für die Erklärdoku sollte synthetische, stilisierte Gemeinde-Daten verwendet werden, nicht echte Daten und auch nicht live generierte Zahlen als erste Darstellung. Das Beispiel "3 Bezirke × 7 Altersgruppen × 3 Geschlechter" ist gut, solange nur wenige exemplarische Zellen im Detail gezeigt werden. Die BMG-§46-Grenze sollte explizit erklärt werden, inklusive der Frage "warum nicht Bildung?".</answer>
<answer id="7">Ja. Die Reproduzierbarkeits-Anleitung sollte als eigene Seite <code>/docs/verifikation</code> leben, nicht als Appendix auf der Algorithmus-Seite. Der Audit-Footer und der Audit-Download sollten dorthin verlinken. Sonst geht die technische Zielgruppe im narrativen Erklärtext unter.</answer>
<answer id="8">Offen kommuniziert werden sollten: kein IPF, keine Underfill-Redistribution, keine Cross-Stratum-Minima, PRNG nicht kryptographisch, soziale Seed-Mitigation. Die Kommunikationsregel sollte sein: Grenzen in einem eigenen Block "Bewusste Designentscheidungen", nicht als verstreute Warnhinweise. Für nicht-technische Nutzer reicht je Limitierung ein Satz plus "warum wir das trotzdem so tun".</answer>
<answer id="9">Das beste Layout ist eine narrative Hauptspalte mit einer rechten Sidebar für Definitionsboxen, Trust-Signale und Quellenanker. Das passt besser als Tabs, weil Verwaltungsnutzer linear lesen und Auditoren punktuell abspringen. Auf mobil sollte die Sidebar unter den Abschnittstitel fallen.</answer>
<answer id="10">Ja, eine eigene <code>/docs</code>-Route ist richtig. Zusätzlich sollten Stage 1 und der Auditbereich kontextuelle Links in die passenden Unterseiten setzen. Nur globale Navigation wäre zu versteckt; nur Inline-Hilfen wären zu fragmentiert.</answer>
<answer id="11">Ja, ein Glossar lohnt sich. Es sollte als eigene Route existieren und zusätzlich über Inline-Hilfen erreichbar sein. Besonders wichtig sind kontrollierte Begriffspaare wie "Soll = n_h_target", "Ist = n_h_actual", "Bevölkerungsgruppe / Stratum".</answer>
<answer id="12">Die Doku sollte druckfreundlich sein, aber kein eigener PDF-Export in V1. Print-CSS liefert fast den ganzen Nutzen mit deutlich weniger Wartung. Ein echter PDF-Export lohnt erst, wenn Verwaltungen ihn regelmäßig für Akten oder Vorlagen brauchen.</answer>
</question_answers>

<top_priority_recommendations>
<recommendation>Wenn nur 2 PT verfügbar sind, zuerst P1, P2 und P4 umsetzen. Damit stehen Hub, Algorithmus-Erklärung und Verifikationspfad, also genau die Kombination aus Vertrauensaufbau und nachvollziehbarer Prüfung.</recommendation>
<recommendation>Falls noch ein halber PT übrig bleibt, P3 direkt im Ergebnisbereich ergänzen. Dort entsteht die höchste Nutzeraufmerksamkeit und damit der größte Vertrauenseffekt pro investierter Zeit.</recommendation>
</top_priority_recommendations>

<watch_outs>
<watch_out>Vermeide eine einzige monolithische "Alles über den Algorithmus"-Seite. Das erschlägt Verwaltungsnutzer und hilft Auditoren trotzdem nicht gezielt.</watch_out>
<watch_out>Vermeide unpräzise Vertrauensclaims wie "fair" oder "transparent" ohne prüfbaren Beleg. Jede starke Aussage braucht einen Link auf Audit, Validierung oder Quelle.</watch_out>
<watch_out>Verstecke Limitierungen nicht im Kleingedruckten. Gerade offene Kommunikation über Underfill und Seed-Logik ist ein Glaubwürdigkeitsgewinn.</watch_out>
<watch_out>Baue keine manuell gepflegte Tech-Liste. Wenn Versionen nicht aus dem Build kommen, wird die Auditorseite sehr schnell falsch.</watch_out>
<watch_out>Nutze keine echten oder realistisch re-identifizierbaren Gemeindedaten in Beispielen. Die Doku sollte mit synthetischen, erklärungsoptimierten Datensätzen arbeiten.</watch_out>
</watch_outs>

<verdict value="ideation_complete">
  <summary>Die richtige Scope-Entscheidung ist eine kleine, aber klar strukturierte In-App-Dokumentationsarchitektur: ein Hub unter <code>/docs</code>, eine narrative Algorithmus-Seite mit Doppelbeispiel, eine separate Verifikationsseite für Auditoren und eine versionsgepinnt auditierbare Technikseite. Der Kern ist progressive Disclosure mit belegten Vertrauenssignalen direkt im Produkt: Nicht mehr Text, sondern bessere Platzierung von Validierung, Quellen, Limitierungen und Reproduzierbarkeit.</summary>
</verdict>

</review>

<verdict value="pass" critical="0" high="0" medium="0">
Ideation review completed in the requested XML structure with concrete in-app documentation proposals, grounded in repo evidence and external citations.
</verdict>

