---
review_of: in-app-docs-ideation
review_type: topic
review_mode: topic
review_topic: In-app docs ideation for Stage 1 algorithm + tech-stack audit
reviewed_at: 2026-04-26T12-59-15Z
tool: claude
model: claude-opus-4-7
duration_seconds: 415
---

# Ideation Review — In-App-Dokumentation Stage 1

**Reviewer:** Claude (Opus 4.7)
**Datum:** 2026-04-26
**Modus:** Ideation (kein Pass/Fail; Vorschläge zum Aufgreifen)

Grundlage: `docs/stage1-algorithm.md`, `docs/stage1-validation-report.md`, `docs/audit-schema.json`, `apps/web/src/App.tsx`, `apps/web/src/stage1/Stage1Panel.tsx`, `apps/web/src/stage1/AuditFooter.tsx`, `sortition-tool/08-product-redesign.md`, `sortition-tool/07-two-stage-workflow-analysis.md`, `research/03-legal-framework-and-best-practices.md`.

Leitgedanke: Die App muss zwei Lese-Pfade gleichzeitig bedienen, ohne sie ineinander zu verbauen — den **Sitzungs-Pfad** (Bürgermeister + Verwaltung + Gemeinderat sitzen vor dem Bildschirm und müssen in 2 Minuten verstehen, was passiert), und den **Audit-Pfad** (technische Auditor:in liest Wochen später ein heruntergeladenes Audit-JSON und will jede Behauptung gegenprüfen). Der Sitzungs-Pfad braucht Zuversicht, der Audit-Pfad braucht Tiefe. Die heute vorliegenden Markdown-Dokumente decken den Audit-Pfad zu ~80 % ab, sind aber nicht in der App. Der Sitzungs-Pfad existiert bisher nur implizit über UI-Hinweise (Seed-Hinweis, BMG-Hinweis, AuditFooter).

<review>

<proposals>

<proposal id="P1" priority="must">
  <title>Drei-Schichten-Routing /docs (Überblick / Detail / Quelle)</title>
  <was>Eine eigene Doku-Sektion in der SPA mit drei festen Routen pro Thema: `/docs/algorithmus` (5-Min-Lesefassung für die Sitzung), `/docs/algorithmus/details` (vollständige Spezifikation, eingebettet aus `docs/stage1-algorithm.md`), `/docs/algorithmus/verifizieren` (CLI-Reproduktionsanleitung). Gleiches Drei-Schichten-Muster für `/docs/audit`, `/docs/datenschutz`, `/docs/methodik`.</was>
  <wo>Neuer SPA-Top-Level-Tab in `apps/web/src/App.tsx` neben "Stage 1" und "Stage 3" — Tab-Label "Dokumentation". Routing über minimalen Hash-Router (Solid Router ist optional; Hash-Routing reicht für statisches Hosting und macht Deep-Links per E-Mail teilbar). Komponenten unter `apps/web/src/docs/`.</wo>
  <fuer_wen>Beide. Schicht 1 für Verwaltungs-Mitarbeiter:in (5-Min-Lese-Niveau, deutsche Klartext-Bilder), Schicht 2/3 für technische Auditor:in.</fuer_wen>
  <was_rein>
  - Pro Thema genau drei Seiten mit gleichbleibendem Header-Muster ("Worum geht's", "Was Sie als Nächstes lesen können", Breadcrumb)
  - Schicht 1 max. 400 Wörter, ein Beispiel, zwei Diagramme, vier Außenlinks
  - Schicht 2 = der Inhalt aus `docs/stage1-algorithm.md` 1:1 als MDX/MD-Komponente eingebunden (single source of truth — kein paralleler Dokumentationsstand!)
  - Schicht 3 = Reproduktions-Befehle als kopier-fähige Code-Blöcke
  - Nav links unten "Weiterlesen: Schicht 2 →" / "Weniger Detail: Schicht 1 ←"
  </was_rein>
  <was_raus>
  - Keine Eingaben/Forms in `/docs` (kein "Try it live"-Embed der Stage1Panel — würde State-Management durcheinanderbringen). Stattdessen Beispiel-CSV als Download verlinken.
  - Keine Abhängigkeit von Server-side Rendering — die App bleibt statisch ausgeliefert (`sortition-tool/08-product-redesign.md` Zeile 4).
  - Keine eigene Dokumentations-Engine (Docusaurus, VitePress) — fügt 200 KB+ Bundle und einen zweiten Build-Pfad hinzu.
  </was_raus>
  <verlinkungen>Innerhalb der Schicht 2 alle bestehenden Links aus `docs/stage1-algorithm.md` Zeilen 187-191. Extern aus Schicht 1: <https://www.gesetze-im-internet.de/bmg/__46.html>, <https://www.sortitionfoundation.org/how>, <https://www.oecd.org/governance/innovative-citizen-participation/>.</verlinkungen>
  <vertrauen>Single source of truth: das Markdown-Dokument im Repo ist auch das in der App gerenderte. Auditor und Quellcode-Leser sehen identische Inhalte; kein "in der App steht X, im Repo Y"-Drift.</vertrauen>
</proposal>

<proposal id="P2" priority="must">
  <title>Algorithmus-Walkthrough mit zwei Beispielen (Klein + Realistisch)</title>
  <was>Eine Seite `/docs/algorithmus` mit zwei nebeneinander gestellten, **statischen** Beispielen: Beispiel A = "100 → 10 mit 2 Achsen" (Gemeinderat kann es im Kopf nachrechnen), Beispiel B = "6.000 → 300 mit 3 Achsen" (realistischer Stadt-Maßstab). Beide Beispiele zeigen alle 5 Schritte aus `docs/stage1-algorithm.md` mit echten Zahlen — bucketize → lex-sort → Hamilton → Fisher-Yates → Output.</was>
  <wo>`apps/web/src/docs/algorithmus/Walkthrough.tsx`. Verlinkt aus Stage1Panel über einen kleinen "Wie funktioniert das?"-Link neben der Überschrift "Schritt 1 von 3 — Versand-Liste ziehen".</wo>
  <fuer_wen>Vor allem Verwaltungs-Mitarbeiter:in. Schicht-1-Tiefe; Auditor wird auf Schicht 2 weitergeleitet.</fuer_wen>
  <was_rein>
  - Beispiel A wird im Browser **deterministisch beim Seitenaufruf gerechnet** (mit festem Seed 42 und einem 100er Pool, der mit `generatePool` synthetisch erzeugt wird). Pool und Resultat fest in der Komponente — niemand bedient Eingaben.
  - Hamilton-Schritt visuell: ein gestapeltes Säulen-Diagramm mit "Quote", "floor", "+1 vom Rest" pro Stratum. Inline-SVG, keine D3-Library (Bundle-Budget — siehe `docs/bundle-size.md`).
  - Fisher-Yates-Schritt als animierte oder schritt-für-schritt aufklappbare Liste — ein 5er-Array, das man drei Swaps lang verfolgen kann. Animation per CSS, kein JS-Framework.
  - Beispiel B als reine Tabelle (Stratum, Pool, Soll, Ist) plus Markdown-Bericht-Vorschau, **identisch zur tatsächlichen App-Ausgabe**.
  - Am Ende ein "Probieren Sie es selbst"-Button, der die `kleinstadt-bezirkshauptort`-Profil-CSV direkt in den Stage1Panel lädt und Beispiel B reproduziert.
  </was_rein>
  <was_raus>
  - Keine echten Gemeinde-Daten (PII, Datenschutz). Nur synthetische Pools aus `packages/core/src/pool/` Profilen.
  - Keine interaktive Variation der Achsen oder Seeds auf dieser Seite — das passiert im Stage1Panel selbst. Doppelte Eingaben verwirren.
  - Keine Formelpyramide. Mathematik bleibt Schicht-2-Inhalt. Schicht 1 sagt "Pro Bevölkerungsgruppe wird der proportionale Anteil berechnet, gerundet, und der Rest wird auf die größten Bruchteile verteilt." Mehr nicht.
  - Keine Sainte-Laguë / d'Hondt Diskussion in Schicht 1 (das gehört zu Schicht 2 / `stage1-algorithm.md` Z. 77).
  </was_raus>
  <verlinkungen><https://en.wikipedia.org/wiki/Largest_remainders_method>, <https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle>, <https://www.nature.com/articles/s41586-021-03788-6> (Flanigan et al. — als Methodik-Anker für "warum überhaupt zufällig stratifiziert").</verlinkungen>
  <vertrauen>Beispiel B ist mit denselben Funktionen gerechnet wie Stage1Panel — niemand kann der App vorwerfen, "in der Doku steht ein anderer Algorithmus als im Code". Die Walkthrough-Komponente importiert direkt aus `@sortition/core/stage1`.</vertrauen>
