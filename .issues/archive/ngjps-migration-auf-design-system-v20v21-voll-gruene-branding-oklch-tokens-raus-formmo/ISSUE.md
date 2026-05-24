---
id: ngjps
title: Migration auf design-system v2.0/v2.1 (voll Gruene-Branding, OkLCH-Tokens raus,
  Form/Modal/Tag nach DS-v2.1)
status: open
priority: medium
labels:
- migration
- design-system
- umbrella
remote:
- source: github
  id: '12'
  url: https://github.com/flomotlik/buergerinnenrat/issues/12
---

Migration des Buergerinnenrat-Tools (personenwahl) auf das Gruene-AT-Design-System (v2.0/v2.1). **User-Direktive 2026-05-23:** civic-tech-neutrale Positionierung aufgegeben, voll Gruene-Branding (Magenta-CTAs, gruenes Logo, gruene.at-Stil-Brandbar, Barlow Semi Condensed). Heute komplett DS-unverbunden mit eigener OkLCH-Hue-145-Token-Schicht und Solid.js + Tailwind 3 Stack.

Umbrella-Migrationsticket. Bezugnehmend auf Cross-Repo-Audit (2026-05-23). Siehe `notes/audit.md` fuer den vollstaendigen Befund + `https://github.com/GrueneAT/design-system/issues/13` fuer die DS-v2.1-Welle.

## Strategische Klaerung (vorab)

Die App war als markenneutrales civic-tech-Werkzeug positioniert (`tailwind.config.cjs`-Kommentar). Die Direktive vom 2026-05-23 hebt das auf: **voll Gruene-Branding**. Konsequenzen:
- Schriften: Inter/Source Serif 4/JetBrains Mono raus, Barlow Semi Condensed rein.
- Farben: OkLCH-Hue-145-System aufgelassen, `--gat-color-*` + `--gat-web-*` rein.
- CTAs: Magenta (`--gat-color-magenta`), nicht Slate.
- Logo: gruenes Bund-Logo via DS-CDN.
- Brandbar: weiss-im-gruene.at-Stil (`.gat-header` Default).

`tailwind.config.cjs`-Kommentar muss in Phase 0 aktualisiert werden.

## Migrations-Phasen

### Phase 0 — Quick-Wins (unabhaengig, sofort umsetzbar)

1. **`tailwind.config.cjs`-Kommentar aktualisieren** — civic-tech-neutral-Note entfernen, Direktive dokumentieren.
2. **`CLAUDE.md`-Update** — die Aussage „Kein Code, nur Planung" ist veraltet; aktuelle Iteration 1 mit ~50 TSX-Dateien dokumentieren.
3. **DS-CSS-Link einbinden** — `<link rel="stylesheet" href="https://grueneat.github.io/design-system/design-system.css">` im HTML-Eintragspunkt (vermutlich `apps/web/index.html`).
4. **DS-Logo per CDN** — gruenes Bund-Logo einbinden.
5. **Schrift umstellen** — Inter/Source Serif 4/JetBrains Mono raus aus selbst-gehosteter Liste, Barlow Semi Condensed via DS-Stack.
6. **`.gat-skiplink`** ergaenzen.
7. **Hardcoded-Hex aus `AxisBreakdown.tsx`** (`#94a3b8`, `#3b82f6` etc.) auf DS-Chart-Palette migrieren (`gat-charts.js`-Import).
8. **`RunPanel.tsx`-Drift** beheben — `bg-slate-900` Run-Button auf `--accent` bzw. `--gat-color-primary`, `bg-red-700` Cancel auf `var(--gat-web-clay-text)`.
9. **Inline-Tailwind-`amber-*`/`slate-*`/`sky-*`-Bloecke** durch lokale `.banner.warn` ersetzen (bzw. spaeter `.gat-callout`).

### Phase 1 — Warten auf DS-v2.1 (extern)

