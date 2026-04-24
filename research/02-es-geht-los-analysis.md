# "Es geht LOS" — Recherche-Report

*Stand: 2026-04-24 — Recherche ausschliesslich auf oeffentlich zugaenglichen Quellen (Webseiten, Lobbyregister, Partner-Case-Study, betterplace, adhocracy.plus). Code/Repos wurden nicht eingesehen, da keine oeffentlichen Repos gefunden wurden.*

## TL;DR

- **"Es geht LOS"** ist ein Projekt des gemeinnuetzigen Vereins **Demokratie Innovation e.V.** (Sitz: Berlin-Umfeld, klein — laut Lobbyregister 17 Mitglieder, 0,10 VZAE, Aufwand <10k EUR/Jahr). Fokus: losbasierte, "aufsuchende" Buergerbeteiligung, inbesondere auf Bundes-, Europa- und Kommunalebene.
- **Die "Es geht LOS"-App ist NICHT adhocracy+**. Sie ist eine eigenstaendige, **AWS-basierte Cloud-Anwendung**, die 2022 in einer 5-woechigen MVP-Phase von **MaibornWolff GmbH** fuer Es geht LOS gebaut wurde. Stack: AWS Amplify, Cognito, Lambda, DynamoDB, Google Maps API. Erstproduktion: Maerz 2022 in Brandis (Sachsen).
- **adhocracy+ und Es geht LOS sind komplementaer, nicht identisch.** Es geht LOS besitzt ein Organisationsprofil auf `adhocracy.plus/esgehtlos/` — aber das wird nur fuer die **Verbreitung von Materialien und Praxisbeispielen** genutzt (Kommentarfunktion), nicht fuer das Losverfahren selbst. In Referenzprojekten (z.B. Tengen) wird **adhocracy+ fuer die Online-Diskussion** und die **Es geht LOS-App fuer Losziehung/Einladung/Aufsuchen** parallel eingesetzt.
- **Kernfeatures der App** (die adhocracy+ nicht bietet): Import randomisierter Melderegister-Daten, stratifizierte Auswahl, Serienbrief-Export, Einladungsmanagement ueber QR/Links/Post/Telefon, **kartenbasiertes "Aufsuchen"** nicht-antwortender Personen mit Pin-Routenplanung fuer Feldteams.
- **Verfuegbarkeit**: Die App wird als Service angeboten — Kommunen koennen sie "nutzen" inkl. Schulung und Materialien (Einladungsbrief-Templates usw.). Kontakt: `app@esgehtlos.org`. **Kein oeffentliches Preismodell, kein oeffentliches Git-Repo gefunden.** Das Attribut "Open Source" wird auf der Projektseite genannt, ist aber in keinem MaibornWolff- oder Es-geht-LOS-GitHub-Repo nachweisbar — Unsicherheit explizit markiert (siehe §3).

## 1. Die Organisation

**Name (offiziell):** Demokratie Innovation e.V. — "Es geht LOS" ist der Projekt- und Marken-Name.

**Selbstbeschreibung:** Initiative fuer "innovative, losbasierte und inklusive Beteiligungsformate und ihre Institutionalisierung". Ziel: die gesellschaftliche Vielfalt in moderierten Austausch mit Politik bringen; gezielte Einbeziehung "stiller Gruppen", die mit klassischer Beteiligung nicht erreicht werden.

**Rechtsform / Struktur (aus Lobbyregister R007461):**
- 17 Mitglieder, ausschliesslich natuerliche Personen
- 0,10 VZAE (d.h. deutlich unter einer Vollzeitstelle fuer Interessenvertretung)
- Vorstand: Katharina Liesenberg, Joachim Haas, Jonas Beuchert
- Mitfruenderin und Vorsitzende: Ina (Liesenberg) — "launched the project and built its foundation"
- Buch-Autoren des Grundlagenwerks (2022): Katharina Liesenberg & Linus Strothmann