</proposal>

<proposal id="P3" priority="must">
  <title>Tech-Stack-Seite mit Versions-Pinning aus Build-Time-Manifest</title>
  <was>Eine Route `/docs/tech` mit einer maschinell aus `package.json`-Dateien generierten Tabelle aller Laufzeit-Abhängigkeiten, ihrer Versionen, Lizenzen, Quellrepos und Rollen ("Solver", "PRNG", "Signatur", "CSV-Parsing"). Version wird **zur Build-Zeit** in eine `tech-manifest.json` geschrieben und im SPA importiert.</was>
  <wo>Vite-Plugin oder `scripts/build-tech-manifest.ts` schreibt nach `apps/web/src/generated/tech-manifest.ts`. Komponente `apps/web/src/docs/tech/TechStack.tsx` rendert es. Footer-Link aus jeder Seite ("Erstellt mit ... — Bauteile prüfen").</wo>
  <fuer_wen>Primär technische Auditor:in. Sichtbar über Footer-Link (kein "Audit"-Tab im Top-Nav, das wäre Lärm). Verwaltungs-Mitarbeiter:in soll wissen, **dass es existiert** ("Möchten Sie die Bauteile prüfen?"), muss es aber nicht öffnen.</fuer_wen>
  <was_rein>
  - Tabelle: Paket | Version | Lizenz | Quelle (verlinkt auf npmjs.com + GitHub) | Rolle | Im Build aktiv?
  - Drei Gruppierungen: "Solver / Mathematik" (highs.wasm), "Signatur / Krypto" (Web Crypto API — kein npm-Paket; Browser-Native), "Framework" (Solid, Vite, Tailwind), "Build-Tools" (TypeScript, Vitest, pnpm).
  - Jede Zeile: GitHub-Commit-SHA des aktuellen Builds (zur Build-Zeit injected — `vite-plugin-git-revision`-equivalent oder eigener 10-Zeiler).
  - Sektion "Eingebunden, aber nicht im Browser" für `sortition-algorithms`, `scripts/stage1_reference.py` — als Referenz-Implementationen markiert mit Link zum Repo-Pfad.
  - Reproduktions-Hinweis: "Dieser Build kann auf Bytes verifiziert werden mit `pnpm install --frozen-lockfile && pnpm build` aus Commit `abc1234`. Der Output-Hash ist `sha256-...`."
  </was_rein>
  <was_raus>
  - Keine Dev-Dependencies (eslint, prettier, vitest-Plugins) — irrelevant für ausgelieferten Browser-Code, blähen die Tabelle auf.
  - Keine transitiven Abhängigkeiten in der Default-Ansicht. Optional ein "Vollständige `pnpm-lock.yaml` ansehen"-Link.
  - Keine Lizenz-Volltexte inline. Lizenzname als Link auf SPDX reicht.
  </was_raus>
  <verlinkungen>Pro Paket: <https://www.npmjs.com/package/{name}>, GitHub-Repo. Für Web Crypto: <https://www.w3.org/TR/WebCryptoAPI/>. Für SPDX-Lizenzkürzel: <https://spdx.org/licenses/>.</verlinkungen>
  <vertrauen>Auditor kann gegenprüfen: "Ja, der ausgelieferte JS-Bundle enthält highs@1.x mit Lizenz MIT, der hash der wasm-Datei ist Y, mein heruntergeladenes Build reproduziert dieselbe Datei." Bringt Provenance auf Build-Ebene — nicht nur auf Lauf-Ebene.</vertrauen>
</proposal>

<proposal id="P4" priority="must">
  <title>Vertrauen-Strip auf der Stage-1-Landeseite (3 Karten + 1 Link)</title>
  <was>Direkt unter dem `<header>` des Stage1Panel ein einzelner, schmaler horizontaler Streifen mit drei Vertrauens-Signalen als Karten — ohne dass der Workflow blockiert wird oder Scrollen nötig ist.</was>
  <wo>`apps/web/src/stage1/Stage1Panel.tsx` zwischen Zeilen 233 und 235 (nach dem Step-Header, vor dem Upload). Eigene Komponente `TrustStrip.tsx` mit drei Karten und `<details>`-Erweiterungen.</wo>
  <fuer_wen>Beide. Verwaltungs-Mitarbeiter:in sieht die Behauptung in einem Satz; Auditor klickt auf "→ Details" und landet in Schicht 2/3.</fuer_wen>
  <was_rein>
  - Karte 1: "**Open Source, GPL-3.0** — der Quellcode ist vollständig einsehbar." → Link auf GitHub-Repo + commit-SHA.
  - Karte 2: "**Algorithmus byte-identisch validiert** — geprüft gegen eine unabhängige Python-Referenz auf 21 Setups." → Link auf `/docs/methodik/validierung` (rendert `docs/stage1-validation-report.md`).
  - Karte 3: "**Datei verlässt den Browser nicht** — keine Server, keine Cloud, keine Tracking." → Link auf `/docs/datenschutz`.
  - Optional vierte mini-Karte: "**Statistisch unbiased** — 2.000-Trials-Test, max |z|=3,72." Aber nur wenn der Strip nicht überfüllt wird; sonst ein dezenter "→ alle Vertrauenssignale" am Ende.
  </was_rein>
  <was_raus>
  - Keine Modals oder Pop-ups. Nur statisches Rendering, klickbare Karten verlinken auf Doku-Seiten.
  - Keine Vertrauens-Sätze ohne Beleg-Link. Jede Aussage muss auf eine Quell-Seite verlinken.
  - Kein Score / Rating / Sterne — wirkt wie SaaS-Marketing und beschädigt Glaubwürdigkeit.
  </was_raus>
  <verlinkungen>Alle Links bleiben In-App; externe Verweise erst auf der Detail-Seite. So bleibt der Strip leicht.</verlinkungen>
  <vertrauen>Drei verifizierbare Behauptungen mit Belegketten. Verwaltungs-Mitarbeiter:in muss nicht klicken, um beruhigt zu sein; Auditor:in kann jederzeit nachklicken.</vertrauen>
