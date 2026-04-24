# Architektur: Browser-native Sortition-App

## TL;DR

Empfehlung in einem Satz: **Statische SPA mit Vite + SolidJS + TypeScript, ausgeliefert als PWA plus ZIP-Fallback, Core-Algorithmus als eigenes TS/WASM-Package, LP-Solver via `glpk.js` (WASM) im Web Worker, strikte CSP ohne `connect-src`, Audit-JSON mit deterministischem Seed.**

Kernentscheidungen:
- **Kein Backend, nie.** `connect-src 'none'` als verbindliche CSP (per Meta-Tag + HTTP-Header wenn gehostet).
- **Zwei Distributionskanäle parallel**: (a) gehostete PWA auf Cloudflare Pages (aktuellste Version, installierbar, offline), (b) signiertes ZIP mit reinem `file://`-fähigem Build fuer Kunden, die "niemals ueber fremde Server" fordern.
- **Framework: SolidJS** (nicht React) wegen Bundle-Groesse (~10 kB vs. ~45 kB), aehnlicher JSX-DX und keinem VDOM-Overhead bei tabellenlastigen UIs. Wenn Team React-vertraut ist: Preact als Kompromiss.
- **LP-Solver: `glpk.js`** (MIT-kompatibel, ~500 kB WASM, bewaehrt). Alternative `highs-js` wenn groessere Probleminstanzen (>5 k Rueckmelder) vorkommen. **Nicht Pyodide** — ~10 MB Download, unverhaeltnismaessig.
- **Monorepo mit pnpm-Workspaces**, kein Turborepo noetig bei 2-3 Packages.
- **Audit**: JSON mit Input-Hash (SHA-256), Seed, Algo-Version, Zeitstempel, optional detached Ed25519-Signatur mit vom Veranstalter erzeugtem Schluessel.

Unsicherheiten ehrlich benannt: iOS-Safari-WASM-Memory-Limits, `file://`-Einschraenkungen bei Service Worker, rechtliche Frage ob "Open Source + selbst gehostet" fuer die DSGVO-Zusicherung ausreichend ist (wohl ja, aber bitte Fachjurist).

---

## 1. Deployment-Varianten

Vergleich der vier ernsthaft erwogenen Optionen. Wir empfehlen eine Kombination (siehe Ende).

### 1.1 Gehosteter statischer Build (Cloudflare Pages / Netlify / GitHub Pages)

**Pro**
- Immer aktuelle Version, keine Update-Logistik beim Kunden.
- HTTPS + HTTP-Header (CSP, COOP/COEP fuer WASM-Threads) zuverlaessig setzbar.
- Service Worker funktioniert → Offline-Nutzung nach Erstaufruf.
- Custom Domain pro Kommune trivial (`sortition.kommune-x.de` via CNAME).
- Kostenlos bis ausreichend gross.

**Contra**
- "Wir laden nichts hoch" ist erklaerungsbeduerftig: Nutzer muessen CSP/Netzwerk-Tab selbst verifizieren.
- Hoster sieht IP-Adressen beim Erstaufruf (Metadaten, keine Fachdaten).
- Wahrnehmungsproblem bei datenschutzsensiblen Kommunen ("warum liegt das bei Cloudflare?").
- Dependency auf Verfuegbarkeit des Hosters am Losungstag.

**DSGVO-Zusicherung**: stark wenn richtig konfiguriert, aber **nicht die staerkste**. IP-Logging beim Hoster ist Verarbeitung personenbezogener Daten (Art. 4 DSGVO), auch ohne Fachdaten.

**Empfehlung fuer**: Default-Kanal, Marketing, Demo, 90% der Einsaetze.

### 1.2 ZIP-Download, `index.html` per Doppelklick (`file://`)

**Pro**
- **Staerkste DSGVO-Zusicherung**: Kunde sieht selbst, dass kein Netzwerk passiert.
- Keine Hoster-Abhaengigkeit.
- Archivierbar — ein konkretes ZIP ist genau der Zustand des Losungstages (Reproduzierbarkeit!).

**Contra — und das ist der Knackpunkt**
- **WASM funktioniert ueber `file://` nicht zuverlaessig**: Chrome blockiert `fetch()` auf `file://` per Default (CORS-like). Firefox erlaubt es mit Einschraenkungen. Safari-macOS funktioniert meist, iOS nie.
- **Service Worker NICHT** ueber `file://` registrierbar (Spec).
- ES-Module-Imports ueber `file://` blockiert in Chrome.
- Keine CSP-HTTP-Header, nur Meta-Tag (funktioniert fuer `connect-src`, aber eingeschraenkter).

**Workaround**: `vite build --base=./` mit `assetInlineLimit: 100000000` (alles inline) plus **WASM als base64 im JS eingebettet**. Moeglich, aber Bundle ~2-5 MB. Kein SW, also kein Offline-SW — dafuer ist ohnehin alles lokal.

**Alternative Workaround**: ZIP enthaelt kleinen `start.bat`/`start.sh`, der einen embedded HTTP-Server (z.B. `python -m http.server` oder ein statisches Go-Binary ~3 MB) startet. Pragmatisch, aber bricht das "einfach Doppelklick"-Versprechen.

**DSGVO-Zusicherung**: **maximal**, weil Netzwerkschicht gar nicht involviert.

**Empfehlung fuer**: Sicherheits-sensible Kundinnen, Losungstag-Archivierung, "Paranoia-Modus".

### 1.3 Progressive Web App (PWA)

**Pro**
- "Installieren"-Button im Browser → Desktop/Dock-Icon, wirkt wie native App.
- Service Worker cached alles beim Erstaufruf → danach komplett offline.
- Bei erfolgreicher Installation laeuft die App auch ohne Netz am Losungstag.
- Update-Check kontrolliert durch User.