Dieses Repo bekommt v2.1 automatisch durch CDN-Refresh, sobald `grueneat/design-system#13` gemerged ist. v2.1 liefert: `.gat-input`-Familie, `.gat-modal`, `.gat-callout`-/-`.gat-tag`-Modifier.

### Phase 2 — Voll-Migration (nach DS-v2.1)

1. **OkLCH-Hue-145-Tokens raus**, alle Komponenten auf `--gat-color-*`/`--gat-web-*` umstellen.
2. **Form-Primitives** (`.gat-input`/`.gat-label`/`.gat-field`) — heute lokal als `.field` etc.
3. **Banner** (info/warn/err) auf `.gat-callout --info/--warn/--error` umstellen.
4. **Status-Tag-Modifier** auf `.gat-tag --ok/--warn/--error` umstellen.
5. **Sidebar-Shell** — falls `.gat-section` mit Modifier reicht, dort migrieren; sonst lokal als `.app-sidebar`.
6. **Step-Rail** — wenn `.gat-step-indicator` in v2.3 landet, dort migrieren; sonst lokal lassen.
7. **Stats-Grid** — auf `.gat-metric-card`-Komposition pruefen (neutraler Modifier ggf. erst in v2.x noetig).
8. **Drop-Zone** — wenn `.gat-dropzone` in v2.2 landet, dort migrieren.
9. **Audit-Mono `<dl>`** — Provenance-Block; pruefen ob `.gat-prose --mono` oder lokal `.app-audit`.
10. **Sticky-Action-Footer** — wenn `.gat-toolbar`/`-actionbar` in v2.2 landet, dort migrieren.
11. **Data-Tables** — wenn `.gat-table` in v2.2 landet, dort migrieren.
12. **Prose-Wrapper** — wenn `.gat-prose` in v2.3 landet, dort migrieren.
13. **App-spezifische Komponenten** als `.app-*`-Namespace: AxisBreakdown, OverrideEditor, AgeBandsEditor, SampleSizeCalculator, StratificationExplainer, TrustStrip-Inhalt, Stage1-Print-Selektoren.
14. **Doku-Abschluss**: `notes/iteration-abschluss.md`.

## Akzeptanzkriterien

### Phase 0
- [ ] `tailwind.config.cjs`-Kommentar aktualisiert (civic-tech-neutral-Note weg)
- [ ] `CLAUDE.md` reflektiert aktuellen Code-Stand
- [ ] DS-CSS-Link + DS-Logo + DS-Schriftumstellung
- [ ] `.gat-skiplink` ergaenzt
- [ ] `AxisBreakdown.tsx` und `RunPanel.tsx`-Drift behoben
- [ ] Inline-Tailwind-Status-Bloecke durch `.banner.warn` ersetzt

### Phase 2 (nach DS-v2.1)
- [ ] OkLCH-Hue-145-Tokens komplett raus, `--gat-color-*`/`--gat-web-*` ueberall
- [ ] Form, Banner, Status-Tag auf DS-Bausteine
- [ ] App-spezifische Komponenten sind `.app-*`-Namespace
- [ ] `notes/iteration-abschluss.md` dokumentiert Migration

### Querschnitt
- [ ] `grep -rE "claude|Generated with|Co-Authored-By" .` liefert 0
- [ ] Keine neuen Vendoring-Verzeichnisse
- [ ] Konsumenten-URL als Quelle
- [ ] Tests gruen (was an Tests existiert)

## Constraints

- **Kein Vendoring.**
- **Keine Werkzeug-Attribution.**
- **Phase 0 zuerst.** Phase 2 wartet auf DS-v2.1-Release.
- **Branding-Direktive bindend:** voll Gruene-Branding, kein civic-tech-neutral.

## Hintergrund

Aus dem Cross-Repo-Audit: 12 DS-Aufnahme-Kandidaten, 5 Hybrid, 7 app-spezifisch. Voll-Migration ist groesser als andere Repos, weil das eigene Token-System sehr ausgereift ist und in jeder Komponente sitzt. Siehe `notes/audit.md` + `notes/SYNTHESIS.md`.