</proposal>

<proposal id="P5" priority="should">
  <title>Reproduktions-Anleitung als ausklappbarer Block direkt im AuditFooter</title>
  <was>Erweiterung der bestehenden `AuditFooter.tsx` um einen einklappbaren `<details>`-Block "Wie kann ich diese Auswahl reproduzieren?" mit konkreten kopier-fähigen Befehlen, die genau die soeben gezogene Selektion mit Python wiederholen.</was>
  <wo>`apps/web/src/stage1/AuditFooter.tsx` direkt unter dem bestehenden italic-Hinweis (Zeile 96-100). Nicht in einer eigenen Doku-Seite — der Auditor:in steht direkt vor dem Lauf-Resultat und denkt "kann ich das prüfen?". Genau dort muss die Antwort sein.</wo>
  <fuer_wen>Technische Auditor:in. Verwaltungs-Mitarbeiter:in sieht das `<details>` nur, wenn sie aktiv darauf klickt — kein visueller Lärm.</fuer_wen>
  <was_rein>
  - Vier nummerierte Schritte, jeder mit Code-Block:
    1. "Audit-JSON herunterladen" (passiert eh schon).
    2. "CSV-Eingabe rekonstruieren" — der SHA-256-Hash der ursprünglichen CSV ist im Audit, der Auditor muss diese Datei separat besorgen.
    3. `python scripts/stage1_reference.py --input pool.csv --axes <axes-aus-audit> --target-n <N> --seed <seed> --output-json out.json` — Werte aus dem aktuellen Audit als Platzhalter eingesetzt.
    4. "Indizes vergleichen" — `diff <(jq '.selected_indices' audit.json) <(jq '.selected_indices' out.json)`.
  - Verweis auf `scripts/stage1_cross_validate.sh` für die Bulk-Reproduktion.
  - Aussage: "Die Indizes müssen byte-identisch sein. Wenn nicht, ist mindestens eines verändert: CSV, Achsen, N, Seed, oder Algorithmus-Version."
  </was_rein>
  <was_raus>
  - Keine Browser-internen Reproduktions-Versuche ("klick hier zum Replay") — das gibt nur Vertrauen in eine Engine, nicht in zwei unabhängige.
  - Keine ausführliche Python-Setup-Anleitung — Link auf `scripts/README.md` reicht. Auditor:innen wissen, wie man Python startet.
  - Kein Hinweis "Sie brauchen kein Python" — würde dem Sinn der unabhängigen Verifikation widersprechen.
  </was_raus>
  <verlinkungen>GitHub-Pfad zu `scripts/stage1_reference.py` und `scripts/stage1_cross_validate.sh` (mit Commit-SHA).</verlinkungen>
  <vertrauen>Verifikation ist nicht "Trust the Audit-JSON", sondern "Reproduce the Audit-JSON with a different implementation". Das ist die stärkste verfügbare Vertrauensbasis.</vertrauen>
</proposal>

<proposal id="P6" priority="should">
  <title>Inline-Glossar-Tooltips über `<dfn>`-Pattern</title>
  <was>Acht bis zwölf Schlüsselbegriffe (Stratum, Bevölkerungsgruppe, Soll, Ist, Pool, Hamilton-Methode, Fisher-Yates, PRNG, Mulberry32, Seed, Codepoint-Sortierung, Underfill) bekommen ein einheitliches `<Glossar term="...">`-Wrapping. On-hover/click ein kleiner Tooltip mit 1-Satz-Definition + Link zu `/docs/glossar#term`.</was>
  <wo>Komponente `apps/web/src/docs/Glossar.tsx` exportiert `<Term>` und eine Vollseite. Termsdaten in einer einzigen JSON-Datei `apps/web/src/docs/glossar.json`. Verwendung in Stage1Panel, AuditFooter, AxisBreakdown, Walkthrough.</wo>
  <fuer_wen>Beide — der gleiche Mechanismus dient beiden Lese-Pfaden gut. Verwaltungs-Mitarbeiter:in bekommt schnell eine Klartext-Definition, Auditor:in den Sprung in die Spezifikation.</fuer_wen>
  <was_rein>
  - Konsistente Doppelnennung: in der UI immer "Bevölkerungsgruppe (Stratum)", "Soll (n_h_target)", "Ist (n_h_actual)" — wie bereits in `Stage1Panel.tsx` Zeile 682. Glossar definiert beide.
  - Einträge mit drei Feldern: Klartext-Definition (1 Satz), Formal-Definition (1 Satz), Querverweis auf Algorithmus-Schritt.
  - Vollseite `/docs/glossar` als alphabetische Liste — durchsuchbar, druckbar.
  </was_rein>
  <was_raus>
  - Kein automatisches Auto-Linking jeder Wort-Erwähnung (würde Lese-Fluss stören). Termen werden manuell pro Stelle gewrappt.
  - Keine externen Wikipedia-Tooltips — inline-Tooltip enthält nur die App-eigene Definition mit App-Konvention. Externe Quellen leben im `verlinkungen`-Block der Algorithmus-Seite.
  - Kein zweisprachiges Glossar (DE/EN) — die App ist deutsch (siehe `CLAUDE.md` "Sprache der Dokumente: Deutsch").
  </was_raus>
  <verlinkungen>Pro Term ein Schicht-2-Anker (z.B. "Hamilton-Methode → /docs/algorithmus/details#schritt-3"). Externe Links nur auf der Glossar-Vollseite, nicht im Tooltip.</verlinkungen>
  <vertrauen>Glossar etabliert das **gemeinsame Vokabular** zwischen UI, Audit-JSON und Doku — wenn der Audit-JSON `n_h_target` enthält und die UI "Soll" sagt, muss die Auditor:in die Brücke nicht selbst schlagen.</vertrauen>
</proposal>