**Contra**
- iOS-Safari PWA-Support ist historisch wacklig (Storage-Ablaeufe nach 7 Tagen Nicht-Nutzung, Install-Flow versteckt).
- "Installation" widerspricht einem Teil des "keine Installation"-Versprechens — aber weit weniger als Electron.
- Service Worker Update-Logik muss sauber gebaut werden (Nutzer muss kontrollieren, wann eine neue Version greift — am Losungstag keine Ueberraschungen).

**DSGVO-Zusicherung**: wie 1.1, gleich stark.

**Empfehlung fuer**: Kundinnen, die die App regelmaessig nutzen und die Offline-Garantie am Losungstag brauchen.

### 1.4 Electron/Tauri-Wrapper

**Pro**
- Volle Filesystem-API, keine Browser-Sandbox-Limits.
- Signiertes Binary (Code-Signing) — vertrauenswuerdig wahrgenommen.
- Tauri: klein (~5 MB), nutzt System-WebView.

**Contra**
- **Widerspricht "keine Installation"** — klare Eskalation.
- Tauri-WebView-Fragmentierung (WebKit auf macOS, Edge WebView2 auf Windows, WebKitGTK auf Linux) → Test-Matrix explodiert.
- Signing-Zertifikate kosten Geld, Windows-SmartScreen-Reputation braucht Zeit.
- Auto-Update-Infrastruktur noetig oder manuell.

**DSGVO-Zusicherung**: theoretisch stark, praktisch schwerer pruefbar als statisches ZIP (Binary-Blob).

**Empfehlung**: **Nicht bauen**, es sei denn Kundinnen fordern explizit. Falls doch, Tauri vor Electron.

### 1.5 Empfohlene Kombination

| Kanal | Zweck |
|---|---|
| **Hosted PWA** (Cloudflare Pages, `app.sortition.example`) | Default, Demo, Regelnutzung |
| **Signiertes ZIP** (Release auf GitHub, SHA-256 veroeffentlicht) | Datenschutz-Puristen, Losungstag-Archiv |
| Electron/Tauri | nicht gebaut, bis ein Kunde bezahlt |

Beide Kanaele kommen aus demselben Build (nur Vite-Config unterscheidet sich leicht). Das ZIP ist **genau dasselbe Codeartefakt** wie der Host — damit ist Auditierung einfach.

---

## 2. Tech-Stack-Empfehlung

Alle Versionen Stand April 2026, bitte bei Projektstart nochmal aktualisieren.

### 2.1 Framework: **SolidJS** (`solid-js` ^1.9)

- Signal-basierte Reaktivitaet, kein VDOM, exzellente Performance bei tabellenlastigen UIs (Quoten-Checks, Kandidatenliste).
- ~10 kB min+gzip vs. React ~45 kB, Vue ~35 kB.
- JSX — bekannte DX fuer React-Leute.
- Tooling ausgereift (Vite-Plugin stabil).
- **Risiko**: kleineres Oekosystem. Fuer diese App aber egal — wir brauchen wenig UI-Libraries.

**Alternativen**:
- **Svelte 5** mit Runes: etwas kleineres Bundle, schoener Compiler, aber Runes-API ist noch nicht 100% eingeschwungen (Ende 2025 finalisiert, aber einige Libs hinken hinterher).
- **React 19**: nur waehlen, wenn Team unbedingt React will. Bundle groesser, mehr Footguns, aber Oekosystem unschlagbar.
- **Vue 3**: solide Alternative. Nimm es, wenn das Team schon Vue kann.

**Explizit NICHT**: Angular (zu schwer), Next.js/Nuxt (SSR nutzlos fuer reine SPA ohne Backend — aber als "static export only" theoretisch machbar, bringt aber nichts ausser Overhead).

### 2.2 Sprache: **TypeScript** ^5.6, strict mode

Ohne Diskussion — bei einer Losungs-App ist Typ-Sicherheit Pflicht. Build-Overhead ist mit Vite vernachlaessigbar (`esbuild` transpiliert in Millisekunden). Der Core-Algorithmus **muss** TypeScript sein, die UI auch.

### 2.3 Build-Tool: **Vite** ^6

- Schnell, standard, WASM-Import via `?init` oder `?url` out of the box.
- `vite-plugin-pwa` fuer Service Worker (Workbox im Hintergrund).
- `vite-plugin-solid` fuer SolidJS.
- Build-Target: ES2022 (deckt alles Relevante ab, siehe §7).

### 2.4 UI-Library: **Kobalte** (SolidJS) oder **Ark UI**

- **Kobalte** (`@kobalte/core`) ist das SolidJS-Aequivalent zu Radix/shadcn — unstyled, accessible, headless. Wir stylen selbst mit Tailwind.
- Alternative **Ark UI** (framework-agnostisch, SolidJS-Binding) falls Kobalte eine Komponente nicht hat.
- Wenn React: **shadcn/ui** (Radix + Tailwind), State-of-the-Art.

**Styling: Tailwind CSS** ^3.4 (oder 4 wenn stabil). Kein CSS-in-JS (Bundle-Kosten, Runtime-Overhead).

### 2.5 CSV-Parsing: **Papaparse** ^5.5

Bewaehrt, handhabt Edge Cases (BOM, CR/LF-Mix, Semikolon als Separator — deutsche Excel-Exports!), streamt grosse Dateien. Keine ernsthafte Alternative.

### 2.6 State-Management: **Signals (built-in)** + optional `@solid-primitives/storage`

- Bei SolidJS: Signals sind das State-Management. Keine externe Lib.
- Fuer abgeleitete Stores: `createMemo`.
- **Kein TanStack Query** — korrekt erkannt, Overkill ohne Backend.
- **Kein Redux/Zustand** — SolidJS braucht das nicht.

Bei React: **Zustand** ^5 fuer Globalstate, **TanStack Store** fuer reaktive Ableitungen. Nanostores ebenfalls okay.

### 2.7 Tabellen/Charting

