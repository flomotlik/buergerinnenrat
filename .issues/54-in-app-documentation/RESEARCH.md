# Research — Issue #54 In-App Dokumentation

> Konsolidiert aus 3-LLM-Ideation-Review (`.issues/in-app-docs-ideation/reviews/`, 3× PASS, 24 Proposals). Codebase-Verweise aus eigenem Lesen.

## User Constraints (verbatim aus ISSUE.md)

- Routing über App.tsx Tab-Switcher (kein neuer Router-Dep)
- Hub mit Unterseiten via Solid-Signal-State + URL-Hash-Sync
- Toy-Beispiel 100 → 10 mit visueller Hamilton-SVG
- Tech-Stack via Build-Time-Manifest (gen. nach `apps/web/src/generated/`)
- TrustStrip im Stage1Panel (3 Karten)
- Glossar-Tooltips inline + Vollseite
- Build-/Commit-Info im Footer (`VITE_GIT_SHA` aus `git rev-parse`)
- Bundle-Delta-Budget: +25 KB raw / +8 KB gzip

## Summary

Klarer Konsens aller drei Reviewer. Architektur:
- **Eine SPA-Top-Level-Route `/docs`** als Hub, nicht eigene Domain
- **Sechs Unterseiten**: Algorithmus, Technik, Verifikation, Glossar, BMG §46, Limitationen
- **Drei TrustStrip-Karten** als Sprungbretter aus Stage1Panel
- **Inline-`<Term>`-Komponente** für Glossar-Tooltips (verwendet in mehreren Doku-Seiten)
- **Build-Time-Tech-Manifest** (kein Runtime-Lookup)

Empfohlene Commit-Strategie:
1. Routing + Hub + Build-/Commit-Info + leere Stub-Seiten (Skelett)
2. Algorithmus-Seite + Toy-SVG-Walkthrough
3. Tech-Manifest-Generator + Tech-Seite
4. Verifikations-Seite + Reproduktions-Anleitung
5. Glossar (Daten + Vollseite + Inline-Tooltip-Komponente)
6. BMG §46 + Limitationen + TrustStrip + Print-CSS
7. Test-Sweep + Bundle-Delta

## Codebase Analysis

### App-Routing (heute)
<interfaces>
- `apps/web/src/App.tsx`: Tab-Switcher via Solid-Signal `mode` (Werte: `'stage1' | 'stage3'`). Default `'stage3'`. Tab-Buttons `data-testid="tab-stage1"` / `tab-stage3`.
- Zu erweitern: Mode-Type um `'docs'`, neuer Tab-Button, neuer Conditional-Render-Block
- URL-Hash-Sync: nicht heute. Vorschlag — `createEffect` der `mode()` aus `window.location.hash` liest und schreibt. Bookmark-fähig: `#/docs/algorithmus` setzt mode='docs' + docs-route='algorithmus'.
</interfaces>

### Bestehende Komponenten zur Wiederverwendung
<interfaces>
- `apps/web/src/stage1/AxisBreakdown.tsx`: SVG-Chart-Pattern für die Hamilton-Visualisierung übernehmen (gleicher SVG-Stil, evtl. eigene `HamiltonSvg.tsx` darauf basierend)
- `apps/web/src/stage1/AuditFooter.tsx`: gleicher visueller Stil für die Tech-Manifest-Anzeige
- Print-CSS bereits vorhanden in `apps/web/src/index.css` — Pattern (`@media print` mit selektivem Display-None) für Doku-Seiten erweitern
</interfaces>

### Algorithmus-Code (Quellen für Doku-Inhalt)
<interfaces>
- `packages/core/src/stage1/stratify.ts:45-135` — Bucketize, Hamilton, Fisher-Yates, alle in Code-Kommentaren erklärt
- `packages/core/src/stage1/reporting.ts` — Marginal-Aggregate, Coverage-Metric
- `docs/stage1-algorithm.md` — Repo-Markdown, kann als Inhalt-Quelle inhaltlich übernommen werden (gekürzt, plain-language-Umarbeitung)
- `docs/stage1-validation-report.md` — Cross-Validation + Statistical Test, Zahlen für TrustStrip-Karte 2 ("21/21 byte-identisch", "max |z|=3.72")
</interfaces>

