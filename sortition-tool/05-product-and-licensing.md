# Produkt- und Lizenz-Analyse: Browser-Sortition-Tool

> Stand: 2026-04-24
> Analyse für einen einzelnen Consultant, der prüft, ob eine browser-native Sortition-App für Bürgerräte als eigenes Produkt/OSS-Projekt wirtschaftlich und rechtlich tragbar ist. Baut auf Reports 01–04 und 05-sortition-algorithm.md im Parent-Ordner auf.

---

## TL;DR (klare Empfehlung)

**Bauen — aber klein, als Open-Source-Tool, nicht als Produktfirma. Geld über Consulting und Förderung, nicht über Software-Lizenzen.**

Die ehrliche Ausgangslage:

- **Markt ist klein**: 51 Bürgerräte in DE 2024 (Mehr Demokratie), davon 39 kommunal. Nur ein Teil davon nutzt ein dediziertes Sortition-Tool — die meisten kleinen kommunalen Verfahren laufen mit Excel + einem externen Dienstleister. Realistisch adressierbares Volumen für ein neues Tool: **10–25 Verfahren/Jahr DACH**.
- **Preis-Niveau schmal**: Kleine Kommunen geben für den **gesamten** Bürgerrat 9.000–30.000 EUR aus (Beispiel Warendorf: 9.000 EUR). Für reines Sortition-Tooling ist das Budget-Subset klein (niedriger vierstelliger Bereich pro Verfahren realistisch).
- **Platzhirsche sind real, aber nicht allmächtig**: Mehr Demokratie e.V. + nexus + ifok + IPG bildeten das Konsortium für den Bundes-Bürgerrat (6 Mio EUR für 2023–2025). Auf kommunaler Ebene ist "Es geht LOS" (Demokratie Innovation e.V. / MaibornWolff) der sichtbarste App-Anbieter. **Kein** Tool dominiert unangefochten — die Nische ist technologisch unterversorgt.
- **Rechtlich sauber bauen ist möglich**: Der Nature-2021-Algorithmus (Flanigan et al.) ist publiziert; eine saubere Neu-Implementierung in JavaScript/TypeScript ist **nicht** an die GPL-3.0 der Sortition-Foundation-Referenzimplementierung gebunden. Das ist die Voraussetzung dafür, überhaupt frei über das Lizenzmodell entscheiden zu können.
- **Haftung ist kontrollierbar** — aber nur, wenn das Tool als Werkzeug, nicht als Beratungsleistung verkauft wird, und der Consultant nicht die Losung **durchführt**, sondern nur das Werkzeug stellt.

**Empfohlenes Modell**: **Apache-2.0 oder MIT-lizenzierte Browser-App**, öffentlich auf GitHub, mit dem Consultant als Maintainer. Einnahmen:
1. **Prototype-Fund-Antrag** (bis 95k EUR + 63k Folgefinanzierung) als Startkapital — Bürgerbeteiligungs-OSS passt exakt ins Raster.
2. **Consulting/Setup** pro Kommune (1–3 Tage à Tagessatz) für Installation, Schulung, Quoten-Design.
3. **Mitarbeit an bestehenden Bürgerrats-Durchführungen** als Sortition-Spezialist für nexus / ifok / IPG / Mehr Demokratie — die brauchen das Werkzeug, wollen es aber selten selbst bauen.

**Nicht empfohlen**: Eigene Produktfirma aufbauen (Markt zu klein für skalierbares SaaS), in direkte Konkurrenz zu "Es geht LOS" gehen (die haben First-Mover + MaibornWolff-Backing), oder GPL-3.0-Copyleft mit Weiterentwicklungszwang (blockiert weißes-Label-Consulting-Verkauf an große Beratungen).

**Go-Kriterium**: Consultant hat 15–25 Tage über 3 Monate frei, **und** mindestens ein konkretes Referenzprojekt (Kommune oder Dienstleister) ist bereits in Sicht, das das Tool beim ersten Einsatz verwenden würde.

---

## 1. Marktüberblick

### 1.1 Größe