- **TanStack Table** ^8 (Solid-Adapter `@tanstack/solid-table`) fuer die Rueckmelder- und Ergebnis-Tabellen. Headless, wir stylen mit Tailwind. Kostenlos, keine Enterprise-Lizenz noetig.
- **AG Grid Community** nur, wenn wir Pivot/Group-Features brauchen — das ist hier unwahrscheinlich.
- **Charting**: **Observable Plot** ^0.6 oder **uPlot** ^1.6 fuer Quoten-Erfuellung (simple Bar-Charts). **Nicht Chart.js** (schwergewichtig), **nicht D3** (overkill). Wenn interaktive Verteilungen wichtig: **ECharts** ^5.

### 2.8 Internationalisierung: **@solid-primitives/i18n** oder **i18next** + `i18next-browser-languagedetector`

- SolidJS-nativ: `@solid-primitives/i18n` — schlank, reaktiv.
- Wenn groessere Matrix: `i18next` (Framework-agnostisch) auch mit SolidJS nutzbar.
- DE primaer, EN sekundaer. Translation-Files als JSON, ICU-Plural-Forms.
- Alle Strings von Anfang an durch `t(...)` — Retrofit ist Hoelle.

### 2.9 WASM-Integration: **glpk.js** ^4 im Web Worker

- `glpk.js` via `new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })`.
- Vite buendelt den Worker korrekt, auch fuer den ZIP-Build (mit `build.worker.format = 'iife'` fuer `file://`).
- Solver-Call ist `postMessage` mit serialisierter LP-Formulierung. Worker postet Progress alle N ms zurueck.
- **Abbrechbarkeit**: Worker kann `terminate()` werden. Kein feingranulares Cancel im Solver selbst noetig.
- **Alternative**: `highs-js` — schneller bei grossen LPs, aber groesseres WASM (~1.5 MB), MIT-Lizenz.
- **Pyodide**: **nein**. ~10 MB Download, laedt 3-5 Sekunden, nur sinnvoll wenn wir `stratification`-Lib von sortitionfoundation.org direkt nutzen wollen — siehe sep. Research.

### 2.10 PDF-Export: **pdf-lib** ^1.17 oder **@react-pdf/renderer**

- Fuer Audit-Protokoll: **pdf-lib** reicht. Klein (~200 kB), rein clientseitig, kein Headless-Chrome noetig.
- Keine Server-Side Rendering — PDF wird im Browser zusammengebaut.
- Alternative fuer schoene Layouts: **@react-pdf/renderer** (wenn React). Bei SolidJS: pdf-lib + manuelles Layout oder HTML→Canvas→PDF via `html2canvas` + `jspdf` (weniger sauber).

### 2.11 Kryptografie: **Web Crypto API** (built-in) + **tweetnacl** ^1.0 oder **@noble/ed25519**

- Web Crypto fuer AES-GCM (Passwort-Verschluesselung lokal).
- **@noble/ed25519** ^2 fuer Audit-Signaturen (klein, auditiert, pur JS).
- PBKDF2 via Web Crypto fuer Key Derivation aus Nutzerpasswort (≥600k Iterationen, OWASP 2024).

### 2.12 Gesamtes Bundle-Budget

Ziel: **< 500 kB initial load** (ohne WASM). WASM laedt on-demand beim ersten Losungs-Klick.
- SolidJS: ~10 kB
- App-Code: ~80-120 kB
- Kobalte: ~20 kB (nur genutzte Komponenten)
- Papaparse: ~45 kB
- TanStack Table: ~15 kB
- Tailwind (purged): ~20 kB
- i18n + Strings: ~20 kB
- pdf-lib: ~200 kB (**nur laden wenn Export gedrueckt**, dynamic import)
- noble/ed25519: ~10 kB
- glpk.js: ~500 kB WASM (**nur laden wenn Lauf gestartet**, dynamic import)

Mit aggressivem Code-Splitting unter 300 kB initial machbar.

---

## 3. UX-Workflow (End-to-End)

Textuelle Wireframes, Screen fuer Screen. Alle Screens im selben Single-Page-Layout mit Sidebar (Schritte 1-9) + Hauptpanel.

### Screen 0: Landing / Start

```
+--------------------------------------------------+
|  [Logo Kommune]   Bürgerrat-Sortition            |
+--------------------------------------------------+
|                                                  |
|   [+ Neues Projekt]      [Projekt laden (JSON)]  |
|                                                  |
|   Hinweis: Diese App läuft vollständig in       |
|   Ihrem Browser. Es werden keine Daten an       |
|   Server übertragen. [Wie verifizieren?]        |
|                                                  |
|   Sprache: [DE v]    Version: 1.4.2 (Hash abcd) |
+--------------------------------------------------+
```

"Wie verifizieren?" öffnet Modal mit Anleitung: DevTools öffnen → Network-Tab → keine Requests nach Initialload. Zusätzlich Link zu Git-Tag der Version.

### Screen 1: Projekt anlegen

Felder: **Titel** (z. B. "Bürgerrat Klima Musterstadt 2026"), **Anzahl Teilnehmende** (n, numeric), **Beschreibung** (optional, nur im Audit-File verwendet), **Kommune/Mandant** (wenn Multi-Tenant), **Losungs-Datum**. Weiter-Button deaktiviert bis Pflichtfelder gesetzt.

### Screen 2: Rückmelder-CSV laden

```
+--------------------------------------------------+
|  Schritt 2/7: Rückmelder importieren            |
+--------------------------------------------------+
|                                                  |
|  +-----------------------------------------+    |
|  |  [Drop CSV here]  oder  [Datei wählen]  |    |
|  +-----------------------------------------+    |
|                                                  |
|  Trennzeichen: (auto erkannt) Semikolon (;)     |
|  Kodierung: UTF-8 (erkannt)                     |
|                                                  |
|  Spalten-Mapping:                                |
|   ID-Spalte:      [laufende_nummer v]           |
|   Geschlecht:     [geschlecht v]                |
|   Alter:          [alter v] (oder Geburtsjahr)  |
|   PLZ:            [plz v]                        |
|   Bildung:        [bildung v]                    |
|   Migr.-Hint.:    [migration v] (optional)      |
|   Haushalt-ID:    [haushalt_id v] (optional)    |
|                                                  |
|  Vorschau (erste 10 Zeilen):                    |
|   [Tabelle mit Zeilen, Spalten farblich]        |
|                                                  |
|  Validierung: 847 Zeilen, 12 Warnungen          |
|   - 3 fehlende Altersangaben                    |
|   - 9 ungültige PLZ                              |
|   [Details anzeigen]                             |
+--------------------------------------------------+
|  [Zurück]                    [Weiter →]         |
+--------------------------------------------------+
```