<proposal id="P7" priority="should">
  <title>BMG §46 Erklärseite "Warum kann ich nicht nach Bildung stratifizieren?"</title>
  <was>Eigene Doku-Seite `/docs/methodik/bmg-46`, die das Limit der Eingangsdaten konkret erklärt: das Melderegister enthält **nur** ID, Bezirk, Geschlecht, Alter, Staatsangehörigkeit; alles andere kommt erst nach Selbstauskunft (Stage 2/3) hinzu.</was>
  <wo>Verlinkt aus dem bestehenden Hinweis-Aside in `Stage1Panel.tsx` Zeile 273-292 (statt nur auf gesetze-im-internet.de zu zeigen, soll der Link **zuerst** auf die App-Erklärseite gehen, die dann auf den Gesetzestext weiterleitet). Außerdem Link aus dem AxisPicker, falls jemand versucht, eine Achse zu wählen, die nicht im typischen Melderegister-Schema vorkommt.</wo>
  <fuer_wen>Verwaltungs-Mitarbeiter:in primär. Sekundär für Audit-Begründung (Auditor:in kann fragen "warum nur 3 Achsen verfügbar?").</fuer_wen>
  <was_rein>
  - Tabelle: erlaubte Stratifikations-Felder mit gesetzlicher Quelle (BMG §46 Abs. 1).
  - Tabelle: typische Bürgerrats-Quoten-Felder (Bildung, Migrationshintergrund, Beruf), die **nicht** in Stage 1, sondern in Stage 3 ausgewertet werden.
  - "Warum diese Trennung?" — kurzer Absatz aus `research/03-legal-framework-and-best-practices.md` zitiert.
  - Verweis nach vorne: "Im nächsten Schritt (Stage 3 / Panel ziehen) können Sie auf Bildung, Migrationshintergrund etc. quotieren — das sind dann Felder aus der Selbstauskunft."
  </was_rein>
  <was_raus>
  - Keine Rechtsberatung. Kein Disclaimer-Theater ("dies ist keine Rechtsberatung" als Block-Banner) — Quellen-Links und nüchterne Sprache reichen.
  - Keine Diskussion von §46-Reform-Entwürfen oder politischer Kritik am Melderegister — nicht App-Scope.
  - Keine andere EU-Länder-Vergleiche (nur DE-Fokus, mit AT-Verweis am Ende).
  </was_raus>
  <verlinkungen><https://www.gesetze-im-internet.de/bmg/__46.html>, <https://dejure.org/gesetze/BMG/46.html>, OECD-Innovative-Citizen-Participation-Methodik (PDF-URL aus `research/03`), AT-Pendant ZMR.</verlinkungen>
  <vertrauen>Erklärt den Unterschied zwischen "wir wollen das nicht" und "wir dürfen das nicht" — beantwortet vorab die häufigste Verwaltungs-Frage und entlastet die Sitzung.</vertrauen>
</proposal>

<proposal id="P8" priority="should">
  <title>Limitations-Seite mit "ehrlich, aber nicht alarmierend"-Ton</title>
  <was>Eine Seite `/docs/methodik/grenzen`, die alle bewussten Limitationen aus `docs/stage1-algorithm.md` Z. 133-139 in Klartext bringt: kein Soft-Constraint, keine Underfill-Redistribution, kein Cross-Stratum-Minimum, Mulberry32 nicht krypto-grade.</was>
  <wo>Verlinkt aus dem TrustStrip ("Was kann das Tool nicht?") und aus dem Underfill-Banner im Stage1Panel ("Mehr zu Unterbesetzung →").</wo>
  <fuer_wen>Beide. Verwaltungs-Mitarbeiter:in muss verstehen, **warum** Underfill auftritt (fix begrenzter Pool) und **warum** das ein Feature ist (Sichtbarkeit), nicht ein Bug. Auditor:in muss die Mulberry32-Diskussion mit der sozialen Mitigation (öffentlicher Seed-Vereinbarung) sehen.</fuer_wen>
  <was_rein>
  - Pro Limitation: ein-Satz-Beschreibung, ein-Satz-Begründung ("warum ist das so"), ein-Satz-Auswirkung ("was bedeutet das für mich").
  - Mulberry32-Sektion: Seed-Bias-Risiko + soziale Mitigation aus `docs/stage1-algorithm.md` Z. 139 Wort für Wort.
  - "Wann reicht Stage 1 nicht?" — eindeutige Liste: bei harten Quoten, bei kleinen Strata mit Bildungsanforderung, bei mehrstufigem Verfahren mit Reserve-Liste (verweist auf Stage 3 + Issue #48).
  - Tonalität: keine Verharmlosung, keine Übertreibung. Beispielsatz: "Wenn 3 Personen aus einem Stratum gezogen werden sollen, das Pool aber nur 2 Personen enthält, werden alle 2 angeschrieben — die fehlende dritte wird nicht woanders kompensiert. Das ist gewollt: das Verfahren bleibt mathematisch sauber, und die Verwaltung sieht im Bericht, dass diese Bevölkerungsgruppe untervertreten ist."
  </was_rein>
  <was_raus>
  - Keine Vergleiche zu kommerziellen Sortition-Tools mit IPF — nicht App-Scope, riecht nach Marketing.
  - Keine FUD-Sprache ("Achtung, deterministisches PRNG ist kryptografisch unsicher!") — der Kontext ist nicht Krypto, der Kontext ist eine öffentliche Verfahrens-Sitzung.
  - Keine Versprechen "in Zukunft kommt IPF" — Zukunfts-Plan gehört in Issues, nicht in End-User-Doku.
  </was_raus>
  <verlinkungen>Sortition-Algorithms-Library für Cross-Stratum-Constraints in Stage 3, Cochran §5.5 für Hamilton-Theorie, IPF-Wikipedia-Artikel (für Auditor:innen, die mehr wollen).</verlinkungen>
  <vertrauen>Offene Limitations-Kommunikation ist der **stärkste** Vertrauens-Anker — Tools, die Limits verstecken, verlieren den Audit. Tools, die Limits dokumentieren, gewinnen ihn.</vertrauen>
</proposal>

<proposal id="P9" priority="could">
  <title>"Print-freundliche" Doku-Seiten mit eigenem CSS-Profil</title>
  <was>Alle `/docs`-Seiten bekommen ein eigenes Print-CSS, sodass eine Verwaltungs-Mitarbeiter:in vor einer Sitzung mit einem Klick eine 2-3-seitige Methodik-PDF erzeugen kann (per Browser-PDF-Export — kein PDF-Library-Bundle).</was>
  <wo>`apps/web/src/index.css` Print-Section erweitern (analog zum bestehenden Print-Verhalten in `Stage1Panel.tsx` Z. 528). Neue Klasse `.docs-page` als Container.</wo>
  <fuer_wen>Verwaltungs-Mitarbeiter:in. Auditor:in nutzt eher das Repo-Markdown direkt.</fuer_wen>
  <was_rein>
  - Druck-CSS versteckt: Top-Nav, Footer-Links, In-App-Tooltips.
  - Druck-CSS rendert: URL hinter jedem `<a>` als `(URL)`-Annotation, fixe Schriftgrad-Hierarchie, Seitenumbrüche vor `<h2>`.
  - Eine "Druckansicht"-Schaltfläche pro Doku-Seite (analog zu Stage1Panel `data-testid="stage1-print"` Z. 745).
  </was_rein>
  <was_raus>
  - Kein dynamisches PDF-Generation (jspdf, pdfmake) — ~500 KB Bundle für etwas, das Browser können.
  - Kein "Send by E-Mail"-Button.
  - Keine eigene Print-Seitenleiste — Druck ist Lesefluss-pur.
  </was_raus>
  <verlinkungen>—</verlinkungen>
  <vertrauen>Die Verwaltungs-Mitarbeiter:in kann der Sitzung physische Methodik-Unterlagen vorlegen — physische Artefakte sind in Verwaltungs-Settings noch oft Voraussetzung.</vertrauen>
</proposal>

<proposal id="P10" priority="could">
  <title>"Über dieses Tool"-Seite mit Methodik-Bibliografie und SBOM-Link</title>
  <was>Eine schlanke `/docs/uber` (in der Top-Bar erreichbar) mit drei Sektionen: 1) Was das Tool ist und nicht (aus `08-product-redesign.md` Z. 6), 2) wer baut/wartet, 3) Methodik-Bibliografie.</was>
  <wo>`apps/web/src/docs/uber/Uber.tsx`. Footer-Link aus jeder Seite.</wo>
  <fuer_wen>Beide. Verwaltungs-Mitarbeiter:in für "wer steht dahinter, wer haftet". Auditor:in für die Bibliografie.</fuer_wen>
  <was_rein>
  - "In einem Satz" und "Was das Tool nicht macht" 1:1 aus `sortition-tool/08-product-redesign.md`.
  - "Wer wartet" — Verantwortungs-Klärung (Datenschutz beim Nutzer; Tool-Wartung beim Bauer).
  - "Methodik-Bibliografie" — kuratierte Liste aller externen Quellen, die in der App referenziert werden, nach Thema gruppiert (Recht, Algorithmus, Methodik). Pro Eintrag: Autor, Titel, Jahr, URL, ein-Satz-Relevanz.
  - Link zur Sourcen-`SBOM`/`tech-manifest.json`-Seite (P3).
  - Repo-Link mit Commit-SHA des aktuellen Builds.
  </was_rein>
  <was_raus>
  - Keine "Team"- oder "Contributor"-Liste mit Avataren — wirkt kommerziell und ist bei Solo-Projekten irreführend.
  - Keine Spendenbutton, kein "Get Involved" — Geschäftsmodell laut `08-product-redesign.md` Z. 14: keines.
  - Keine Roadmap.
  </was_raus>
  <verlinkungen>Alle Quellen aus `docs/stage1-algorithm.md` Z. 187-192, plus Flanigan et al. Nature 2021 (DOI 10.1038/s41586-021-03788-6), OECD-Handbuch, Cochran ISBN, Sortition Foundation methodology.</verlinkungen>
  <vertrauen>Methodik-Bibliografie ist die explizite Form von "wir haben uns nicht alles ausgedacht — wir folgen einer etablierten Forschung". Wirkt dezent, aber stark.</vertrauen>