**Geschichte / Meilensteine:**
- 2016: Linus Strothmann entwickelt das "Aufsuchende Losverfahren" in Falkensee.
- 2019: Geplanter Start eines Buergerrats auf Bundesebene (siehe Partizipendium-Artikel, urspruenglich Oktober 2019).
- 2021: Beratung des ersten bundesweiten Buergerrats ("Buergerrat Klima" unter der Schirmherrschaft von Horst Koehler).
- Maerz 2022: Erste Produktions-Einsaetze der App in Brandis (Sachsen) und Tengen (Baden-Wuerttemberg) — Ueberarbeitung der Stadtleitbilder. Auszeichnung "Ausgezeichnete Buergerbeteiligung" fuer Brandis.
- 2023-2024: "Hallo Bundestag — Gewaehlt. Gelost. Gemeinsam. Wahlkreistage fuer die Demokratie" — gefoerdert von der Bundeszentrale fuer politische Bildung (30.001-40.000 EUR).
- 2025-2026: Vier Europaeische Buerger-Foren (Bruessel + online), u.a. zum EU-Haushalt und ein Jugendbuergerrat — Es geht LOS verantwortlich fuer Konzept und Durchfuehrung des aufsuchenden Losverfahrens in Deutschland.

**Finanzierung (Lobbyregister 2024):**
- Mitgliedsbeitraege: bis 10.000 EUR / Jahr (Gesamtsumme)
- Aufwendungen fuer Interessenvertretung: bis 10.000 EUR
- Zuwendungen: **Bundeszentrale fuer politische Bildung** (30.001-40.000 EUR fuer "Hallo Bundestag")
- Zusaetzlich: BMI-Foerderung im Programm "Regional Open Government Labs" fuer Brandis/Tengen (ueber Stadt/Kommune)
- Saechsisches Justizministerium: Foerderung des Jugendrats Brandis
- Spenden ueber **betterplace.org** (u.a. ein laufendes Projekt fuer einen Chatbot in der Es-geht-LOS-App)

**Standort:** Deutschland (Berlin-Kontext; exakte Geschaeftsadresse im Impressum — konnte wegen HTTP-500 beim Abruf nicht verifiziert werden).

**Kontakt:**
- Allgemein: `team@esgehtlos.org`, `redere@esgehtlos.org`
- App-bezogen: `app@esgehtlos.org`

## 2. Die App (Funktionsumfang)

Quelle: offizielle Projektseite esgehtlos.org/projekte/es-geht-los-app + MaibornWolff-Case-Study.

**Zweck:** Digitalisierung aller Schritte des aufsuchenden Losverfahrens — von der Losziehung ueber Einladungsmanagement bis zum Feld-Aufsuchen.

**Drei Kernfunktionsbloecke:**

### 2.1 Losprozess
- Import **randomisierter Daten aus Melderegistern** (d.h. die Zufallsziehung findet auf Melderegister-Seite statt; die App erhaelt schon die anonymisierte Stichprobe).
- **Freie oder kriteriengestuetzte Auswahl** (= Stratifizierung): Alter, Geschlecht, weitere Kriterien werden auf Projektseiten erwaehnt, aber nicht im Detail dokumentiert.
- **Export von Serienbriefdaten** fuer physische Einladungsschreiben.

### 2.2 Einladungs-Management
- Rueckkanaele: **Post, E-Mail, Telefon, QR-Codes, personalisierte Links**.
- Eingeladene melden sich innerhalb der App an, hinterlegen **Bedarfe** (z.B. Kinderbetreuung, Sprache, Barrierefreiheit) und Kontaktdaten.
- Personalisierter Zugang pro eingeladener Person (personalisierte Links).

### 2.3 Aufsuchen (das Alleinstellungsmerkmal)
- "Alle, die nicht auf den Brief geantwortet haben, werden auf der Karte mit einem Pin dargestellt" — **Google Maps API**.
- Dezentralisierte **Routenplanung fuer Feldteams**, die Haustuergespraeche fuehren.
- Bei Pilotprojekten konnte so laut Es-geht-LOS ca. die Haelfte der angetroffenen Personen zur Teilnahme gewonnen werden.

**Zielgruppe:** Kommunen, Landkreise, Bundeslaender, Vereine, EU-Institutionen — ueberall wo ein Buergerrat/-forum durchgefuehrt werden soll, insbesondere mit Anspruch auf Erreichen unterrepraesentierter Gruppen.

**Keine oeffentliche Demo-URL, keine oeffentlichen Screenshots** in den recherchierten Quellen.

## 3. Technologie-Stack — nutzen sie adhocracy+?

**Kurzantwort: Nein, die App selbst nutzt adhocracy+ nicht. Beide Systeme laufen parallel bzw. ergaenzend nebeneinander.**

### 3.1 Belege GEGEN "App = adhocracy+"