### Audit-Schema (für Verifikations-Seite)
<interfaces>
- `packages/core/src/stage1/types.ts:54-86` — Stage1AuditDoc-Interface mit allen Feldern (schema_version 0.2, algorithm_version stage1@1.0.0, prng mulberry32, tie_break_rule, key_encoding, stratum_sort, seed, input_csv_sha256, selected_indices, signature, public_key, signature_algo)
- Reproduktions-Schritte: Audit-JSON laden → Parameter extrahieren (`seed, axes, target_n`) → `python3 scripts/stage1_reference.py --input <csv> --axes <a,b,c> --target-n <N> --seed <S> --output-json out.json` → `selected_indices` aus beiden vergleichen
</interfaces>

### Tech-Manifest-Generator (P3, neu zu schreiben)
<interfaces>
- Eingaben: `package.json` (root + workspaces), `pnpm-lock.yaml`
- Ausgabe: `apps/web/src/generated/tech-manifest.ts` mit `export const TECH_MANIFEST: TechEntry[]`
- TechEntry: `{ name, version, license, kind: 'runtime'|'build'|'test', purpose: string, sourceUrl?: string }`
- Lizenzen aus pnpm-Lockfile oder `node_modules/<pkg>/package.json`
- Run im Build via `vite-plugin-virtual` ODER vorab via `package.json` script `predev` / `prebuild`
- Empfehlung: einfaches `tsx scripts/build-tech-manifest.ts` als prebuild + prev step. Ergebnis ist eingecheckt, damit Reproduzierbarkeits-Audit funktioniert (eingecheckt + commit-SHA = exakte Tech-Liste pro Build)
</interfaces>

### Build-Time Git-SHA (P12 Claude)
<interfaces>
- `apps/web/vite.config.ts`: `define: { __GIT_SHA__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()), __BUILD_DATE__: JSON.stringify(new Date().toISOString()) }`
- Alternativ env-Variable `VITE_GIT_SHA` (per pnpm-script gesetzt). `vite define` ist robuster gegen "vergessen-zu-setzen".
</interfaces>

### Glossar-Datenstruktur
<interfaces>
- `apps/web/src/docs/glossar.json`: Array von `{ slug: string, term: string, kurz: string, lang_md?: string, see_also?: string[], external_link?: { label: string, url: string } }`
- `slug` ist URL-fragment-fähig (`#/docs/glossar/bevoelkerungsgruppe`)
- 15-25 Einträge zu starten — kann später wachsen
- Solid-Komponente `<Term slug="..."/>` rendert Inline-Text + Tooltip
</interfaces>

### Trust-Signale: Daten-Quellen für die TrustStrip-Karten
<interfaces>
- Karte 1: "Algorithmus seit 1792" — Hamilton/Largest-Remainder, link zu `/docs/algorithmus#hamilton`
- Karte 2: "Cross-validiert mit Python-Referenz, 21/21 byte-identisch" — Zahl aus `docs/stage1-validation-report.md`, link zu `/docs/verifikation`. Update wenn Cross-Validation-Setups in der Zukunft wachsen — aber Hard-Code mit Kommentar "Stand: <build-date>" ist OK
- Karte 3: "Signiertes Audit-Protokoll, vollständig nachprüfbar" — link zu `/docs/verifikation`
</interfaces>

## Architektur-Empfehlung

### Ordner-Struktur (neu)

```
apps/web/src/
  docs/
    DocsHub.tsx          # Hub mit Tile-Karten
    DocsLayout.tsx       # gemeinsames Layout (Header, Nav, Footer mit Build-SHA)
    Algorithmus.tsx
    Technik.tsx
    Verifikation.tsx
    Glossar.tsx
    Bmg46.tsx
    Limitationen.tsx
    Term.tsx             # Inline-Tooltip-Komponente
    HamiltonSvg.tsx      # Toy-Beispiel-Visualisierung
    glossar.json         # Glossar-Daten
  generated/
    tech-manifest.ts     # Build-Time generiert
  stage1/
    TrustStrip.tsx       # NEU — 3 Karten in Stage1Panel
scripts/
  build-tech-manifest.ts # Generator
```