</proposal>

<proposal id="P11" priority="could">
  <title>Audit-JSON-Reader-Seite (Drag-and-drop) für Auditor:innen</title>
  <was>Eine Route `/docs/audit/lesen`, in die ein Auditor:in eine `versand-audit-{seed}.json`-Datei drag-and-droppen kann; die Seite zeigt eine menschen-lesbare Aufschlüsselung jedes Felds, prüft die Signatur clientseitig (Web Crypto), und stellt jedes Feld dem JSON-Schema (`docs/audit-schema.json`) gegenüber.</was>
  <wo>`apps/web/src/docs/audit/AuditReader.tsx`. Verlinkt aus AuditFooter "Diese Datei selbst prüfen →".</wo>
  <fuer_wen>Technische Auditor:in primär, aber auch Verwaltungs-Mitarbeiter:in, die ein altes Audit-JSON von einem früheren Verfahren bekommt und schnell sehen will, was drin steht.</fuer_wen>
  <was_rein>
  - File-Drop-Bereich, kein Server-Upload.
  - Tab "Schema-Validierung": Schema-Compliance-Check mit grün/rot pro Feld.
  - Tab "Signatur-Verifikation": Web-Crypto Ed25519/ECDSA-Verify, gibt grün "Signatur gültig" oder rot mit Begründung.
  - Tab "Lesbar": Audit-Felder mit Glossar-Tooltips (P6) und Klartext-Beschreibungen.
  - Hinweis: "Diese Seite verwendet die gleiche Web-Crypto-API wie Stage 1 selbst. Sie können den Quellcode prüfen und die Verifikation auch offline mit `openssl dgst -verify` reproduzieren — Anleitung unter [/docs/audit/cli]."
  </was_rein>
  <was_raus>
  - Keine Speicherung des hochgeladenen Audits.
  - Keine Bearbeitung, kein "Audit reparieren"-Modus — Read-only ist Pflicht.
  - Keine multi-Audit-Verkettungs-Logik (das ist Iteration 2 / signature chain — `08-product-redesign.md` Z. 51).
  </was_raus>
  <verlinkungen>Pfad zu `docs/audit-schema.json`, Web-Crypto-API-Dokumentation, GitHub-Pfad zu `apps/web/src/run/audit.ts`.</verlinkungen>
  <vertrauen>Inversion: nicht "App signiert, App vertraut", sondern "App stellt Werkzeug bereit, mit dem **dieselbe App** ihre eigene Output-Datei prüft". Das schließt Schleifen-Argumente nicht aus, ist aber transparenter als kein Reader.</vertrauen>
</proposal>

<proposal id="P12" priority="could">
  <title>Doku-Versions-Anzeige + "Diese Doku gehört zu Build X"</title>
  <was>Jede `/docs`-Seite bekommt einen kleinen Footer-Hinweis "Diese Dokumentation gehört zu Build {commit-sha}, gepackt am {iso-datum}" — automatisch aus dem `tech-manifest.ts` (P3).</was>
  <wo>Komponente `apps/web/src/docs/DocsFooter.tsx`, eingebunden in jeder Doku-Seite.</wo>
  <fuer_wen>Auditor:in primär. Verwaltungs-Mitarbeiter:in nimmt es nur unterbewusst wahr ("aktuelle Version").</fuer_wen>
  <was_rein>
  - Build-SHA, Build-Zeit, Repo-URL, Tag/Release-Name (falls vorhanden).
  - Verweis auf Repo-Pfad der gerenderten Datei: "Quelltext dieser Seite: `apps/web/src/docs/algorithmus/Walkthrough.tsx@abc1234`".
  </was_rein>
  <was_raus>
  - Keine "Last modified"-Zeit pro Markdown-Datei (das mischt Doku-History und Build-History — verwirrend).
  - Keine Versions-Wahl-Dropdown ("Frühere Versionen") — die App ist Single-Build.
  </was_raus>
  <verlinkungen>—</verlinkungen>
  <vertrauen>Auditor:in kann jede Aussage in der Doku auf einen Quellcode-Stand zurückbinden. Selbst-Lokalisierung der App ist die Basis für Reproduzierbarkeit.</vertrauen>
</proposal>

</proposals>

<question_answers>

<answer id="1">**Beide** — getrennte Lese-Tiefen für getrennte Audiences. Beispiel A "100 → 10 mit 2 Achsen" auf der Schicht-1-Seite (`/docs/algorithmus`), das **gerade nicht-trivial genug** ist, dass jemand am Tisch es im Kopf nachvollziehen kann. Beispiel B "6.000 → 300 mit 3 Achsen" weiter unten oder auf der Detail-Seite — das ist die realistische Größe, an der man die wahren Eigenschaften sieht (Underfill-Strata, mehrere Hamilton-Reste, Größenordnung der Marginal-Tabelle). Hamilton **visuell** durch ein gestapeltes Säulendiagramm zeigen ("Pro Bevölkerungsgruppe: floor + ggf. +1 vom Rest"), nicht durch Formeln in der Schicht-1-Sicht. Statisch, kein Playground. Ein Playground macht den Lese-Pfad zu einem Spiel — und im Stage1Panel selbst gibt es bereits einen vollständigen Playground (sogar mit echten Daten). Doppel-Playground verwirrt. Stattdessen P2: am Ende des Walkthroughs ein "Probieren Sie es selbst"-Button, der zur Stage1Panel-Seite springt und eine vorbereitete CSV lädt. Siehe P2.</answer>