1. **MaibornWolff-Case-Study** (`maibornwolff.de/en/en/case-studies/es-geht-los-building-a-cloud-based-low-code-application/`) nennt explizit den Stack:
   - AWS Amplify, AWS Cognito, AWS Lambda, DynamoDB, CodeCommit, Google Maps API
   - "Digital Garage approach", 5-Wochen-MVP
   - Keinerlei Erwaehnung von Python, Django, adhocracy+, Liquid Democracy — adhocracy+ ist Django/Python, das waere bei Uebernahme sichtbar.
2. adhocracy+ **kennt in seinen 10 Modulen** (Brainstorming, Ideenwettbewerb, Text diskutieren, Umfrage, Buergerhaushalt, Priorisierung, interaktive Veranstaltung, Debattenmodul, jeweils +/- Kartenvariante) **kein Losverfahren-Modul**. Quelle: `adhocracy.plus/info/features/` und `liqd.net/de/projects/adhocracyplus/`.
3. Auf `liqd.net` und im adhocracy+-Feature-Katalog wird "Es geht LOS" **nicht als Kunde, Partner oder Referenz gelistet**.
4. Produktions-Inbetriebnahme der App: Maerz 2022 in Brandis — passt genau zum 5-Wochen-MVP nach Projektstart bei MaibornWolff (Januar 2022).

### 3.2 Belege FUER eine adhocracy+-Praesenz (aber an anderer Stelle)

1. `adhocracy.plus/esgehtlos/` existiert: Es geht LOS hat ein **Organisationsprofil auf der adhocracy+-SaaS-Plattform**. Dort laufen aktuell zwei Projekte:
   - "Praxisbeispiele mit Aufsuchendem Losverfahren" (Kommentar-Modul)
   - "Materialien zur Durchfuehrung des Aufsuchenden Losverfahrens"
   → Zweck: **Wissens- und Materialverbreitung**, nicht Buergerrats-Durchfuehrung.
2. In Referenzprojekten wie **Tengen** laeuft die **Online-Diskussions-/Leitbildphase auf `beteiligung.tengen.de`** — das ist nachweislich eine adhocracy+-Installation (Footer: "adhocracy+ is a platform provided by Liquid Democracy e.V.", Logo sichtbar). Das Losverfahren lief separat ueber die Es-geht-LOS-App.
3. Die Projektseite der App spricht pauschal von "Open-Source-Software" und dass "Materialien auf adhocracy.plus gehostet" sind. Das adressiert aber die Materialien, nicht die App.

### 3.3 Offene Frage / Unsicherheit

- **Ist der App-Quellcode oeffentlich?** Trotz der Formulierung "Open-Source-Software" auf der Projektseite konnte **kein oeffentliches GitHub-Repo** gefunden werden. Die MaibornWolff-GitHub-Organisation listet kein Repo zu Buergerrat/Losverfahren/esgehtlos. Die Es-geht-LOS-eigene GitHub-Praesenz wurde nicht gefunden (`github.com/es-geht-los` oder aehnlich existiert vermutlich nicht).
- Plausibel: Die Behauptung "Open Source" kann sich auf die **Materialien/Methode** beziehen (Creative-Commons-artig), waehrend der App-Code **proprietaer bei Es geht LOS / MaibornWolff** bleibt. **Fuer Entscheidung ueber Plattform-Wahl sollte dies direkt angefragt werden.**

## 4. Unterschiede zu Standard-adhocracy+

Wenn eine Stadt "adhocracy+ fuer Buergerrat-Aufsetzung" evaluiert, ist wichtig: **adhocracy+ allein liefert KEIN Losverfahren und KEIN Einladungs-/Aufsuchen-Workflow**. Ueberblick:

| Feature | adhocracy+ (Standard) | Es geht LOS-App |
|---|---|---|
| Online-Diskussion, Brainstorming, Umfrage, Debatte, Buergerhaushalt | Ja (10 Module) | Nein |
| Interaktive Veranstaltung | Ja (Modul) | Nein |
| Textdiskussion / Leitbild-Kommentierung | Ja | Nein |
| **Melderegister-Import + Losziehung** | **Nein** | **Ja** |
| **Stratifizierte Auswahl** (Alter, Geschlecht usw.) | **Nein** | **Ja** |
| **Einladung via Serienbrief / Post** | Nein | Ja |
| **Nur-fuer-Eingeladene-Bereiche** (personalisierte Links) | Eingeschraenkt (ueber User-Accounts) | Ja, nativ |
| **Kartenbasiertes Aufsuchen nicht-antwortender Personen** | Nein | Ja |
| **Routenplanung fuer Feldteams** | Nein | Ja |
| Kommunen-Integration (Melderegister-Schnittstelle) | Nein | Ja, via Import |
| Hosting | SaaS (`adhocracy.plus`) oder self-hosted (AGPLv3) | SaaS ueber Es geht LOS auf AWS |
| Lizenz | AGPLv3 (Code oeffentlich: `github.com/liqd`) | **Unklar** — "Open Source" behauptet, kein oeffentliches Repo gefunden |
| Kosten | Kostenlos (SaaS ueber Spenden finanziert); self-hosted: Infrastrukturkosten | Kein oeffentliches Preismodell; Service-Modell mit Schulung |

**Fazit dieser Tabelle:** Wer einen Buergerrat mit **losgezogenen Teilnehmenden + aufsuchendem Verfahren** aufsetzen will, bekommt mit "adhocracy+ allein" **nicht die Funktionalitaet, die die Es-geht-LOS-App bietet**. Der pragmatische Weg vieler Kommunen ist ein **Parallel-Betrieb** — wie in Tengen/Brandis — mit adhocracy+ fuer Online-Phase und Es-geht-LOS-App fuer Losprozess.

## 5. Referenz-Projekte / durchgefuehrte Buergerraete

**Kommunal:**
- **Brandis (Sachsen), 2022**: Ueberarbeitung Leitbild; ~35 geloste Teilnehmende; BMI-gefoerdert ("Regional Open Government Labs"); Erst-Einsatz der App. Spaeter auch Jugendrat Brandis (gefoerdert vom Saechsischen Justizministerium). Auszeichnung "Ausgezeichnete Buergerbeteiligung" 2024.
- **Tengen (Baden-Wuerttemberg), 2022**: Ueberarbeitung Leitbild; ~35 geloste Teilnehmende; parallel adhocracy+-Plattform `beteiligung.tengen.de` fuer Online-Phase. BMI-gefoerdert.

**Bundesebene:**
- **Buergerrat Klima 2021**: Beratung/Begleitung (Schirmherr Horst Koehler). Durchfuehrung lag nicht vollstaendig bei Es geht LOS; sie brachten das Losverfahren ein.
- **Hallo Bundestag 2023-2024**: "Wahlkreistage" — ~30 Personen pro Wahlkreis; mehrere Wahlkreise bundesweit. Gefoerdert von der Bundeszentrale fuer politische Bildung. Naechste Phase ab Herbst 2025.

**EU-Ebene (2025-2026, laufend):**
- Vier Europaeische Buerger-Foren (Bruessel + online), u.a. zum **EU-Haushalt** und **Junger Buergerrat**. Es geht LOS verantwortet das aufsuchende Losverfahren in Deutschland.

**Groessenordnung:** typisch 30-35 Teilnehmende pro kommunalem Rat; bei Bundesebene (Buergerrat Klima) ~100; bei Hallo Bundestag ~30 pro Wahlkreis.

## 6. Verfuegbarkeit & Zugang

**Service-Modell, keine Lizenz:** Es geht LOS bietet Kommunen/Organisationen an, die App zu **nutzen** ("Kommunen und Organisationen koennen die App verwenden"). Dazu kommt:
- Schulung zum aufsuchenden Losverfahren und zur App-Bedienung
- Templates: Einladungsbriefe, Informationsblaetter
- "Es-geht-LOS-Material-Toolkit" (Qualitaetsstandards)
- Vereinsmitgliedschaft und Academy moeglich

**Kein oeffentliches Preismodell.** Fuer Kommunen, die das evaluieren, ist der **direkte Weg eine Anfrage** an `app@esgehtlos.org`. Fuer allgemeine Kooperation: `team@esgehtlos.org`.

**Code-Verfuegbarkeit:** Trotz der Formulierung "Open-Source-Software" auf der Projektseite ist **kein oeffentliches Repository auffindbar**. Sollte die Stadt Code-Zugang / Self-Hosting-Moeglichkeit brauchen, ist dies **explizit abzufragen**.