Quellen: [Mehr Demokratie Jahresbilanz 2024](https://www.mehr-demokratie.de/presse/einzelansicht-pms/jahresbilanz-buergerraete-losbeteiligung-erlebt-hoehenflug), [IDPF Uni Wuppertal](https://idpf.uni-wuppertal.de/de/aktuelles/ansicht/pressemitteilung-mitsprache-und-mitbestimmung-in-deutschland-gibt-es-immer-mehr-buergerraete), [buergerrat.de](https://www.buergerrat.de/).

| Ebene | 2024 (DE) | Ausblick 2025 |
| --- | --- | --- |
| Bund | 6 | eingeplant, konkrete Zahl offen |
| Bundesländer | 6 | wachsend, BaWü/RLP mit Spezialgesetzen treibend |
| Kommunen | 39 | plus neue Verfahren in gestarteten Kommunen |
| **Summe** | **51** | **24 fest geplant Stand Jan 2025** |

Themen-Top-3 2024: Klima (17), Verkehr (17), Stadtplanung (16).

**Adressierbar für ein neues Tool** (grobe Schätzung, nicht belastbar):

- **Bund + Länder (12 Verfahren/Jahr)**: Kaum adressierbar — die EU-weite Ausschreibung an das Konsortium Mehr Demokratie + nexus + ifok + IPG ist gesetzt. Diese Dienstleister haben ihre eigenen Methoden (i.d.R. Zusammenarbeit mit Sortition Foundation UK und panelot.org). Chance: Subunternehmer werden.
- **Kommunen (39 Verfahren/Jahr)**: realistisch adressierbar, aber nicht alle. Grobe Drittelung:
  - 1/3 zu klein/zu einmalig → kein Tool nötig, Excel reicht (9k-EUR-Budget)
  - 1/3 nutzt bereits "Es geht LOS" oder externe Dienstleister mit eigenen Tools
  - 1/3 suchend — **das ist das echte Zielsegment**. ≈ 10–15 Verfahren/Jahr DE.
- DACH-Aufschlag: +5–10 Verfahren/Jahr in A+CH (Vorarlberger Modell läuft kontinuierlich, aber ohne Tool-Lücke).

**Realistische Zielmarkt-Obergrenze: 15–25 Verfahren/Jahr DACH**, die ein dediziertes Sortition-Tool tatsächlich einsetzen würden und bei denen der Consultant ins Boot kommen kann.

### 1.2 Preis-Niveau

Quellen: [losland.org zu Bürgerrats-Kosten](https://www.losland.org/kosten-buergerrat/), [Sortition Foundation](https://www.sortitionfoundation.org/services), [Citizen Network](https://citizen-network.org/library/how-to-create-a-citizen-assembly.html).

| Segment | Gesamt-Budget Bürgerrat | Anteil Sortition/Tooling | Quelle |
| --- | --- | --- | --- |
| Kleine Kommune (eintägig, ~15–20 TN) | 5.000–15.000 EUR (Warendorf: 9.000 EUR) | <1.000 EUR | losland.org |
| Mittlere Kommune (mehrtägig, 40–60 TN) | 30.000–80.000 EUR | 2.000–6.000 EUR | losland.org |
| Großstadt / Land | 100.000+ EUR | 5.000–15.000 EUR | losland.org |
| Landesebene UK | ≈ 60.000 GBP für local authority | unklar | Citizen Network |
| Nationale Bürgerräte UK | 150–250.000 GBP | unklar | Citizen Network |
| Bundes-Bürgerrat DE | 3 Mio EUR 2023, 3 Mio EUR 2024/25 (Bundestag, 4er-Konsortium) | unklar | [Bundestag-Pressemeldung](https://www.bundestag.de/dokumente/textarchiv/2023/kw13-buergerraete-940748) |

**Kritische Lesart**: Der Sortition-Anteil ist pro Verfahren eher dreistellig bis niedrig vierstellig. Mit 10–25 Verfahren/Jahr DACH: theoretischer Jahres-Umsatz aus reinen Tool-/Setup-Leistungen grob **20.000–60.000 EUR**. Das ist **kein Produktmarkt** — aber es kann ein Baustein neben Consulting sein.

"Es geht LOS"-Preise sind nicht öffentlich dokumentiert (eigene Recherche: keine Pricing-Seite auf esgehtlos.org, kein öffentlicher Tarif in den Brandis/Tengen-Presseberichten). Gerüchteweise vier- bis fünfstellig pro Verfahren; belastbar nur per Direktanfrage.

### 1.3 Kunden-Typen

| Kundentyp | Adressierbarkeit | Charakteristik |
| --- | --- | --- |
| **Kommunen direkt** | Mittel | Kaufen selten Software-Lizenzen, bevorzugen Gesamtleistung inkl. Moderation. Beschaffungsaufwand hoch. |
| **Landesregierungen** | Niedrig | Ausschreibungspflichtig, langsam, große Konsortien bevorzugt. |
| **NGOs (Mehr Demokratie, Liquid Democracy)** | **Hoch** — aber als Partner, nicht als Kunde | Nutzen Tools selbst; könnten Consultant als Subunternehmer einbinden. |
| **Beratungen (nexus, ifok, IPG)** | **Hoch** | Commerce-orientiert, brauchen zuverlässige Werkzeuge. Am realistischsten als B2B-Kanal. |
| **Sortition Foundation UK / panelot** | Niedrig | Haben eigene Tools. Nur Kooperation, kein Verkauf. |

### 1.4 Sättigung

**Nicht gesättigt, aber strukturell eng**:
- **Top-Down (Bund/Länder)**: EU-Ausschreibungs-Konsortium ist gesetzt. Break-in nur als Subunternehmer.
- **Mitte (Beratungen)**: offen — keine dominante Werkzeug-Familie, jeder arbeitet noch mit Excel oder manueller Sortition-Foundation-Anbindung.
- **Unten (Kommunen)**: "Es geht LOS" ist sichtbarster App-Anbieter, aber nicht Standard. Viele kleine Verfahren laufen noch ohne spezialisiertes Tool.

**Einschätzung**: Offen genug für einen neuen Player, aber nur, wenn dieser Player nicht versucht, einen dominanten Marktanteil zu erobern, sondern eine Nische besetzt (browser-nativ / DSGVO-einfach / OSS).

---

## 2. Lizenz-Lage und Implikationen

### 2.1 GPL-3.0 der Referenzimplementierung

`sortitionfoundation/stratification-app` ist unter GPL-3.0 lizenziert (siehe 05-sortition-algorithm.md). Die GPL-3.0 ist eine **starke Copyleft-Lizenz** mit zwei Kernkonsequenzen:

1. **Derivative Work-Kette**: Wenn man Code aus `stratification.py` übernimmt, transformiert (z.B. nach JavaScript portiert mit denselben Funktions- und Variablennamen, gleicher Struktur, gleichem Kommentartext), oder gegen die Library linkt, **muss der Derivat unter GPL-3.0 (oder kompatibel) stehen**. Der Browser-App-Code muss dann offengelegt werden.
2. **Kommerzielles Weitervertrieb-Modell bleibt möglich, aber eingeschränkt**: GPL verhindert nicht Verkauf — sie verhindert, dass Empfänger die Freiheit verlieren, den Code weiter zu verändern und weiterzugeben. Das schließt **White-Label-Closed-Source-Versionen** aus. Ein SaaS-Hosting-Modell ist technisch möglich (GPL-3.0 ist keine AGPL), aber jede ausgelieferte JavaScript-Datei an den Browser ist **Distribution** und unterliegt GPL.

### 2.2 Der saubere Neu-Implementierungspfad

**Das Nature-2021-Paper** (Flanigan, Gölz, Gupta, Hennig, Procaccia) ist **Open Access** und beschreibt den Leximin-Algorithmus in mathematischer Notation. Algorithmen und mathematische Methoden sind **nicht urheberrechtlich schützbar** — nur konkrete Code-Implementierungen.

**Konsequenz**: Eine saubere Raum-Neu-Implementierung ("clean-room reimplementation") in JavaScript/TypeScript auf Basis **ausschließlich** des Papers + Standard-Solver-Libraries ist rechtlich nicht an die GPL-3.0 des Python-Codes gebunden.

**Bedingungen für eine verteidigungsfähige Clean-Room-Implementierung** (gutachterlich einholen, nicht nur in diesem Report verlassen):

1. Der Entwickler hat `stratification.py` **nicht zeilenweise studiert** oder kopiert. Ideal: eine Person liest das Paper und schreibt eine Spezifikation, eine **andere** Person implementiert gegen die Spezifikation ohne Einsicht in den Python-Code.
2. Die JS/TS-Implementierung verwendet **eigene** Variablennamen, eigene Struktur, eigene Test-Fixtures.
3. Solver-Dependencies sind **unabhängig**: für Mixed Integer Programming in JS gibt es z.B. `glpk.js`, `javascript-lp-solver`, oder WebAssembly-Ports von HiGHS/CBC. Für konvexe Optimierung: Eigen-Build oder numerische Libraries wie `ml-matrix`.
4. **Keine** Übernahme der `fixtures/`-Testdaten aus dem GPL-Repo in eigenen Tests (eigene Test-Fixtures generieren).

**Realistische Solver-Lage im Browser 2026** (knapp, aber machbar):
- `glpk.js` (WebAssembly) deckt die meisten MIP-Fälle ab (keine Gurobi-Performance, aber für <5.000 Rückmelder ausreichend).
- `HiGHS` hat einen WebAssembly-Port und ist signifikant schneller als CBC.
- Pipage-Rounding und leximin-Iteration lassen sich in reinem JS implementieren (mathematische Operationen, keine schweren Abhängigkeiten).

**Ehrliche Einschränkung**: Clean-Room ist **teurer** (grob Faktor 1,5–2 vs. direkte GPL-Portierung) und riskanter (mehr Bugs im eigenen Code). Für einen Single-Consultant ist das echter Mehraufwand.

### 2.3 Entscheidungs-Matrix Lizenzquelle

| Vorgehen | Aufwand | Lizenz-Pflicht | Kommerzielle Flexibilität |
| --- | --- | --- | --- |
| GPL-Port des Python-Codes nach JS | niedrig | GPL-3.0 Zwang | Hosting ok, Closed-Source-Weiterentwicklung nicht |
| Clean-Room Neu-Implementierung | hoch | frei wählbar (MIT/Apache/proprietär) | volle Flexibilität |
| Mischpfad (Solver als Library, Glue-Code GPL) | mittel | GPL-3.0 Zwang | wie oben, nicht besser |

**Empfehlung: Clean-Room-Neu-Implementierung**. Der Mehraufwand ist eine einmalige Investition, gibt aber **alle** Geschäftsmodell-Optionen zurück und ist eine strategische Versicherung.

**Alternative**, wenn clean-room zu teuer: GPL-Port machen und bewusst bei Modell C (siehe §3) bleiben. Auch valide, aber bindet.

---

## 3. Geschäftsmodell-Optionen

### 3.1 Modell A — Pures Open Source, Geld über Consulting

- Lizenz: MIT oder Apache-2.0
- Code öffentlich, jeder darf nutzen/forken/verkaufen
- Einnahmen: Tagessätze für Installation, Schulung, Quoten-Design, Integration, Audit

**Pro**:
- Maximale Adoption (keine Lizenzhürde), beste Reputation
- Kombiniert sauber mit Prototype-Fund-Antrag (siehe §4)
- Bezieht sich gut auf bestehende OSS-Community (Sortition Foundation, panelot, adhocracy+)
- Consulting ist das, was der Consultant bereits macht — keine neue Company-Struktur nötig

**Kontra**:
- Andere Beratungen (nexus, ifok) können das Tool gratis übernehmen und eigenes Consulting anbieten — der Consultant ist dann austauschbar
- Kein passives Einkommen, Skalierung nur über eigene Zeit

**Einschätzung**: **Passend für Single-Consultant**. Das ist kein Produkt, sondern ein Portfolio-Element, das Consulting anreichert.

### 3.2 Modell B — Open Core

- Lizenz: MIT für Kern-Algorithmus + CSV-Input; proprietär für "Enterprise-Features" (SSO, Audit-Trail, Multi-Tenant, SharePoint-Integration, BI-Reports)
- Einnahmen: Enterprise-Lizenzen + Consulting

**Pro**:
- Theoretisch skalierbarer
- Beispiele in Nachbar-Nischen (GitLab, Mattermost) funktionieren

**Kontra** (für diesen Markt):
- **Markt zu klein** für Enterprise-Lizenzen. Wenn maximal 25 Verfahren/Jahr DACH ein Tool nutzen, und davon ein Bruchteil Enterprise-Features braucht, ist die Kundenzahl für Lizenzverkauf zu klein, um die Zweit-Codebase zu rechtfertigen.
- Jedes proprietäre Feature ist ein Feature, das der Consultant **selbst** bauen und warten muss. Für Single-Person unrealistisch.
- Signalisiert "halb offen" — schadet der Reputation in der Demokratie-OSS-Community, die Vertrauen durch volle Auditierbarkeit gewinnt.

**Einschätzung**: **Nicht empfohlen für Single-Consultant**. Für ein 5–10-köpfiges Team mit VC-Anspruch relevant, hier nicht.

### 3.3 Modell C — GPL-Copyleft-Modell (wie Sortition Foundation)

- Lizenz: GPL-3.0 für gesamten Stack
- Einnahmen: Support-Verträge, Consulting, Hosting

**Pro**:
- Lowest-friction: direkt den Python-Code portieren, keine Clean-Room-Kosten
- Alle Kunden bekommen alles — fair, transparent, gut fürs demokratische Framing

**Kontra**:
- **Blockiert White-Label-Verkauf** an große Beratungen (nexus, ifok), die ihr eigenes Branding drüberpacken wollen. Das ist aber **der** realistischste B2B-Kanal.
- Wenn später eine Kommune/Land sagt "wir wollen eine proprietäre Erweiterung um Feature X bezahlen", ist das unter GPL schwieriger zu lösen.

**Einschätzung**: **Möglich**, aber nimmt Optionalität. Nur sinnvoll, wenn der Consultant sich bewusst auf die "Activist-Infrastruktur"-Positionierung festlegt.

### 3.4 Modell D — Komplett kommerziell

- Lizenz: proprietär
- Einnahmen: SaaS, White-Label

**Kontra**:
- **Zu wenig Kunden** im Markt (siehe §1)
- Kein Vertrauensvorteil gegenüber "Es geht LOS", die in der Nische schon etabliert sind
- Gibt alle OSS-Förderung (Prototype Fund etc.) auf

**Einschätzung**: **Nicht empfohlen**.

### 3.5 Empfehlung

**Modell A (Apache-2.0 oder MIT) mit Clean-Room-Neu-Implementierung**.

Wenn Clean-Room nicht realisierbar: **Modell C (GPL-3.0)** akzeptieren und bewusst dort bleiben. Der Verlust der White-Label-Option ist für einen Single-Consultant, der primär über eigenes Consulting Geld verdient, verschmerzbar.

Apache-2.0 > MIT, weil Apache zusätzlich die **Patent-Klausel** enthält — bei einem Algorithmus, der akademisch publiziert ist, gibt das den Nutzern zusätzliche Sicherheit, dass spätere Patent-Claims abgewehrt sind.

---

## 4. Kooperation statt Konkurrenz

### 4.1 Potenzielle Partner

| Partner | Geeignet als | Erster Schritt |
| --- | --- | --- |
| **Demokratie Innovation e.V. / Es geht LOS** | Potenziell Kunde oder Integrator (wenn ihre App einen Browser-Sortition-Baustein braucht). Ehrlicherweise aber auch **direkter Wettbewerber**, je nach Scope. | Mail an `app@esgehtlos.org` — Angebot "Browser-Sortition-Komponente als OSS-Beitrag" |
| **Liquid Democracy e.V.** | Ausgezeichnet. Maintainen adhocracy+; ein Browser-Sortition-Tool würde ihre Plattform ergänzen. Kein Lizenz-Konflikt (adhocracy+ ist AGPL, aber unser Tool läuft **neben**, nicht **in**). | Mail an `info@liqd.net` — Vorschlag, das Tool in adhocracy+-Dokumentation zu verlinken |
| **Mehr Demokratie e.V.** | Als Multiplikator & Methodenpartner. Veröffentlichen Leitfäden für Kommunen, können Tool als empfohlene Option listen. | Via Kontakt [mehr-demokratie.de](https://www.mehr-demokratie.de/) — der Landesverband nahe des Consultants |
| **Sortition Foundation UK (Nick Gill, Brett Hennig)** | Freundlicher Austausch, keine direkte Konkurrenz (sie betreiben keine Web-Nische). Evtl. Cross-Link zwischen Repos. | Mail an `info@sortitionfoundation.org` |
| **nexus Institut, ifok, IPG** | B2B-Kanal: einsetzen das Tool bei ihren Kommunal-Aufträgen. **Wichtigste** Business-Partnerschaft. | Direkt anschreiben — "Werkzeug + Subunternehmer bei Durchführung" |
| **Paul Gölz (CMU / ETH, Mit-Autor Nature-Paper, panelot)** | Wissenschaftliche Glaubwürdigkeit. Wenn er Validierungsdaten oder einen Blog-Nennung beisteuert, massive Credibility. | Mail via panelot.org / CMU-Adresse |

**Empfohlene Reihenfolge**:
1. Sortition Foundation + Paul Gölz anschreiben zuerst — OSS-Community, freundlich, kostet nichts, gibt Validierung
2. Liquid Democracy e.V. — strategischer Partner für adhocracy+-Kombi
3. nexus + ifok + IPG — als **B2B**-Gespräch (in dieser Reihenfolge nach Größe)
4. "Es geht LOS" — zuletzt, weil heikel: entweder Partner (unwahrscheinlich, da sie eigenen Stack haben) oder Konkurrent

### 4.2 Zuschüsse und Förderung

| Programm | Passung | Quelle |
| --- | --- | --- |
| **Prototype Fund** (OKF + BMBF): bis 95k EUR Erstförderung + 63k EUR Folgefinanzierung, Open Source Pflicht, Bewerbung 1. Okt–30. Nov 2025, Projektstart Juni 2026 | **Exakt passend**: Demokratie-Tool, OSS, kleines Team. Fokus 2025: data security + software infrastructure — Sortition-Tool passt unter beidem. | [prototypefund.de](https://www.prototypefund.de/en) |
| **BpB "Demokratie im Netz 2.0"** | Ausgerichtet auf politische Bildung, weniger auf Prozess-Tooling. Passt eher peripher. | [bpb.de Demokratie im Netz 2.0](https://www.bpb.de/die-bpb/foerderung/foerdermoeglichkeiten/558016/demokratie-im-netz-2-0/) |
| **BMI "Regional Open Government Labs"** | Gezielt kommunale Innovation. Mittel für konkrete Pilotprojekte mit Partner-Kommunen. | BMI-Förderdatenbank recherchieren bei konkretem Pilot |
| **"Demokratie leben!"** (BMFSFJ) | Für Träger ohne starke kommerzielle Absicht; für Consultant direkt schwierig (erfordert Trägerstruktur) | via lokalen Verein |
| **EU Horizon / CERV** | Möglich, aber Aufwand/Laufzeit 2+ Jahre — nicht geeignet für Solo-Consultant |
| **Deutsche Stiftung für Engagement und Ehrenamt** | Niedrige Einzelbeträge, eher für Vereine | Nachrangig |

**Empfehlung**: **Prototype Fund Round, die Ende 2025 zugeht** (Bewerbungsfenster 1. Oktober – 30. November 2025), genau anvisieren. Rhythmus passt: Consultant nutzt Sommer 2025 für Konzeption + erste Prototypen (Eigenleistung), bewirbt sich im Herbst 2025, Start Juni 2026. Teamgröße passt (bis zu 4 Personen; Consultant + 1–2 OSS-Mitstreiter reicht).

---

## 5. Differenzierung zur Konkurrenz

### 5.1 Alleinstellungsmerkmale einer browser-nativen Sortition-App

| Merkmal | Bedeutung |
| --- | --- |
| **Kein Backend, kein Hosting** | Radikale DSGVO-Vereinfachung: personenbezogene Daten (CSV aus Melderegister) verlassen nie den Rechner der Kommunal-Mitarbeiterin. Keine AVV mit Cloud-Anbieter nötig. |
| **Offline-fähig** | Kommune auf dem Land mit schlechtem Internet: Tool läuft trotzdem (nach einmaligem Download). Browser-Cache + Service-Worker = offline-fähige PWA. |
| **Vollständig auditierbar** | Eine einzige HTML-Datei + JS-Bundle, mit SHA-256-Signatur. Rechtsamt kann den Code prüfen lassen, bevor er zum Einsatz kommt — geht bei SaaS-Lösungen nicht. |
| **Kein Vendor-Lock-in** | Kommune kann das Tool auf einem USB-Stick archivieren und in 5 Jahren noch mal verwenden (z.B. für einen Nachfolge-Bürgerrat), auch wenn der Maintainer nicht mehr da ist. |
| **Kostenlos + OSS** | Keine Lizenzgebühr, keine Beschaffungsakte. Direkter Download. |
| **Reproducible Output** | Seed-basierte Losung + Hash der Input-CSVs → Kommune kann Ergebnis öffentlich verifizierbar machen (mit einem Beobachter, der den Seed mitvergibt). |

### 5.2 Wann eine Kommune sich für dieses Tool statt "Es geht LOS" entscheidet

| Kommune-Situation | Bevorzugt |
| --- | --- |
| Kleine Kommune (<50.000 EW), einmaliger Bürgerrat, schmales Budget, hohe DSGVO-Sensitivität im Rechtsamt | **Unser Browser-Tool** |
| Mittlere Kommune mit IT-Abteilung, plant 2–3 Bürgerräte über Legislatur, will Workflow-Automatisierung, Lust auf Cloud-Tool | **Es geht LOS** |
| Mittel-/Großstadt mit Beteiligungs-Dezernat, hat bereits Dienstleister-Vertrag mit nexus/ifok | **Dienstleister-Tool** (u.U. unser Browser-Tool als Subkomponente via Consulting) |
| Landes-Bürgerrat (BW, HH etc.) | Ausschreibung → Konsortium → nicht adressierbar direkt |

**Ehrlich**: "Es geht LOS" hat einen echten Vorteil: sie **machen Aufsuch-Nachbearbeitung** (persönliche Ansprache von Nicht-Antwortern) — das ist ein Feldservice, der in einer Browser-App per Definition nicht abbildbar ist. Für Kommunen mit Gleichstellungs-Anspruch ist das ein Show-Stopper-Vorteil von "Es geht LOS". Unser Tool adressiert nur **Schritt 2** (Sortition-Lauf), nicht die Aufsuch-Feldarbeit.

### 5.3 Was das Tool **nicht** tut (muss klar kommuniziert werden)

- Kein Melderegister-Import-Assistent (Kommune bringt saubere CSV selbst, oder nutzt Excel-Vorlage)
- Kein Serienbrief-Druck (eigener LaTeX-/WeasyPrint-Schritt außerhalb)
- Keine Online-Deliberation (dafür bleibt adhocracy+ / ähnliches)
- Kein CRM für Rückmeldungs-Management (separat zu lösen)

**Das ist ein Feature, keine Lücke**: Fokus = Differenzierung. Wer Multi-Tool-Suite will, nimmt "Es geht LOS".

---

## 6. Risiken

### 6.1 Haftung

Quellen: [LfD Niedersachsen FAQ kommunaler Datenschutz](https://www.lfd.niedersachsen.de/startseite/infothek/faqs_zur_ds_gvo/kommunaler-datenschutz-206875.html), [Datenschutzzentrum SH](https://www.datenschutzzentrum.de/tb/tb37/kap04_1.html).

**Rechtliche Ausgangslage**:
- Für die Verarbeitung personenbezogener Daten bei der Losung ist die **Kommune** verantwortlicher im Sinne Art. 4 Nr. 7 DSGVO. Der/die Hauptverwaltungsbeamt:in haftet.
- Wenn der Consultant das Tool **nur bereitstellt** (OSS-Download) und die Kommune es selbst betreibt: keine Auftragsverarbeitung, keine Haftung des Consultants für die Verarbeitung.
- Wenn der Consultant **als Berater** die Losung **durchführt** oder konfiguriert (Quoten-Design, Import, Lauf): klassische Beratungsleistung, Haftung nach Dienstvertrag (BGB § 280 ff.), **begrenzbar** durch AGB-Klauseln (Höhe = Auftragsvolumen oder max. 1 Mio EUR, typisch).

**Risiko-Szenarien**:

| Szenario | Schwere | Mitigation |
| --- | --- | --- |
| Algorithmus-Bug erzeugt nicht-repräsentatives Panel | Hoch, Reputation | Unit-Tests gegen Referenz-Outputs von `stratification.py`, externe Gutachter-Stellungnahme, Dokumentation der Grenzen |
| Kommune bricht DSGVO bei Verwendung des Tools (CSV an falschen E-Mail-Verteiler) | Mittel, Reputation | Starker Disclaimer im Tool: "Sie verarbeiten hier Melderegister-Daten. Verantwortung liegt bei Ihrer Kommune." |
| Technischer Fehler (z.B. Cross-Site-Script) leakt CSV in fremde Browser-Tabs | Hoch | Strict Content Security Policy, keine externen CDNs, Penetrationstest bei 1. Release |
| Gerichtliche Infragestellung des Losverfahrens durch nicht-ausgewählte Person | Mittel | Nicht primär Tool-Problem, aber: Reproduzierbare Losung (Seed + Hash) als Audit-Artefakt, Dokumentation, Link auf Nature-Paper |

**Haftungsbegrenzung-Strategie**:
- **Open-Source-Disclaimer** in der Lizenz (Apache-2.0 enthält Standard-Disclaimer: Software "AS IS", kein Gewährleistungsanspruch). Reicht für das Tool selbst.
- **Separate AGB für Consulting-Leistungen** mit Haftungsobergrenze und Einschluss des Mitverschuldens der Kommune.
- **Betriebshaftpflicht IT-Dienstleistung** (1–2 Mio EUR Deckung, typischer Jahresbeitrag 500–1.500 EUR) für alle Consulting-Verträge.
- **Nicht als "Rechtsberatung"** positionieren — Anti-Winkelschreiberei-Linie (RDG).

### 6.2 Reputationsrisiko

Single-Incident-Szenario: Ein Bürgerrat mit unserem Tool wird medial aufgegriffen, Nicht-Ausgewählte klagen, es stellt sich heraus, dass Stratifikations-Parameter falsch gesetzt waren. Presse: "Software für Bürgerrat hat verzerrte Auslosung erzeugt."

**Mitigation**:
- Jedes Verfahren einmal durch den Consultant validieren (Plausibilitäts-Check der Quoten-Datei, Vergleich Ausgangsverteilung vs. Panel-Verteilung)
- Audit-Log jedes Laufs als Artefakt speichern (nicht im Tool, als Markdown-Export für die Kommune)
- Klare "Limitations"-Sektion in der Doku: was das Tool prüft, was es **nicht** prüft

### 6.3 Nischenmarkt

10–25 Verfahren/Jahr DACH als adressierbare Obergrenze heißt: **kein Markt für ein wachsendes Produktunternehmen**, aber **genug, um ein Consultant-Portfolio-Element zu rechtfertigen**, das 2–6 Wochen Arbeit/Jahr generiert.

**Sensitivität**:
- Wächst der Markt? Ja — 2024 waren +20 % mehr Bürgerräte als 2023 laut Mehr Demokratie. Landesgesetze (BaWü 2024, Hamburg Juli 2024) und Bundes-Ausschreibungen senken Einstiegshürden.
- Schrumpft er? Realistisch nicht, solange die politische Instrumentalisierung nicht kippt.
- Kann der Consultant ohne diesen Markt leben? **Ja** — Consulting-Haupt-Geschäft bleibt unberührt. Das Tool ist Zusatz, keine Existenzgrundlage.

### 6.4 Wissenschaftliche Glaubwürdigkeit

Ohne akademischen Partner kann eine Kommunal-Beschaffung hinterfragen: "Ist Ihr Tool wissenschaftlich valide?"

**Mitigation**:
- Paper-Referenz prominent platzieren (Nature 2021 ist **die** Publikation in dem Feld)
- Optional: Paul Gölz als Advisor in Credits (kostet nichts, wenn er zustimmt)
- Test-Suite öffentlich zeigen: "Unsere Implementierung erzeugt bit-identische Ergebnisse wie die Python-Referenz auf 10+ Testfällen"
- Einen Kommunal-Piloten mit wissenschaftlicher Begleitung (IDPF Wuppertal?) durchziehen, Paper oder Blog-Post publizieren

---

## 7. Sustainability

### 7.1 Wartungs-Problem

**Single-Consultant-Maintainer ist fragil.** Wenn der Consultant in 3 Jahren weniger Zeit hat oder das Thema verliert, stirbt das Tool ohne Nachfolger. Für ein Tool, das Kommunen **rechtskritisch** einsetzen, ist das ein realer Nutzer-Nachteil.

### 7.2 Community-Strategie

| Baustein | Konkret |
| --- | --- |
| GitHub-Repo (Apache-2.0) mit klarem Contribution Guide | Standard — mit Issue-Templates für "Bug in Selection", "Quota Configuration Help" |
| Dokumentations-Seite mit How-To für Kommunen | MkDocs-Material, gehostet auf GitHub Pages |
| Halbjährlicher Release-Rhythmus | Berechenbar, signalisiert Pflege |
| Bürgerrats-Forum auf Mehr-Demokratie-Seite (wenn vorhanden, sonst anstoßen) | Dort Fragen beantworten, Tool empfehlen |
| Konferenzen: Netzwerk Bürgerbeteiligung Jahrestagung, Forum Demokratie (BpB), Open Gov Fellowship | 1–2 Auftritte pro Jahr als Sichtbarkeits-Baseline |

### 7.3 Träger-Modelle für Langzeit-Sustainability

| Option | Realitätsnähe |
| --- | --- |
| Eigenen Verein gründen | Überdimensioniert für diese Tool-Größe; nur sinnvoll bei 3+ Co-Maintainern |
| **An Liquid Democracy e.V. schenken** (Code-Eigentums-Transfer) | Attraktiv: hat Infrastruktur, Community, Mission-Fit. Consultant bleibt Hauptcontributor, muss aber nicht Träger sein. |
| An Sortition Foundation UK beitragen | Möglich, aber UK-Fokus passt nicht zu DACH-Konzentration |
| Eigene GbR mit 2. Person | Leichter als Verein, reicht für Prototype-Fund |
| Formell beim Consultant bleiben | Aktuell realistisch, Transfer später, wenn Community da ist |

**Empfehlung**: Start als persönliches Repo + Consultant als Maintainer. Nach 12–18 Monaten und wenn 3+ Kommunen das Tool produktiv nutzen: Übergabe-Gespräch mit Liquid Democracy e.V. initiieren.

---

## 8. Timing

### 8.1 Marktmomentum 2026

- 2024 Rekordjahr mit 51 Bürgerräten DE (Mehr Demokratie)
- Bürgerrat Ernährung 2023/24 hoch medial präsent
- Bundestag hat 3 Mio EUR für 2024/25 freigegeben
- Hamburg Gesetz Juli 2024 (zweites Bundesland mit DSGVO-konformer Sonderregelung)
- BaWü DBG von 2022/23 wirkt etabliert; Rheinland-Pfalz signalisiert Nachfolge
- Österreich Vorarlberg läuft konstant

**Fazit**: Günstig. Keine Anzeichen für Markt-Abkühlung. Sogar im Gegenteil — politische Mainstreaming-Phase.

### 8.2 Regulatorisches Umfeld

- DBG BW 2024: erstes Spezialgesetz
- Hamburg Juli 2024: zweites
- Weitere zu erwarten (Rheinland-Pfalz signalisiert, Bayern/Hessen unklar)
- BMG bleibt Basis, § 46 ist klar nutzbar

→ **Rechtslage wird eher einfacher, nicht komplizierter**. Für ein neu startendes Tool günstig.

### 8.3 Eigene Ressourcen

Kritischer als der Markt: Passt der Bau zum Alltag des Consultants?

**Mindest-Investition für ein brauchbares v1.0**:
- Algorithmus-Port (Clean-Room): 8–12 Tage
- CSV-Import, UI, Export-UX: 4–6 Tage
- Tests + Validierung gegen Python-Referenz: 3–5 Tage
- Doku + Landing-Page: 2–3 Tage
- **Summe: 17–26 Personentage** über 2–3 Monate realistisch

Plus: ~5 Tage Marketing/Networking (Partner anschreiben, Konferenz, erster Pilot).

**Consultant-Realitäts-Check**: Wenn der Consultant max. 2 Tage/Woche für Neben-Projekte hat, ist das v1.0 in 3–4 Monaten drin. Wenn er weniger hat, dauert es 6+ Monate — der Bürgerrats-Markt wartet, aber der Consultant verliert Momentum.

### 8.4 Fenster

**Jetzt bauen** ist besser als 2027:
- Prototype-Fund-Runde Herbst 2025 will man nicht verpassen (der Antrag ist selbst ein 3–5-Tages-Aufwand)
- "Es geht LOS" wird weiter wachsen, wenn man wartet
- Momentum von Bürgerrat Ernährung 2023/24 verblasst

---

## 9. Go/No-Go-Matrix

| Kriterium | Go-Signal | No-Go-Signal |
| --- | --- | --- |
| Zeit-Budget Consultant | ≥ 15 Tage über 3 Monate frei, 2–3 Tage/Monat Dauerpflege danach | < 10 Tage, zerrissen über 12 Monate |
| Erst-Pilot-Interessent | ≥ 1 Kommune ODER ≥ 1 Dienstleister signalisiert konkretes Interesse vor Build-Start | Kein konkreter Pilot in Sicht, nur Vermutung |
| Prototype-Fund-Bewerbung | realistisch machbar (OSS + kleines Team + fristgerecht) | fehlendes Team, zu spät, zu proprietär |
| Clean-Room-Implementierung | Consultant hat JS/TS-Solver-Erfahrung ODER Mitstreiter dafür | Allein, ohne Solver-Kenntnis, ohne Clean-Room-Prozess → fallback zu GPL-Port |
| Rechts-Check (Anwalt IT-Recht, 1–2 Stunden) | positives Gutachten zu Clean-Room + Apache-2.0 | Gutachten zeigt verborgene GPL-Probleme |
| Konkurrenz-Landschaft | "Es geht LOS" hat in 2026 keinen eigenen Browser-OSS-Zweig angekündigt | "Es geht LOS" öffnet ihre App selbst als MIT → eigene Arbeit weitgehend obsolet |
| Netzwerk-Zugriff | Consultant hat Zugang zu mindestens einem Bürgerrats-Akteur (nexus/ifok/IPG/Liquid Democracy/Mehr Demokratie) | Komplett kalt — muss erst Netzwerk aufbauen (kostet 6+ Monate) |
| Finanzielle Polster | Consultant kann den Monat ohne dieses Produkt überleben (Haupt-Consulting läuft) | Produkt muss Hauptgeschäft werden (unrealistisch im Zielmarkt) |

**Go** wenn ≥ 6/8 Go-Signale. **No-Go** wenn ≥ 2 No-Go-Signale erfüllt sind.

---

## 10. Empfohlene erste Schritte

In dieser Reihenfolge, nicht parallel:

1. **Woche 0 — Validierung (1–2 Tage)**:
   - Mail an Sortition Foundation + Paul Gölz mit Vorhaben-Skizze und Frage nach Validierungs-Testdaten.
   - Mail an Liquid Democracy e.V. — Interesse an Kooperation / Ergänzungs-Tool für adhocracy+-Setups?
   - Kurze Anfrage an 2–3 Kommunen aus Mehr-Demokratie-Jahresbilanz, die 2024 einen Bürgerrat hatten: "Hätten Sie ein browser-natives Sortition-Tool genutzt, wenn es existiert hätte? Was hat Ihnen beim Losverfahren gefehlt?"
   - **Exit-Kriterium**: Wenn < 1 positive Rückmeldung aus den Kommunen UND kein Dienstleister-Interesse → stopp.

2. **Woche 1 — Rechts-Check (0,5 Tage + ~500–1.000 EUR Anwalts-Honorar)**:
   - IT-Recht-Kanzlei: "Clean-Room Neu-Implementierung des Nature-Paper-Algorithmus, Apache-2.0 — Risiken?"
   - Haftungs-Grundsatz: "Tool-Bereitstellung vs. Durchführungs-Beratung, wo ist die Linie?"

3. **Woche 2–3 — Prototype-Fund-Vorbereitung (3–5 Tage)**:
   - Projektbeschreibung für Antragsfenster 1. Okt – 30. Nov 2025
   - Budget-Plan, Team (Consultant + 1 Co-Entwickler idealerweise)
   - OSS-Strategie, Zielgruppe, Nutzer-Research aus Schritt 1 einbauen
   - Parallel: GitHub-Org anlegen, Lizenz Apache-2.0, README mit Vision

4. **Woche 4–8 — Prototyp (12–15 Tage Entwicklungsarbeit)**:
   - Solver-Setup (glpk.js oder HiGHS-WASM)
   - Clean-Room Implementierung Leximin + Maximin
   - Test-Suite gegen 3–5 bekannte Fälle (eigene synthetische + reproducible outputs)
   - Minimales UI: CSV-Upload, Kategorien-Editor, Ergebnis-Export

5. **Woche 8–10 — Pilot-Gespräche (3–5 Tage)**:
   - Mit dem Erst-Interessenten aus Woche 0: Terminschleife, unverbindlicher Erst-Test
   - nexus/ifok/IPG anschreiben mit dem Prototyp als konkretem Artefakt
   - Prototype-Fund-Antrag final, einreichen

6. **Woche 10–16 — Produktionsreife + Pilotdurchlauf**:
   - Audit-Log, Doku, Landing-Page
   - Erster realer Bürgerrat-Lauf mit dem Tool (kostenfrei für den Piloten als Gegenleistung für Referenz-Dokumentation)

7. **Nach 6 Monaten — Entscheidung Skalierung**:
   - Wurde das Tool ≥ 1x produktiv genutzt? 
   - Hat mindestens ein Dienstleister es ernsthaft gestestet?
   - Wenn ja: in Consulting-Portfolio integrieren, 2–3 Tage/Monat Pflege.
   - Wenn nein: Code archivieren, keine weitere Zeit investieren, Lehrgeld buchen.

---

## Quellen

1. [Mehr Demokratie — Jahresbilanz Bürgerräte 2024](https://www.mehr-demokratie.de/presse/einzelansicht-pms/jahresbilanz-buergerraete-losbeteiligung-erlebt-hoehenflug) — 51 Verfahren DE 2024, 24 geplant 2025
2. [IDPF Uni Wuppertal — Pressemitteilung Bürgerräte 2024](https://idpf.uni-wuppertal.de/de/aktuelles/ansicht/pressemitteilung-mitsprache-und-mitbestimmung-in-deutschland-gibt-es-immer-mehr-buergerraete) — akademische Bestätigung der Mehr-Demokratie-Zahlen
3. [buergerrat.de — Aktuelles](https://www.buergerrat.de/aktuelles/) — Übersicht laufender Verfahren
4. [LOSLAND — Kosten Bürgerrat](https://www.losland.org/kosten-buergerrat/) — Budget-Bandbreiten Warendorf / Großstädte
5. [Citizen Network — How to Create a Citizen Assembly](https://citizen-network.org/library/how-to-create-a-citizen-assembly.html) — UK-Preisniveau (60k GBP local, 150–250k GBP national)
6. [Sortition Foundation — Services](https://www.sortitionfoundation.org/services) — Community-Tarif-Modell, nur per Anfrage
7. [Sortition Foundation stratification-app (GitHub)](https://github.com/sortitionfoundation/stratification-app) — Referenz-Implementation (GPL-3.0)
8. [Flanigan et al. — Fair algorithms for selecting citizens' assemblies (Nature 2021)](https://www.nature.com/articles/s41586-021-03788-6) — Algorithmischer Standard
9. [panelot.org](https://panelot.org/) — Web-UI des Nature-Algorithmus
10. [Bundestag — Bürgerrat Ernährung im Wandel](https://www.bundestag.de/dokumente/textarchiv/2023/kw13-buergerraete-940748) — Konsortium Mehr Demokratie + nexus + ifok + IPG, 3 Mio EUR / Jahr
11. [buergerrat.de — Jetzt können wir richtig durchstarten](https://www.buergerrat.de/aktuelles/jetzt-koennen-wir-richtig-durchstarten/) — Konsortium-Rolle
12. [nexus Institut](https://nexusinstitut.de/) — Beratungsprofil
13. [ifok GmbH](https://www.ifok.de/blog/1-deutscher-buergerrat/) — Beratungsprofil
14. [MaibornWolff — Case Study Es geht LOS](https://www.maibornwolff.de/en/case-studies/es-geht-los-development-of-a-cloud-based-application-for-citizen-participation/) — Architektur + Entstehungsgeschichte
15. [Es geht LOS](https://www.esgehtlos.org/) — Anbieter-Seite
16. [Prototype Fund](https://www.prototypefund.de/en) + [Application](https://www.prototypefund.de/en/application) — Förderrahmen bis 95k + 63k EUR, 1.10.–30.11.2025, Start Juni 2026
17. [BpB — Demokratie im Netz 2.0](https://www.bpb.de/die-bpb/foerderung/foerdermoeglichkeiten/558016/demokratie-im-netz-2-0/) — weniger passend, eher politische Bildung
18. [LfD Niedersachsen — Kommunaler Datenschutz FAQ](https://www.lfd.niedersachsen.de/startseite/infothek/faqs_zur_ds_gvo/kommunaler-datenschutz-206875.html) — Haftungsverortung bei Kommunen
19. [Datenschutzzentrum SH TB 37](https://www.datenschutzzentrum.de/tb/tb37/kap04_1.html) — DSGVO-Grundlage Verwaltung
20. [Gesetz über die dialogische Bürgerbeteiligung (DBG BW)](https://www.landesrecht-bw.de/bsbw/document/jlr-DialogB%C3%BCrgBetGBWrahmen) — erstes Spezialgesetz DE
21. Parent-Report 02-es-geht-los-analysis.md — AWS-Architektur "Es geht LOS", kein öffentliches Repo
22. Parent-Report 03-legal-framework-and-best-practices.md — § 46 BMG, DSGVO, Landesrecht-Übersicht
23. Parent-Report 05-sortition-algorithm.md — `stratification-app`-API, GPL-3.0-Bindung, Solver-Dependencies