<answer id="2">Auditor-Sicht muss enthalten: **Solid, Vite, Tailwind, highs-js + zugehörige .wasm, Web Crypto API (Browser-nativ), Mulberry32 (in-house, `packages/core/src/pool/mulberry32.ts`), Hamilton (in-house, `stage1/stratify.ts`), Fisher-Yates (in-house), `sortition-algorithms` (referenziert, nicht im Bundle), `scripts/stage1_reference.py` (referenziert, nicht im Bundle).** Format: **Tabelle**, drei Gruppen ("Im Browser aktiv" / "Browser-Nativ" / "Referenz-Implementation, nicht im Bundle"). Format Sub-Tabelle, kein Tree (Tree implies dependency-graph — wäre Lärm; transitive Deps sind nicht der Audit-Fokus auf dieser Ebene). **Versions-Pinning ist Pflicht** und muss aus dem Build-Manifest stammen (Vite-Plugin schreibt commit-SHA + dep-versions zur Build-Zeit in `apps/web/src/generated/tech-manifest.ts`) — nicht händisch im Markdown gepflegt; sonst veraltet sofort. Wo: eigene Route `/docs/tech` plus prominenter Footer-Link auf jeder Seite. Siehe P3.</answer>

<answer id="3">Drei Schichten — **Überblick / Detail / Quelle** — als **getrennte Routen mit Breadcrumb**, nicht als Accordion. Begründung: Accordions verstecken Inhalt in einer Seite und werden im Druck unsichtbar; getrennte Routen sind teilbar (E-Mail-Link auf "/docs/algorithmus/details" funktioniert), durchsuchbar, und print-fähig. Tooltips für Glossar-Begriffe (P6) sind die **vierte** Schicht ("Inline"), aber nur für Terminologie, nicht für Konzepte. Keine Tabs auf einer Seite — Tab-UI verbirgt, dass es mehrere Lese-Tiefen gibt; explizite Routen sind ehrlicher. Breadcrumb-Pattern: `Dokumentation › Algorithmus › Detail`. Cross-Links als "Weiter lesen ↓" / "Weniger Detail ↑" am Seitenende. Siehe P1.</answer>

<answer id="4">**Drei Karten + ein dezenter Vierter** direkt unter dem Stage1Panel-Header (P4): (a) "Open Source, GPL-3.0 — Quellcode einsehbar" → Repo-Link, (b) "Algorithmus byte-identisch validiert: 21 Setups gegen unabhängige Python-Referenz" → `/docs/methodik/validierung`, (c) "Datei verlässt den Browser nicht" → `/docs/datenschutz`. Klein, eine Zeile, mit "→ Detail"-Knopf für jede Karte — Verwaltungs-Mitarbeiter:in liest nur die Headline, Auditor klickt durch. Wichtig: jedes Signal ist durch eine konkrete Methodik-Seite gedeckt. Keine Behauptung ohne Beleg-Pfad. Auf der Home-/Landing-Seite (Tab Stage 1) ist der Strip sichtbar; in `/docs`-Seiten erscheint stattdessen ein dezenter Footer-Hinweis. Siehe P4.</answer>

<answer id="5">**Mandatory inline-verlinkt** (auf relevanten Doku-Seiten):
- BMG §46 — auf `/docs/methodik/bmg-46`
- Cochran *Sampling Techniques* ch. 5 — auf `/docs/algorithmus/details` (Hamilton-Begründung)
- Largest-Remainder-Wikipedia — auf `/docs/algorithmus`
- Fisher-Yates Knuth — auf `/docs/algorithmus/details`
- Mulberry32 (bryc/PRNG-list) — auf `/docs/methodik/grenzen` (Mulberry32-Eigenschaften)
- Sortition Foundation methodology — auf `/docs/uber` (Methodik-Bibliografie)

**Mandatory zentral verlinkt** (auf `/docs/uber`-Bibliografie + ggf. Verlinkung von oben):
- Flanigan et al. Nature 2021 (DOI: 10.1038/s41586-021-03788-6) — Methodik-Anker für algorithmische Fairness
- OECD "Innovative Citizen Participation" — Methodik-Standard
- DSGVO/BDSG-Verweis — Datenschutz-Seite

**Nice-to-have:** Sortition-Foundation `stratification-app`-Repo, GitHub-Codeline-URL der Web-Crypto-API-Spezifikation.

**Format:** Inline-Links in Schicht-1-Texten als kontextuelle Verweise; Schicht-2-Seiten ergänzen mit Verweis-Liste am Ende; eine kuratierte Bibliografie unter `/docs/uber` — **nicht** "Bibliografie" als eigene Top-Nav-Seite (zu viel Bedeutung). Siehe P10.</answer>

<answer id="6">**Stylisierter Walkthrough** mit synthetischem Pool — keine echten Gemeinde-Daten (PII, juristisch nicht haltbar; siehe `08-product-redesign.md` Z. 12-13). Beispiel: "Stadt Beispielstadt mit 3 Bezirken (Zentrum, Nord, Süd), 5 Altersgruppen (16-25, 26-40, ...), 3 Geschlechtsangaben (w, m, d). Pool 6.000, Stichprobe 300." Pool wird mit der bestehenden `generatePool`-Funktion deterministisch generiert (Profil `kleinstadt-bezirkshauptort`, Seed 42, fest). **BMG-§46-Limitation explizit ansprechen** als eigene Seite (`/docs/methodik/bmg-46`, P7), denn das ist die häufigste Verwaltungs-Frage. Tonalität dort: gesetzlicher Rahmen, keine Wertung. Siehe P2 + P7.</answer>

<answer id="7">**Beides** — Reproduktions-Anleitung gehört in zwei Stellen: (a) **kontextual** als ausklappbarer Block direkt im AuditFooter ("Wie kann ich diese Auswahl reproduzieren?"), wo die Auditor:in genau im Moment des Lauf-Resultats die Möglichkeit zum Gegenprüfen hat (P5); (b) **systematisch** als eigene Seite `/docs/audit/cli`, die alle Reproduktions-Wege beschreibt (Python-Reference, Cross-Validate-Skript, manuelle Seed-Verifikation). Die zwei Pfade sind nicht redundant: der Footer-Block beantwortet "kann ich diesen Lauf prüfen?", die Doku-Seite beantwortet "kann ich grundsätzlich solche Läufe prüfen?". **Nicht** in `/docs/algorithmus` — dort gehört Erklärung, nicht Tooling-Anweisung. Siehe P5.</answer>