**Datenschutz:** Die MaibornWolff-Case-Study betont "hochsensible personenbezogene Daten" (Melderegister-Daten), AWS-Verschluesselung und granulare Rechteverwaltung (AWS Cognito). Hosting auf AWS — fuer deutsche/oesterreichische Kommunen ggf. DSGVO-relevante Pruefung der AWS-Region/Auftragsverarbeitung.

## 7. Alternativen & verwandte Anbieter

### 7.1 Losverfahren-spezifisch (direkter Wettbewerb / Alternative zur App)

- **Sortition Foundation (UK)** — die fuehrende internationale Organisation fuer gelostes Buergerrats-Recruitment:
  - **StratifySelect** (Open Source, GitHub: `sortitionfoundation/stratification-app`) — wissenschaftlich fundierter stratifizierter Auswahlalgorithmus (Nature-Paper 2021 "Fair Algorithms for Selecting Citizens' Assemblies" von Procaccia et al. als fairster bekannter Algorithmus ausgezeichnet).
  - **GroupSelect App** (Open Source) fuer Untergruppen-Bildung.
  - **Open Democratic Lottery Platform** fuer Einladungs- und Teilnahmeverwaltung.
  - Mehr als 40 Buergerraete weltweit mit ihrem Algorithmus durchgefuehrt. In Deutschland Subunternehmer im Konsortium fuer den bundesweiten "Buergerrat Ernaehrung" (mit IFOK, nexus, IPG, Mehr Demokratie, 2023).
- **newDemocracy Foundation (Australien)** — Pionier-Organisation fuer Citizens' Juries; liefert vor allem Methodik und Beratung, weniger standardisierte Software.

### 7.2 Online-Beteiligungsplattformen (Alternativen / Ergaenzungen zu adhocracy+)

- **CONSUL / CONSUL Democracy** — weltweit groesste Open-Source-Beteiligungsplattform, ueber 250 Staedte (Madrid, Muenchen, Detmold). In Deutschland v.a. ueber **Mehr Demokratie e.V.** und Dienstleister wie **wer denkt was GmbH** als SaaS angeboten.
- **Decidim** — in Barcelona entwickelter Open-Source-Stack; international weit verbreitet; wird als Alternative zu adhocracy+/CONSUL gehandelt.
- **BuergerRat.de** (Betreiber: Mehr Demokratie e.V.) — **Informationsportal**, keine Beteiligungs-Software. Fuer Aufklaerungszwecke, nicht zur Buergerrats-Durchfuehrung.

### 7.3 Netzwerk / Ecosystem (Deutschland)

- **Mehr Demokratie e.V.** — groesster Anbieter/Netzwerker; Konsortialfuehrer fuer Bundes-Buergerraete; betreibt CONSUL-Infrastruktur (`consul.mehr-demokratie.info`).
- **Liquid Democracy e.V.** (Berlin) — Traeger von adhocracy+; eher Diskussions-/Beteiligungsplattform-Fokus, kein eigenes Losverfahren-Tool.
- **Netzwerk aleatorische Demokratie** — losbasierte-Demokratie-Netzwerk (`aleatorische-demokratie.de`).
- Private Dienstleister: **wer denkt was GmbH**, **demokratie.today**, **ProjectTogether** (Hackathon-Kontext).

### 7.4 Empfehlungs-Richtung fuer die anfragende Stadt

Fuer einen gelosten Buergerrat mit aufsuchender Ansprache auf adhocracy+-Basis stehen realistisch drei Wege:

1. **Es geht LOS-App + adhocracy+ parallel** (das Tengen/Brandis-Modell) — etabliert, aber zwei Systeme, zwei Vertraege.
2. **Sortition Foundation Tools + adhocracy+** — StratifySelect ist Open Source und in der Einladungsmanagement-Tiefe aehnlich; der Aufsuchen-Workflow fehlt aber und muesste selbst gebaut werden.
3. **CONSUL + externe Losverfahren-Beratung (z.B. Mehr Demokratie)** — wenn die Stadt nicht an adhocracy+ gebunden ist.

Eine reine **adhocracy+-Loesung ohne Losverfahren-Zusatz** ist fuer einen stratifizierten Buergerrat technisch nicht ausreichend.

## Quellen