### Solid-Signal-State für Doku-Routing

Im Tab-Switcher von `App.tsx` neuer mode-Wert `'docs'`. Im Doku-Block ein zweiter Solid-Signal `docsRoute: 'hub' | 'algorithmus' | 'technik' | 'verifikation' | 'glossar' | 'bmg46' | 'limitationen'`. URL-Hash sync via `createEffect` mit `window.addEventListener('hashchange', ...)`.

## Konkrete Implementierungs-Risiken

1. **URL-Hash-Sync vs Stage1/3-Tabs:** existing Tab-Switcher nutzt keinen Hash-Sync. Wenn wir den jetzt für Docs einführen, müssen Stage 1/3 entweder mitziehen oder explicit-no-hash bleiben. Vorschlag: alle drei Modi am Hash-Sync teilnehmen lassen (`#/stage1`, `#/stage3`, `#/docs/algorithmus`) — kleines Tests-Update.
2. **Tech-Manifest-Eingecheckt vs gitignored:** beide Optionen haben Trade-offs. Eingecheckt = Build deterministisch + jeder pnpm install spielt das gleiche, aber Drift wenn jemand `pnpm install --no-frozen-lockfile` macht. Gitignored = immer aktuell aber CI-Build muss vor Build-Step `tsx scripts/build-tech-manifest.ts` laufen lassen. Empfehlung: **eingecheckt + CI-check** dass git-status nach `prebuild` clean ist (Drift-Detection).
3. **Hamilton-SVG-Komplexität:** das Toy-Beispiel mit 6 Strata + Floor-Bonus-Visualisierung kann schnell zu komplex werden. Vorschlag: ein zentraler horizontaler Stack mit 6 Boxen, jede zeigt Pool-Zahl + (Quote → Floor → Remainder-Rang → +1?-Markierung → finale Zahl) als 5-Zeilen-Mini-Tabelle in der Box. Inspired by Sortition Foundation tutorial (URL prüfen).
4. **Bundle-Delta:** /docs ist zusätzliche Routes mit eigenem Code. Wenn alle Doku-Seiten eager-geladen werden, fallen die ins main-Bundle. Mit Vite ist Code-Splitting via dynamic imports möglich (`const DocsHub = lazy(() => import('./docs/DocsHub'))`), reduziert Initial-Load. Empfehlung: lazy-load alle Doku-Seiten. Das hält das Stage1/Stage3-Bundle klein.
5. **Print-CSS für Doku:** existing print-CSS ist sehr Stage1-spezifisch (drops nav, expands details). Doku-Print sollte separates Pattern haben — nur die aktive Doku-Seite printen, nicht den Hub.
6. **Glossar-Drift:** Wenn die UI-Strings sich später ändern (z.B. nach #53), driften die Glossar-Einträge. Vorschlag: Linter / Test der prüft, dass alle in `glossar.json` referenzierten Slugs auch in `<Term slug=...>` Aufrufen vorkommen — und umgekehrt — irgendwo im Code.
7. **Audit-Trust auf Wahrheitsgrad:** Karte 2 sagt "21/21 byte-identisch". Wenn jemand das Cross-Validation-Skript verändert oder ein neues Setup hinzufügt, drifft die Zahl. Vorschlag: Karte zieht die Zahl aus einer Datei/Konstante, die auch der Cross-Validation-Skript-Output ist (z.B. eine `stage1-validation-stats.json`, die der CI-Lauf produziert). Vorerst: hardcode "21/21" mit Kommentar.

## Sources

- HIGH: alle 24 Ideation-Proposals der drei Reviewer, mit Datei:Zeile-Verweisen wo möglich
- HIGH: Solid-Signal-Patterns aus bestehendem Stage1Panel/RunPanel
- HIGH: Tech-Stack-Liste aus `package.json` (root) + `apps/web/package.json` + `packages/*/package.json`
- MEDIUM: Hamilton-SVG-Visualisierungs-Vorbilder aus Wikipedia + Sortition Foundation (würde im Plan validiert)
- LOW: Glossar-Drift-Linting-Pattern (idea, nicht im Repo umgesetzt)