<answer id="8">**Klartext-Liste** in `/docs/methodik/grenzen` mit Drei-Satz-Pattern pro Limitation: was, warum, was bedeutet das. Beispiel für Mulberry32: "Mulberry32 ist ein deterministischer Pseudo-Zufalls-Generator, kein kryptographischer. Das ist absichtlich so — für statistische Unbiasedness reicht es weit aus, und kryptographische PRNGs würden Reproduzierbarkeit bei gleichem Seed verhindern. Die theoretische Schwäche (jemand könnte vor dem Lauf verschiedene Seeds offline ausprobieren) wird sozial mitigiert: der Seed wird **gemeinsam in der Sitzung vor dem Lauf** vereinbart." Tonalität: nüchtern, keine Übertreibung in Richtung "kein Problem", aber auch keine FUD. Konkrete Aussage immer mit Zahlen ("max |z|=3,72 in 2.000 Trials" statt "statistisch zuverlässig"). Verlinkt aus zwei Stellen: TrustStrip-Karte ("Was kann das Tool nicht?") und Underfill-Banner im Stage1Panel ("Mehr zu Unterbesetzung →"). Siehe P8.</answer>

<answer id="9">**Zweispaltig auf großen Bildschirmen, einspaltig auf kleinen** — Inhalt links (60-70 % Breite), Sidebar rechts (30 % Breite) mit "Auf einen Blick"-Box (3-5 Bullet-Points, Zielgruppen-Tag), Stichwort-Glossar, Quellenliste. Kein Scrollytelling — das ist Marketing-Stil und vermittelt zu wenig Tiefe für einen Audit. Keine Tab-Navigation auf einer Seite (siehe Antwort 3). Schriftgrad-Hierarchie groß: H1 der Seite, H2 pro Abschnitt; H3 sparsam einsetzen. Code-Blöcke immer mit "Kopieren"-Knopf. Keine Bilder ohne Alt-Text, keine PNG-Diagramme — alles als inline-SVG (analog zur bestehenden a11y-Behandlung in der App, siehe Issue #53). Siehe P1 + P9.</answer>

<answer id="10">**Beides — koordiniert.** Ein dedizierter `/docs`-Tab in der Top-Bar (`apps/web/src/App.tsx` neben "Stage 1" / "Stage 3") für die strukturierte Doku-Sektion. **Zusätzlich** an folgenden Stellen kontextuelle Links **ohne** visuellen Lärm:
- Stage1Panel-Header: kleiner "Wie funktioniert das?"-Link rechts neben dem "Schritt 1 von 3"-Hinweis (P2)
- BMG-Hinweis-Aside: "Mehr zu §46 →" (P7)
- Underfill-Banner: "Mehr zu Unterbesetzung →" (P8)
- AuditFooter: "Wie kann ich das reproduzieren?" als ausklappbares `<details>` (P5)
- Footer jeder Seite: "Über dieses Tool" + "Bauteile prüfen" als kleine Links

Wichtig: kontextuelle Links sind **klein und unaufdringlich** (kleinere Schrift, Standard-Linkfarbe), nicht als Buttons hervorgehoben — sonst würde der Workflow überladen wirken. Der Top-Bar-Tab ist die Haupt-Tür; die Inline-Links sind die Seitentüren. Siehe P1.</answer>

<answer id="11">**Ja — kombiniert mit P6 (Inline-Tooltips).** Eine Glossar-Vollseite `/docs/glossar` mit alphabetischer Liste aller Begriffe, plus Inline-Tooltip-Pattern für die wichtigsten ~10 Termen in Stage1Panel und AuditFooter. Wichtige Konvention: das Glossar ist **die einzige Quelle** für die Doppelnennung "Bevölkerungsgruppe (Stratum) / Soll (n_h_target) / Ist (n_h_actual)" — wird in der UI bereits an einer Stelle gemacht (Stage1Panel Z. 682), aber nicht systematisch. Mit dem Glossar wird es konsistent und überall klickbar/hover-bar. Linking-Strategie: Stage1Panel-UI verwendet `<Term>` an den ersten Vorkommen pro Sitzung; Doku-Seiten verlinken zu spezifischen Glossar-Anchors. Siehe P6.</answer>

<answer id="12">**Ja — Browser-Print-CSS, kein PDF-Library-Bundle.** Reicht völlig für die typische Verwaltungs-Anwendung (PDF-Export aus dem Browser-Drucker-Dialog). Print-CSS pro Doku-Seite versteckt Top-Nav, In-App-Tooltips und nicht-druck-relevante Elemente; rendert URLs ausgeschrieben hinter Links und setzt Page-Breaks vor `<h2>`. Eigene "Druckansicht"-Schaltfläche pro Seite (analog zum bestehenden `data-testid="stage1-print"` in Stage1Panel Z. 745). Pflicht-Doku-Seiten für Druck: `/docs/algorithmus`, `/docs/methodik/bmg-46`, `/docs/methodik/grenzen`, `/docs/datenschutz` — das sind die Seiten, die in einer Sitzung physisch auf dem Tisch liegen können sollten. Kein PDF-Library-Bundle (jspdf etc.) — würde ~500 KB hinzufügen für etwas, das der Browser kann. Siehe P9.</answer>

</question_answers>

<top_priority_recommendations>
<recommendation>Wenn nur 2 PT verfügbar sind, in dieser Reihenfolge: **P1 (Routing-Skelett mit Schicht-1-Seite + Schicht-2-Einbettung des bestehenden Markdowns)** + **P4 (TrustStrip im Stage1Panel)** + **P5 (Reproduktions-Block im AuditFooter)**. Begründung: P1 schafft die Infrastruktur, in die alles andere wächst, ohne sie ist jeder Folge-Vorschlag hängend. P4 liefert sofort sichtbare Vertrauenssignale für die häufigste Audience (Verwaltung in der Sitzung). P5 liefert sofortige Audit-Verifizierbarkeit für die zweite Audience (Auditor:in nach dem Lauf) — und braucht keine zusätzlichen Doku-Seiten, sondern nur einen `<details>`-Block in einer bestehenden Komponente. Mit diesen drei Items ist die Vertrauen-vs-Verifikation-Dialektik beidseitig adressiert.</recommendation>
<recommendation>P2 (Walkthrough), P3 (Tech-Stack), P7 (BMG §46), P8 (Limitations) sind die ersten Erweiterungen, die einen **echten** Doku-Mehrwert über das Repo-Markdown hinaus liefern (Visuelle Hamilton-Erklärung, build-time Versions-Pinning, BMG-Erklärseite, Limitations-Seite). Diese vier brauchen je 0,5-1 PT.</recommendation>
<recommendation>P6 (Glossar) sollte **früh** gesetzt werden, wenn man weiß, dass mehrere Doku-Seiten kommen — sonst entsteht Drift zwischen UI-Begriffen und Doku-Begriffen. Wenn man P1+P2+P5+P7+P8 plant, P6 dazwischenschieben.</recommendation>
<recommendation>P11 (Audit-Reader-Seite mit Drag-and-drop) ist verlockend, aber wenn der/die Auditor:in das Tool sowieso lokal hat, kann sie das Audit-JSON auch lokal mit `jq` und einem 30-Zeilen-Python-Skript prüfen. Vor P11 sollte unbedingt P5 stehen — P5 ist die kritische Stelle, P11 die nice-to-have-Erweiterung.</recommendation>
</top_priority_recommendations>

<watch_outs>

<watch_out>**Doku-Drift zwischen Repo-Markdown und in-App-Doku.** Wenn `/docs/algorithmus/details` einen vom Markdown unabhängigen Inhalt hat, läuft die Doku innerhalb von 6 Wochen auseinander. **Lösung:** Markdown-Datei aus `docs/` zur Build-Zeit als Komponente importieren (z.B. via `vite-plugin-mdx` oder einfacher: `?raw`-Import + `marked`/`markdown-it`). Single source of truth — wer das Repo-Markdown ändert, ändert die App-Doku.</watch_out>

<watch_out>**Bundle-Bloat durch Doku-Library**. Docusaurus, VitePress, Nextra ziehen alle 200-500 KB Bundle. `docs/bundle-size.md` zeigt, dass die App auf einer Bundle-Diät ist. Empfehlung: bei statischer Doku ein selbstgebautes Hash-Routing (~50 LOC) plus einen Markdown-Renderer (`marked` ist ~30 KB gzip) ist die kleinste vernünftige Lösung. Keine Doku-Engine.</watch_out>

<watch_out>**Synthetische Beispiele wirken steril**. Ein Walkthrough mit "Beispielstadt" ohne Charakter ist langweilig. Aber: echte Gemeinde-Daten gehen nicht (PII). Kompromiss: **konkrete fiktive Stadt** mit Charakter ("Beispielstadt mit drei Bezirken — Zentrum mit vielen 25-40-Jährigen, Nord mit kinderreichen Familien, Süd mit Senior:innen-Schwerpunkt") — Personen-Verteilung dann passend zu dieser Geschichte synthetisch generiert. Macht das Beispiel greifbar, ohne PII zu produzieren.</watch_out>

<watch_out>**Vertrauen-Strip vs. Marketing-Sprache**. Die Versuchung ist groß, Vertrauen mit Buzzwords zu erzeugen ("100 % sicher", "wissenschaftlich validiert", "rechtssicher"). Diese Sprache **zerstört** Vertrauen, weil sie nach Werbung klingt. Stattdessen messbare Aussagen mit Beleg-Link: "21 Setups byte-identisch validiert", "max |z|=3,72 in 2.000 Trials", "GPL-3.0 lizenziert". Verwaltungs-Mitarbeiter:innen erkennen Marketing-Sprache und verlieren Vertrauen.</watch_out>

<watch_out>**Glossar-Inkonsistenz**. Wenn eine Doku-Seite "Stratum" schreibt, eine andere "Bevölkerungsgruppe", die UI "Bevölkerungsgruppe (Stratum)" und der Audit-JSON `n_h_target` — wirkt das wie viele unkoordinierte Autor:innen. Lösung: Glossar-Seite + `<Term>`-Komponente früh festlegen und zur Pflicht-Praxis machen. Konvention: UI verwendet "Bevölkerungsgruppe", Schicht-2-Doku verwendet "Stratum (Bevölkerungsgruppe)", Audit-JSON verwendet `stratum_key` (technisch).</watch_out>

<watch_out>**"Wie verifiziere ich" ohne konkrete Befehle**. Die Aussage "Sie können die Auswahl mit der Python-Referenz reproduzieren" ist nutzlos, wenn nicht der genaue `python scripts/...`-Befehl mit den Parametern aus dem konkreten Lauf bereitgestellt wird. P5 ist deshalb so formuliert, dass die Audit-JSON-Werte direkt in einen kopier-fähigen Befehl eingesetzt werden — das ist 10× wertvoller als ein generischer "Reproducability Guide".</watch_out>

<watch_out>**Gefangen im "perfekt-statt-gut"-Loop**. Es ist verlockend, vor jedem Doku-Release auf alle 12 Vorschläge zu warten. Besser: P1+P4+P5 in einem ersten Schiff (1 PT), dann pro Iteration 1-2 weitere. Versions-Anzeige (P12) macht inkrementelle Releases ehrlich — Auditor:in sieht "Build vom 2026-04-30", weiß damit was zu erwarten ist.</watch_out>

<watch_out>**Rechtliche Aussagen ohne Verifikation**. Auf der `/docs/methodik/bmg-46`-Seite ist die Versuchung groß, "rechtlich klar geregelt"-Sätze zu schreiben. Aber: die Diskussion in `CLAUDE.md` ("Rechtsgutachten DE/GPL Pflicht") zeigt, dass nicht alles in diesem Projekt rechtlich abgeschlossen ist. Tonalität: Quellen-Links, nüchterne Beschreibung, kein "ist eindeutig" / "ist erlaubt" / "ist verboten" ohne Quellen-Link. Bei Unsicherheit "unbestätigt"-Markierung wie in CLAUDE.md gefordert.</watch_out>

<watch_out>**Doku als Ersatz für gute UI**. Wenn die Stage1Panel-UI selbst unklar ist, kompensiert keine Doku den Schmerz. Die Vorschläge hier setzen voraus, dass Stage1Panel UX-mäßig in Ordnung ist (Issue #53 ist abgeschlossen). Falls neue UX-Schmerzpunkte auftauchen, sollten die in der UI gelöst werden, nicht in der Doku.</watch_out>

</watch_outs>

<verdict value="ideation_complete">
  <summary>Empfehlung: Eine kompakte In-App-Doku-Architektur mit drei festen Lese-Schichten (Überblick / Detail / Quelle) in einem dedizierten `/docs`-Tab, gespeist aus den bestehenden Markdown-Dokumenten als single source of truth, ergänzt durch zwei kontextuelle Vertrauens-Mechanismen direkt im Stage1Panel: einen kleinen TrustStrip mit drei Belegketten unter dem Header (Open Source / Validierung / Datenschutz), und einen ausklappbaren Reproduktions-Block direkt im AuditFooter. Die zwei Audiences werden über die gleichen Inhalte mit unterschiedlicher Tiefe bedient — Verwaltungs-Mitarbeiter:in sieht die Headline, Auditor:in klickt durch zur vollen Spezifikation und zur CLI-Reproduktions-Anleitung. Build-Time-Manifest (Tech-Stack + Commit-SHA) macht jede Doku-Seite versions-eindeutig zum Quellcode-Stand. Erste Iteration auf zwei Personentage: P1 (Routing + Markdown-Einbettung) + P4 (TrustStrip) + P5 (Reproduktions-Block) + (zwingend dazu) P12 (Build-Versions-Anzeige). Alles weitere ist additiv und kann pro Iteration angefügt werden, ohne Re-Architektur.</summary>
</verdict>

</review>

<verdict value="pass" critical="0" high="0" medium="0">
Ideation complete. 12 konkrete Vorschläge mit Was/Wo/Für wen/Was rein/Was raus/Verlinkungen/Vertrauens-Mechanismus, Antworten auf alle 12 Fragen, vier Priorisierungs-Empfehlungen, neun Watch-Outs. Kein Pass/Warn/Fail-Urteil, da Ideation-Modus.
</verdict>