1. https://www.esgehtlos.org/ — Hauptseite
2. https://www.esgehtlos.org/projekte/es-geht-los-app — App-Projektseite
3. https://www.esgehtlos.org/die-idee — Konzept
4. https://www.esgehtlos.org/geloste-beteiligung/aufsuchendes-losverfahren — Methodenbeschreibung
5. https://www.esgehtlos.org/verein-und-team — Team/Verein (Abruf fehlgeschlagen, HTTP 500)
6. https://www.esgehtlos.org/impressum — Impressum (Abruf fehlgeschlagen, HTTP 500)
7. https://www.esgehtlos.org/projekte/hallobundestag — Hallo Bundestag
8. https://www.esgehtlos.org/unsere-arbeit/brandis-tengen — Referenzprojekt
9. https://www.esgehtlos.org/beteiligung-brandis-tengen — Abschlussseite
10. https://www.esgehtlos.org/site/assets/files/1898/abschlussbericht_brandis-und-tengen-gehen-los_doppelseitig.pdf — Abschlussbericht
11. https://www.esgehtlos.org/kennenlernen-1 — Kennenlernen (Abruf fehlgeschlagen, HTTP 500)
12. https://www.esgehtlos.org/projekte/burgerrat-klima — Buergerrat Klima
13. https://www.lobbyregister.bundestag.de/suche/R007461 — Lobbyregister-Eintrag
14. https://www.maibornwolff.de/en/en/case-studies/es-geht-los-building-a-cloud-based-low-code-application/ — MaibornWolff Case Study (Technikstack-Quelle)
15. https://github.com/MaibornWolff — MaibornWolff GitHub (kein Es-geht-LOS-Repo)
16. https://adhocracy.plus/esgehtlos/ — Es-geht-LOS-Profil auf adhocracy+
17. https://adhocracy.plus/info/features/ — adhocracy+-Features
18. https://liqd.net/de/projects/adhocracyplus/ — Liquid Democracy / adhocracy+
19. https://beteiligung.tengen.de/projects/tengen-geht-los/ — adhocracy+-Instanz Tengen (Belege fuer Koexistenz)
20. https://www.betterplace.org/de/projects/116470-buergerraete-skalieren-und-stille-gruppen-verstehen-die-es-geht-los-app — Spendenprojekt
21. https://partizipendium.de/es-geht-los-buergerrat-in-deutschland/ — Partizipendium-Analyse
22. https://www.netzwerk-demokratie-und-beteiligung.de/.../es-geht-los-berlin/ — Netzwerk-Eintrag
23. https://rathaus.stadt-brandis.de/2024/10/25/buergerbeteiligung-brandis-fuer-buerger-und-jugendrat-ausgezeichnet/ — Auszeichnung Brandis
24. https://www.sortitionfoundation.org/services — Sortition Foundation (Alternative)
25. https://github.com/sortitionfoundation/stratification-app — StratifySelect
26. https://github.com/sortitionfoundation/groupselect-app — GroupSelect
27. https://consul.mehr-demokratie.info/ — CONSUL bei Mehr Demokratie
28. https://consuldemocracy.org/ — CONSUL Democracy
29. https://www.mehr-demokratie.de/mehr-wissen/buergerraete/bundesweite-buergerraete — Mehr Demokratie zu Buergerraeten
30. https://www.mehr-demokratie.de/presse/.../jahresbilanz-buergerraete-losbeteiligung-erlebt-hoehenflug — 51 Buergerraete 2024 DE
31. https://www.aleatorische-demokratie.de/ — Netzwerk aleatorische Demokratie
32. https://democracy-technologies.org/tool/adhocracy/ — Tool-Uebersicht

---

**Unsicherheiten / nicht abschliessend geklaert:**

- **Ist die Es-geht-LOS-App wirklich Open Source (im Sinne von oeffentlichem, nutzbarem Quellcode)?** Die Selbstbeschreibung sagt ja, ein Repo wurde nicht gefunden. **Direkt anfragen.**
- **Genaues Preismodell / Lizenzmodell der App-Nutzung.** Nicht oeffentlich — direkt bei `app@esgehtlos.org` erfragen.
- **Konkreter Stratifizierungs-Algorithmus** der Es-geht-LOS-App: wird mit MaibornWolff-eigener Logik oder mit etablierten Bibliotheken (z.B. StratifySelect von der Sortition Foundation) gearbeitet? Unklar.
- **Exakte Geschaeftsadresse und Registergericht** — Impressum-Abruf schlug mit HTTP 500 fehl; im Lobbyregister-Eintrag R007461 sollten diese Daten vorhanden sein, wurden aber im extrahierten Feld nicht einzeln wiedergegeben.