Papaparse im Worker (nicht Main-Thread, sonst UI-Freeze bei 10k Zeilen). Spalten-Mapping mit Heuristik (Spaltenname-Matching).

### Screen 3: Quoten definieren

Zwei Modi umschaltbar:

**(a) Aus CSV importieren**: zweite CSV-Upload. Struktur: `kategorie;wert;min;max`.

**(b) Interaktiv**:
```
Kategorie: [Geschlecht]
  Wert: weiblich      min: 10  max: 12
  Wert: männlich      min: 10  max: 12
  Wert: divers        min:  0  max:  2
  [+ Wert hinzufügen]

Kategorie: [Altersgruppe]
  Wert: 16-29         min:  6  max:  8
  Wert: 30-49         min:  9  max: 11
  Wert: 50-69         min:  8  max: 10
  Wert: 70+           min:  3  max:  5
  [+ Wert hinzufügen]

[+ Kategorie hinzufügen]

Live-Check:  Summe min = 46  (Ziel: n=50, OK wenn ≤50)
             Summe max = 48  (Ziel: n=50, OK wenn ≥50)
             ⚠ max-Summe kleiner als Ziel — nicht erfüllbar!
```

Live-Validierung: wenn ∑min > n oder ∑max < n ⇒ Warnung. Quoten speicherbar als JSON-Template fuer Wiederverwendung.

### Screen 4: Haushalts-/Dubletten-Check

```
☑ Nur eine Person pro Haushalt auswählen
    Spalte für Haushalt: [haushalt_id v]
    Konfliktstrategie:  (o) Zufällig eine wählen
                        ( ) Erste aus Liste
                        ( ) Manuell entscheiden

☐ Dubletten-Check (gleicher Name + Geburtsdatum)
    Spalten: [vorname], [nachname], [geburtsjahr]

Gefundene Dubletten/Konflikte: 12
 [Tabelle mit Konflikt-Zeilen, Häkchen zum Ausschluss]
```

### Screen 5: Algorithmus-Wahl

```
Auswahlmethode:
 (o) Leximin (empfohlen)        [?]
     Maximiert die minimale Auswahlwahrscheinlichkeit
     iterativ über alle Personen. Fairst verteilt.
 ( ) Maximin                    [?]
     Einstufig: maximiert die niedrigste Wahrscheinlichkeit.
 ( ) Nash                       [?]
     Maximiert das Produkt der Wahrscheinlichkeiten.
 ( ) Einfacher Zufall (ohne Fairness-Optimierung)  [?]
     Schnell, aber ungleichmäßige Wahrscheinlichkeiten.

Erweitert:
  Zufalls-Seed: [automatisch generieren] [manuell: ____]
  Anzahl Monte-Carlo-Samples: [1000]
  Max. Laufzeit: [60s]
```

[?]-Tooltips mit kurzer Erklärung und Link zur Methoden-Doku.

### Screen 6: Losung durchführen

```
  Losung läuft ...

  [████████████░░░░░░░░]  62%

  Phase: LP-Solver Iteration 7/12
  Samples bisher: 620 / 1000
  Geschätzte Restzeit: 28s

  [Abbrechen]
```

Progress vom Worker alle 500 ms. Bei **Infeasibility** (Quoten nicht erfüllbar): klare Fehlermeldung mit Hinweis auf welche Quote das Problem verursacht (IIS — Irreducible Infeasible Subsystem, wenn Solver das liefert). Rückkehr zu Screen 3 mit Highlight der Problem-Quote.

### Screen 7: Ergebnis

```
+--------------------------------------------------+
|  Ergebnis: 50 Ausgewählte aus 847 Rückmeldern   |
+--------------------------------------------------+
|  Tabs: [Ausgewählte] [Quoten-Check] [Trans.]    |
|                                                  |
|  Quoten-Erfüllung:                               |
|   Geschlecht:  ✓ alle Quoten erfüllt            |
|     weiblich: 11 (Soll 10-12)                   |
|     männlich: 11 (Soll 10-12)                   |
|     divers:    1 (Soll  0- 2)                   |
|   Altersgruppe: ✓                                |
|     [Bar-Chart: Ist vs. Soll-Bereich]           |
|                                                  |
|  Transparenz:                                    |
|   Min. Auswahlwahrscheinlichkeit: 0.0412         |
|   Max. Auswahlwahrscheinlichkeit: 0.0891         |
|   Verhältnis max/min: 2.16 (niedriger = fairer) |
|   [Histogramm der Wahrscheinlichkeiten]          |
|                                                  |
|  Seed: 7f3a9b2c...  Algo: leximin v1.2          |
|  Input-Hash (SHA-256): 8d4e...                   |
+--------------------------------------------------+
|  [Export CSV] [Export PDF-Audit] [Projekt .json]|
+--------------------------------------------------+
```

### Screen 8: Export

Drei separate Exports:
- **Ergebnis-CSV**: ausgewählte Personen (gleiche Spalten wie Input, Teilmenge).
- **PDF-Audit-Protokoll**: Metadaten, Quoten, Summary-Statistiken, Seed, Input-Hash. Nicht die Personen selbst (datenschutzsensibel). Separat als Klartext-Anhang anbietbar.
- **Projekt-JSON**: kompletter Zustand (Quoten-Config, Algo-Einstellungen, Seed, Input-Hash, Ergebnis) — lädt Projekt in Screen 0 wieder ein.

Optional: **signiertes Audit-File** (Ed25519, Nutzer bringt Key mit).

### Screen 9: Protokoll speichern / neu laden

