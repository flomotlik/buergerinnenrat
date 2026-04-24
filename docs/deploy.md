# Deployment-Anleitungen Iteration 1

Das Iteration-1-Bundle ist eine **statische Web-App** ohne Backend-Anforderungen. Drei Deployment-Pfade — alle liefern dieselben Bytes aus, Unterschiede liegen in CDN/Hosting/CSP.

## Voraussetzung: Build erzeugen

```bash
make build
# → apps/web/dist/ enthält index.html, assets/, highs.wasm
```

## Variante 1 — Cloudflare Pages

```bash
# einmalig
npx wrangler pages project create sortition-iteration-1
# pro Release
cd apps/web && npx wrangler pages deploy dist
```

Cloudflare komprimiert `.wasm` automatisch mit Brotli. Stelle `Cache-Control: public, max-age=31536000, immutable` für `assets/*` ein, `no-cache` für `index.html` (Standard-Verhalten von Pages).

**Pages-Headers** (`apps/web/dist/_headers` falls gewünscht):

```
/*
  Content-Security-Policy: default-src 'self'; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: same-origin
```

## Variante 2 — Netlify

```bash
# Lokal:
cd apps/web && npx netlify-cli deploy --dir=dist --prod
```

`apps/web/dist/_redirects` für SPA-Fallback (Iteration 1 hat keine Routes, `_redirects` bleibt leer).

## Variante 3 — Lokales ZIP (Air-Gap-Fall)

```bash
make build
zip -r sortition-iteration-1-$(git rev-parse --short HEAD).zip apps/web/dist
```

Empfänger:
1. `unzip sortition-iteration-1-XXXXXXX.zip`
2. Lokalen Static-Server starten, z.B. `python -m http.server 8080 --directory dist` oder `npx serve dist`
3. Browser auf `http://127.0.0.1:8080` öffnen

**Achtung:** mit `file://`-URLs lädt die App **nicht**, weil moderne Browser WASM-Ladevorgänge auf `http(s)://` und ähnliche Origins beschränken. Statisches Dateisystem-Öffnen funktioniert nicht.

## Content-Security-Policy

Empfohlene Hosted-Variante:

```
default-src 'self';
connect-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
worker-src 'self';
```

Wichtig:
- **`wasm-unsafe-eval`** ist erforderlich für die HiGHS-WASM-Instanziierung. `script-src 'self'` allein verbietet `WebAssembly.instantiate` in modernen Browsern.
- **`connect-src 'self'`** ist OK für die statische Variante, weil die App keine externen Requests macht (kein Telemetry, keine Crash-Reports). Pyodide würde später `connect-src` brauchen, weil es Wheels via `fetch` lädt — siehe Issue #12.
- **`'unsafe-inline'` für `style-src`** ist eine Tailwind-Spezialität (inline `style=` Attribute aus utility classes). Wer das schließen möchte, muss Tailwind mit `purge: true` und CSS-extract konfigurieren — Iteration 2.

Diese Policy ist als `_headers`-Eintrag in den obigen Beispielen enthalten.

## Verifikation nach Deploy

```bash
# 1. Bundle erreichbar
curl -sI https://YOUR-DOMAIN/

# 2. WASM lädt
curl -sI https://YOUR-DOMAIN/highs.wasm

# 3. Smoke-Test im Browser
# → CSV importieren (verwende tests/fixtures/synthetic-pools/...)
# → Quoten setzen
# → Lauf starten
# → Audit exportieren
# → scripts/verify_audit.py audit-XXXX.json prüft Signatur
```

## Out of Scope für Iteration 1

- Keine Domain-/SSL-Setup-Anweisungen.
- Kein CDN-Tuning für Edge-Caches.
- Kein Disaster-Recovery-Playbook.
- Keine BITV-2.0-Konformitäts-Erklärung — Iteration 2.
- Kein Pen-Test.