- "Projekt speichern" ⇒ Download JSON (Default). **Nicht automatisch in LocalStorage** — Daten-Persistenz ist opt-in.
- Wenn User "Lokal speichern" aktiviert: PBKDF2(Passwort) → AES-GCM → IndexedDB. UI-Hinweis, dass dies die strenge In-Memory-Garantie aufweicht.
- Reload in Screen 0: "Projekt laden" → JSON auswählen ODER "Verschlüsseltes lokales Projekt öffnen" (wenn vorhanden).

---

## 4. Datenschutz & Sicherheit

### 4.1 In-Memory-Only als Default

- Keine IndexedDB-Writes, kein LocalStorage fuer Fachdaten ohne explizites Opt-in.
- Beim `beforeunload` Warnung wenn ungespeicherte Aenderungen.
- `sessionStorage` nur fuer UI-State (aktueller Schritt), keine Fachdaten.

### 4.2 Opt-in-Persistenz mit Web Crypto

Flow:
1. User klickt "Lokal sichern".
2. Modal fragt Passwort (min. 12 Zeichen, zxcvbn-Score >= 3).
3. PBKDF2-SHA256, 600.000 Iterationen, 16-Byte Salt → 256-Bit Key.
4. AES-GCM mit 12-Byte Random IV → Ciphertext + IV + Salt in IndexedDB (einer Zeile, Key = Projekt-UUID).
5. Beim Laden: Passwort-Eingabe → Decrypt. Bei Fehler: "Passwort falsch oder Daten beschaedigt".

Wichtig: **kein Password Recovery**. Hinweistext: "Verlorenes Passwort = verlorene Daten. Exportieren Sie zusaetzlich die JSON-Datei."

### 4.3 CSP: `connect-src 'none'`

Ja, das geht — sowohl als HTTP-Header (Hosted-Kanal) als auch als Meta-Tag (ZIP-Kanal).

**Meta-Tag im `<head>`** des `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'wasm-unsafe-eval';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data:;
               font-src 'self' data:;
               connect-src 'none';
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'none';">
```

Anmerkungen:
- `'wasm-unsafe-eval'` ist fuer glpk.js noetig.
- `connect-src 'none'` blockiert `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, Beacon, WebRTC (signaling). Genau was wir wollen.
- `style-src 'unsafe-inline'` leider noetig fuer Tailwind-generierte Inline-Styles in einigen Build-Modi. Wenn es stoert: extrahierte CSS-Files verwenden, dann `'self'` reicht.
- `form-action 'none'` verhindert versehentliche Form-POSTs.

**Zusatz-HTTP-Header (nur Hosted)**:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp  # fuer SharedArrayBuffer falls WASM-Threads
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

**Wichtiger Test**: im CI mit Playwright alle Netzwerk-Requests intercepten und Assert `requests.length === 0` nach komplettem Flow.

### 4.4 Subresource Integrity

- **Keine CDN-Abhaengigkeiten** — alles lokal gebundelt. Damit SRI technisch nicht noetig.
- Wenn Fonts extern noetig waeren: lokal bundeln, nicht Google Fonts.

### 4.5 Pruefprotokoll im UI

- Im Footer permanent: **"Netzwerk: 0 Requests seit Start"** (Counter).
  - Technik: `PerformanceObserver` auf `resource`-Entries, ausser Initial-Bundle-URLs. Auf jeden neuen Entry: Warnung im UI rot blinkend.
  - Nicht perfekt (sieht keine blockierten CSP-Violations), aber gut genug als UX-Signal.
- Oder starker: `navigator.serviceWorker.controller` fuer Integritaets-Check des Caches.
- In Footer ausserdem: Version + Git-Commit-Hash + Link zu Source auf GitHub.

### 4.6 Code-Audit / Open Source

**Empfehlung: ja, Apache 2.0 oder EUPL 1.2 (europaeisch freundlich).**

- Externe Pruefbarkeit ist das staerkste Vertrauens-Argument.
- Repo-Layout: `/packages/core`, `/packages/ui`, `/docs`.
- `SECURITY.md` mit Meldeweg.
- Reproduzierbarer Build: `pnpm install --frozen-lockfile && pnpm build` ⇒ stabiler SHA-256. Dokumentiere Node-Version, OS.

### 4.7 Supply-Chain

- `pnpm-lock.yaml` committed, `--frozen-lockfile` im CI.
- **Dependabot** weekly fuer Security-Updates.
- **`.npmrc` mit `ignore-scripts=true`** — keine Postinstall-Scripts (verhindert bekannte npm-Supply-Chain-Angriffe).
- `npm audit` im CI, `audit-ci --high` Abbruchbedingung.
- Minimal-Dependency-Policy: jede neue Abhaengigkeit braucht Begruendung. Ziel: < 30 direkte runtime deps.
- **Socket.dev** oder **Snyk** fuer Typosquatting-Detection (optional, kostenpflichtig).

### 4.8 Audit-Runtime-Guard

Zusatz: im Produktionsbuild `window.fetch` etc. abfangen und Alarm werfen:
```ts
if (import.meta.env.PROD) {
  const origFetch = window.fetch;
  window.fetch = (...args) => {
    console.error('NETWORK CALL DETECTED', args);
    document.body.classList.add('network-violation');
    throw new Error('Network calls are forbidden');
  };
  // dito XMLHttpRequest, WebSocket, EventSource, navigator.sendBeacon
}
```
Redundant zur CSP, aber defense-in-depth und fuer Audit-Demo nuetzlich.

---

## 5. Mandantenfähigkeit / White-Labeling

### 5.1 Entscheidungs-Matrix

| Ansatz | Pro | Contra |
|---|---|---|
| Build-Time (ein Build pro Kommune) | Maximal anpassbar, keine Runtime-Kosten | Build-Pipeline pro Kunde, Update-Aufwand × n |
| Runtime-Config (JSON bei App-Start) | Ein Build, n Deployments per Config-Datei | Config-Lade-Schritt, "Branding blitzt auf" |
| Single-App-Multi-Tenant (Kommune als Projekt-Metadatum) | Null Deploy-Overhead | Keine visuelle Trennung, Kommunen teilen URL |

### 5.2 Empfehlung: **Runtime-Config + Subdomain-Deployments**

- **Ein Build-Artefakt.**
- `public/tenant.json` wird beim Start geladen (via `fetch('/tenant.json')` — einzige Ausnahme zu `connect-src 'none'`, muss in CSP erlaubt sein fuer `'self'`. Besser: als JS-Modul bundeln, Tenant-Wahl per Build-Flag oder URL-Param.)
- Schema:
```json
{
  "tenantId": "musterstadt",
  "name": "Stadt Musterstadt",
  "logoUrl": "./assets/tenants/musterstadt/logo.svg",
  "primaryColor": "#0066cc",
  "secondaryColor": "#ffaa00",
  "contactEmail": "buergerrat@musterstadt.de",
  "customTexts": {
    "welcomeMessage": "Willkommen beim Bürgerrat Musterstadt ..."
  },
  "defaultLocale": "de",
  "features": {
    "householdCheck": true,
    "signedAudit": false
  }
}
```
- Deployment: pro Kommune ein Cloudflare-Pages-Projekt, `wrangler.toml` setzt `TENANT=musterstadt` als Build-ENV, beim Build wird `public/tenant.json` aus `tenants/musterstadt/tenant.json` kopiert.

### 5.3 Selbst-Deployment durch Kommunen

- ZIP-Download enthaelt **Default-Branding**.
- Kommune kann `tenant.json` und `assets/tenant/*` austauschen — dokumentiert in README.
- Alternative: **Config-Wizard-Modus** (`?config` URL-Param) → UI zum Anpassen, generiert ZIP mit neuem Branding im Browser via JSZip.

### 5.4 Lizenz-Modell fuer Mandanten

Nicht technisch aber relevant: open-source heisst, jede Kommune koennte selbst hosten. Geschaeftsmodell ist dann Support/Integration/Schulung, nicht Softwarelizenz.

---

## 6. Reproduzierbarkeit & Audit

### 6.1 Audit-JSON Schema

```json
{
  "auditVersion": "1.0",
  "app": {
    "name": "sortition-tool",
    "version": "1.4.2",
    "gitCommit": "abc1234",
    "buildSha256": "8f4a..."
  },
  "tenant": "musterstadt",
  "project": {
    "title": "Bürgerrat Klima Musterstadt 2026",
    "description": "...",
    "targetSize": 50,
    "createdAt": "2026-05-10T10:23:00Z"
  },
  "input": {
    "filename": "rueckmelder.csv",
    "rowCount": 847,
    "columnMapping": {"id": "laufende_nummer", "geschlecht": "geschlecht", ...},
    "sha256": "8d4e..."
  },
  "quotas": [
    {"category": "geschlecht", "values": [{"value": "weiblich", "min": 10, "max": 12}, ...]}
  ],
  "algorithm": {
    "name": "leximin",
    "version": "1.2",
    "solver": "glpk-js-4.0.2",
    "monteCarloSamples": 1000,
    "seed": "7f3a9b2c...",
    "parameters": {...}
  },
  "run": {
    "startedAt": "2026-05-10T10:24:15Z",
    "completedAt": "2026-05-10T10:24:58Z",
    "durationMs": 43012
  },
  "result": {
    "selectedIds": ["A123", "A456", ...],
    "quotaFulfillment": {...},
    "probabilityStats": {"min": 0.0412, "max": 0.0891, "ratio": 2.16},
    "probabilities": {"A123": 0.0734, ...}
  },
  "signature": {
    "algorithm": "ed25519",
    "publicKey": "3a7b...",
    "signature": "8c4d..."
  }
}
```

### 6.2 Seed + Reproduzierbarkeit

- Seed ist **eine 256-Bit-Zahl**, hex-kodiert.
- Default: `crypto.getRandomValues()`.
- User kann Seed manuell setzen (fuer Test/Replay).
- Algorithmus **muss** bei gleichem Seed + gleicher Input-Hash + gleicher Algo-Version deterministisch dasselbe Ergebnis liefern. Das ist **Test-Verantwortung** (siehe §9).

### 6.3 Signatur

Zwei Modelle:

**(a) Nutzer-eigener Key (empfohlen)**
- Veranstalter generiert einmalig Ed25519-Keypair (z.B. via der App oder externem Tool).
- Private Key bleibt beim Veranstalter (sensibel! ggf. Hardware-Token oder Papier-Backup).
- Public Key wird zusammen mit der Sortition-Einladung veroeffentlicht.
- Bei jedem Lauf: Audit-JSON wird lokal signiert, Signatur als `signature`-Feld.
- Vorteil: niemand kann sich als Veranstalter ausgeben.

**(b) App-eigener Key**
- Schwaecher, weil jeder mit demselben App-Build signieren koennte — bringt nur Integritaets-Check des Builds.
- Nicht empfohlen.

Empfehlung: **(a)**. UI-Flow: Settings → "Signatur-Key" → generieren/importieren/exportieren.

### 6.4 Live-Lauf (Screen-Recording-faehig)

- Alle Screens so gestaltet, dass sie auch in Projektion lesbar sind (Schriftgroesse, Kontrast).
- "Live-Modus": grosser Button rechts oben, zeigt Seed prominent auf Screen 5, animiert Seed-Generierung sichtbar (Coin-Flip-Animation ~3s).
- Ergebnis-Screen hat "Vollbild-Modus" fuer Projektor.
- Alles ist lokal — keine Netzwerk-Ruckler, Projektion kann auch offline laufen.

---

## 7. Browser-Kompatibilität

### 7.1 Zielmatrix

| Browser | Min. Version | Status |
|---|---|---|
| Chromium (Chrome, Edge, Brave) | 114 (Juni 2023) | voll |
| Firefox | 115 ESR | voll |
| Safari macOS | 16.4 | voll |
| Safari iOS | 16.4 | mit Einschraenkungen |

Ab Version 16.4 hat iOS-Safari endlich PWA-Install-Support + Push + Web Crypto + WASM BigInt.

### 7.2 Bekannte Risiken

- **iOS-Safari WASM-Memory**: harte 1 GB-Grenze pro Tab, realistisch eher 500 MB bevor der Browser den Tab killt. Fuer Losung mit 10k Rueckmeldern sollte das reichen (LP ist nicht riesig), aber **testen**.
- **Service Worker auf iOS**: Storage-Quota (~50 MB) und 7-Tage-Inactivity-Eviction. PWA-Install mitigiert das.
- **`file://` auf Safari**: laxer als Chrome, aber WASM-Streaming nicht unterstuetzt. Fallback auf `WebAssembly.instantiate(buffer)` statt `instantiateStreaming`.
- **Firefox Service Worker im Private Mode**: deaktiviert. App funktioniert, aber kein Offline-Cache.

### 7.3 Offline-Faehigkeit

- **Hosted PWA**: Service Worker cached alle Build-Artefakte (Workbox `precacheAndRoute(self.__WB_MANIFEST)`). Zweitaufruf komplett offline.
- **ZIP**: per Definition offline, kein SW.
- Update-Flow: SW erkennt neue Version, zeigt Banner "Neue Version verfuegbar — nach aktueller Losung neu laden".

### 7.4 Progressive Enhancement

- App braucht JS — Hinweis-Seite fuer No-JS-User ("Diese App benoetigt JavaScript").
- Kein SSR — unnoetig, weil kein Backend.

---

## 8. Code-Struktur (Monorepo)

### 8.1 Layout

```
sortition-tool/
├── package.json          # Root, pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .github/workflows/
│   ├── ci.yml            # lint, test, build
│   ├── release.yml       # Tag => Build + ZIP + GitHub Release
│   └── reproducible.yml  # Build-Hash-Check
├── packages/
│   ├── core/             # @sortition/core
│   │   ├── src/
│   │   │   ├── algorithms/  # leximin, maximin, nash, simple
│   │   │   ├── solver/      # glpk.js Wrapper, deterministische Seeds
│   │   │   ├── validation/  # Quoten-Konsistenzpruefungen
│   │   │   ├── audit/       # Hashing, Seed, Audit-JSON-Builder
│   │   │   └── types.ts
│   │   ├── test/
│   │   └── package.json
│   ├── ui/               # @sortition/ui (die SPA)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── i18n/
│   │   │   ├── tenants/   # per-Tenant Assets
│   │   │   └── workers/   # Web-Worker Entry Points
│   │   ├── public/
│   │   ├── e2e/           # Playwright
│   │   └── vite.config.ts
│   └── cli/              # @sortition/cli (optional, Phase 2)
│       └── src/           # Node-CLI fuer Batch-Laeufe, nutzt core
└── tenants/              # Tenant-spezifische Configs
    ├── default/
    │   ├── tenant.json
    │   └── assets/
    └── musterstadt/
        ├── tenant.json
        └── assets/
```

### 8.2 Warum kein Turborepo?

- Bei 2-3 Packages reicht `pnpm --recursive run build`.
- Turborepo erst sinnvoll ab ~5 Packages mit teurer Build-Zeit.
- `pnpm` mit `workspace:*`-Dependencies ist genug.

### 8.3 Core-Algorithmus separat?

Ja, unbedingt. `@sortition/core` ist:
- **Plattformagnostisch**: laeuft im Browser, Node, Deno, Bun.
- **Gut testbar**: Node-basiert, schnell, keine DOM.
- **Wiederverwendbar**: CLI-Tool fuer Batch-Laeufe, Integration in andere Systeme moeglich.
- **Auditbar**: externe Reviewer koennen isoliert den Algo verifizieren.

Export: ESM + CJS, TypeScript-Definitionen. Kein Default-Export.

---

## 9. Testing-Strategie

### 9.1 Unit-Tests: **Vitest** ^2

- Alle `@sortition/core`-Module: `>= 90 %` Coverage.
- UI-Komponenten: Vitest + `@solidjs/testing-library`.
- Speed: Vitest-Watch-Mode im Dev-Flow.

### 9.2 Property-Based Tests: **fast-check** ^3

Kritisch fuer Sortition. Properties:
- Deterministisch: `run(inputs, seed) === run(inputs, seed)` fuer beliebige Inputs und Seeds.
- Quoten-Konsistenz: ausgegebene Auswahl erfuellt alle Min/Max-Constraints.
- Groessen-Konsistenz: `|selected| === targetSize`.
- Probability-Bounds: fuer Leximin ist min(probability) >= theoretischer Unter-Wert bei gleichverteilten Inputs.
- Algorithmus-Monotonie: Hinzufuegen einer weiteren Person darf die Min-Probability nicht verringern (nicht immer wahr, aber in vielen Szenarien).

### 9.3 Golden-Master-Tests

- Ein festes Input-Set (anonymisiert, synthetisch) + fester Seed ⇒ exakt erwartetes Ergebnis eingecheckt.
- Bei Aenderungen am Algorithmus: bewusste Neu-Generierung des Goldens, in PR begruendet.
- Garantiert: niemand bricht versehentlich die Reproduzierbarkeit.

### 9.4 Browser-E2E: **Playwright** ^1.48

Szenarien:
1. **Happy Path**: neues Projekt → CSV laden → Quoten → Losung → Ergebnis exportieren.
2. **CSV-Edgecases**: Semikolon, BOM, mixed line endings, UTF-8 Umlaute, grosse Dateien (10 k Zeilen).
3. **Infeasibility**: absichtlich unerfuellbare Quoten → Error-Flow.
4. **Abbrechen**: Losung starten, Abbrechen-Button.
5. **Netzwerk-Assert**: `context.on('request', req => fail('UNEXPECTED REQUEST', req.url()))` fuer gesamten Test-Run.
6. **Persistence**: Projekt speichern (verschluesselt) → Reload → entschluesseln → gleicher State.

### 9.5 Cross-Browser-CI

- GitHub Actions Matrix: Chromium, Firefox, WebKit. Playwright managed das.
- iOS-Safari ist schwer in CI — BrowserStack oder **manueller Smoke-Test** auf echtem iPhone vor Release.

### 9.6 Visueller Regressionstest fuer PDF

- PDF generieren, Seite 1 als PNG rendern (`pdf2image`), Pixel-Diff gegen Baseline (`pixelmatch`).
- Bei Layout-Aenderungen: bewusste Baseline-Aktualisierung.
- Alternative: **Playwright Screenshot-Assertions** auf dem Audit-PDF-Preview.

### 9.7 Reproducible-Build-Test

Separater CI-Job: baut den Code zweimal in frischen Containern, vergleicht SHA-256 des Output-ZIP. Scheitert bei Nicht-Determinismus (Zeitstempel, Random-Pfade etc.). Wichtig fuer Distribution.

### 9.8 Security-Tests

- `audit-ci --high` im CI.
- CSP-Smoke-Test: Playwright laedt App, prueft `meta[http-equiv="Content-Security-Policy"]`-Inhalt.
- OWASP-ZAP-Baseline-Scan auf gehostetem Deployment.

---

## 10. Offene Fragen / Tech-Risiken

### Mit hoher Prioritaet zu klaeren

1. **iOS-Safari WASM mit glpk.js**: konkrete Messung notwendig. Bei 5 k-10 k Rueckmeldern und Leximin mit 1000 Monte-Carlo-Samples — bleibt der Tab unter 500 MB RAM? Fruehes Spike-Projekt erstellen.
2. **`file://`-ZIP mit Worker**: Worker-Laden via `new Worker(new URL(...))` auf `file://` in allen Target-Browsern testen. Ggf. Inline-Worker-Plugin (`vite-plugin-inline-worker`) noetig.
3. **Algorithmus-Korrektheit**: ist unsere Leximin-Implementation wirklich aequivalent zu Stratifications' Implementation? Cross-Check via CLI-Runs mit identischen Inputs.
4. **Rechtliche Einschaetzung**: reicht "Hosted PWA mit strikter CSP" fuer DSGVO-konforme Losung personenbezogener Daten? Wahrscheinlich ja (keine Verarbeitung durch Hoster passiert), aber **Fachjurist** konsultieren. Insbesondere: ist der Einsatz eines US-Hosters (Cloudflare) selbst bei fehlender Datenverarbeitung aus Schrems-II-Sicht problemlos? Ggf. europaeischen Hoster (z. B. Uberspace, netcup) bevorzugen.
5. **Signatur-Key-Management**: wie handhaben Kommunen ihre Ed25519-Private-Keys physisch? UI muss Key-Generation + Export mit deutlichen Warnungen begleiten. Separate Usability-Studie empfohlen.

### Mittlere Prioritaet

6. **Solver-Wahl endgueltig**: glpk.js vs. highs-js — Benchmark mit realistischen Datensaetzen. Entscheidung erst nach Messung.
7. **Framework-Wahl vs. Team-Skills**: wenn das Implementierungs-Team keine SolidJS-Erfahrung hat, ist React 19 mit Preact-Compat der Pragmatik-Weg. Kein Drama.
8. **Quoten-DSL fuer komplexe Regeln**: Wenn Kunden nicht nur `kategorie × wert × [min, max]`, sondern auch Kreuz-Quoten (z. B. "mindestens 3 Frauen 50+") wollen — Datenmodell jetzt schon dafuer offen halten.
9. **Translation-Wartung**: Wer pflegt die EN-Uebersetzungen? Externe Tools wie Crowdin sind Overkill, `i18next-scanner` im CI reicht.
10. **Audit-PDF-Sprache**: immer DE, oder Tenant-abhaengig? Vermutlich immer in Sprache der Oberflaeche.

### Niedrige Prioritaet / Spaeter

11. **CLI-Package**: fuer Batch-Laeufe und Integration. Nicht jetzt, aber Architektur darauf vorbereiten (core ist bereits separat).
12. **Plugin-System fuer Quoten**: falls Kommunen eigene Quoten-Logik brauchen — weit in der Zukunft.
13. **Mehrsprachige Protokolle**: Losung in DE, Audit in EN fuer internationale Stakeholder.
14. **Accessibility-Zertifizierung**: BITV 2.0 / WCAG 2.1 AA — Kobalte hilft, aber externes Audit empfohlen vor Release an oeffentliche Hand.
15. **Telemetrie** (explizit verneint, aber Ausschluss dokumentieren): "Wir haben absichtlich keine Usage-Metriken. Wenn ihr Fehler meldet, bitte manuell."

---

## Anhang: Quick-Reference Empfehlungstabelle

| Bereich | Empfehlung | Version |
|---|---|---|
| Framework | SolidJS | ^1.9 |
| Sprache | TypeScript (strict) | ^5.6 |
| Build | Vite | ^6 |
| PWA | vite-plugin-pwa (Workbox) | ^0.20 |
| UI-Primitives | Kobalte | ^0.13 |
| Styling | Tailwind CSS | ^3.4 |
| CSV | Papaparse | ^5.5 |
| Tabelle | TanStack Table + Solid-Adapter | ^8 |
| Chart | Observable Plot | ^0.6 |
| i18n | @solid-primitives/i18n | ^2 |
| LP-Solver | glpk.js (WASM, Worker) | ^4 |
| PDF | pdf-lib | ^1.17 |
| Signatur | @noble/ed25519 | ^2 |
| Unit-Tests | Vitest | ^2 |
| Property-Tests | fast-check | ^3 |
| E2E | Playwright | ^1.48 |
| Monorepo | pnpm workspaces | ^9 |
| Lizenz | Apache-2.0 oder EUPL-1.2 | — |
| Hosting (Default) | Cloudflare Pages | — |
| Distribution (Puristen) | ZIP, signiert, GitHub Releases | — |
