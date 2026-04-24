# Bürgerrat auf adhocracy+ — Synthese

> Stand: 2026-04-24 | Konsolidiert die Einzel-Reports 01–04 in diesem Ordner

## Die zentrale Überraschung

**Die Ausgangshypothese war falsch.** "Es geht LOS" nutzt **nicht** adhocracy+ im Hintergrund. Laut Recherche (Report 02) ist die "Es geht LOS"-App eine eigenständige AWS-Cloud-Anwendung (AWS Amplify, Cognito, Lambda, DynamoDB), 2022 in fünf Wochen als MVP von MaibornWolff GmbH gebaut. Kein öffentliches Git-Repo auffindbar. Liquid Democracy e.V. listet "Es geht LOS" nicht als Partner. Die Es-geht-LOS-Organisation (Demokratie Innovation e.V.) hat zwar ein eigenes Organisationsprofil auf adhocracy.plus, aber das ist reine Materialverbreitung — kein Shared Stack.

**In Referenzprojekten wie Tengen laufen beide Systeme parallel:**
- adhocracy+ → Online-Deliberation (`beteiligung.tengen.de`)
- Es-geht-LOS-App → Losverfahren, Einladungsbriefe, aufsuchende Ansprache nicht antwortender Personen

Das bedeutet: **adhocracy+ deckt den deliberativen Teil eines Bürgerrats gut ab, aber für das Losverfahren aus dem Melderegister fehlt im Repo praktisch alles.**

## Was adhocracy+ heute liefert (Report 01)

| Bereich | Status |
| --- | --- |
| **Private Projekte** (`access` = PRIVATE in `adhocracy4.projects.enums`) | Vorhanden — Projekt nur für eingeladene User sichtbar |
| **Bulk-Invite-CSV** (`apps/projects/forms.py:46-71`) | Vorhanden — skaliert auf ~1000 Einladungen |
| **Rollen**: Org-Initiator / Moderator / Participant | Vorhanden, sauber getrennt |
| **Deliberative Module** | Vorhanden: `documents` (Kommentieren zu Texten) → `debate` → `polls`/`topicprio` (Abstimmen) |
| **Offline-Events** (`apps/offlineevents/`) | Vorhanden — Präsenztermine dokumentierbar |
| **Exports** (`apps/exports/`) | Vorhanden — CSV/Excel für Ergebnisse |
| **Moderatoren-Feedback** | Vorhanden (`apps/moderatorfeedback/`, `apps/moderatorremark/`) |

**Empfohlener Blueprint-Baukasten** für den deliberativen Teil:
`documents_phases.CommentPhase()` (Informieren & Kommentieren der Sachinfos) → `debate_phases.DebatePhase()` (Diskussion der Optionen) → `poll_phases.VotingPhase()` (Empfehlung verabschieden)

## Was fehlt (Report 04, 11 Gaps)

Kritisch (muss):

1. **Melderegister-Import** — CSV/XML aus der Gruppenauskunft nach § 46 BMG → interne Datenstruktur
2. **Stratifizierter Sampling-Algorithmus** — keine Integration von `panelot` / Sortition Foundation `stratification` (leximin)
3. **PDF-Serienbrief-Versand** — Einladungen müssen per **Post**, nicht E-Mail (das EMA gibt keine E-Mail-Adressen)
4. **Zweistufiger Losprozess** — erst große Stichprobe, dann aus Rückmeldern stratifiziert auf die finale Gruppe
5. **DSGVO-Retention** — automatische Löschung der Melderegister-Daten nach Prozessende

Sollte:

6. Token-Invite-Flow (Grundgerüst da, braucht zweite Stufe)
7. Stärkere Zugriffskontrolle für PRIVATE-Projekte
8. Engere Verzahnung Online-Plattform ↔ Präsenztermine
9. Öffentliche Ergebnis-Dokumentation getrennt von interner Deliberation

Kein Gap:

10. Deliberative Module (die Standard-Module reichen aus)
11. Demografische User-Felder — sollten **nicht** an `User` hängen, sondern an ein separates, nach Prozessende löschbares Modell

## Rechtsrahmen in drei Sätzen (Report 03)

- **§ 46 BMG (Gruppenauskunft)** ist die zentrale Rechtsgrundlage in Deutschland. Erlaubte Selektionskriterien: **Alter, Geschlecht, Staatsangehörigkeit, Anschrift, Familienstand**. Bildung und Migrationshintergrund sind **nicht** aus dem Melderegister abrufbar — müssen per Selbstauskunft in Stufe 2 erhoben werden.
- **DSGVO-Rechtsgrundlage**: Art. 6 Abs. 1 lit. e + Abs. 3 (öffentliche Aufgabe), nicht Einwilligung. Auskunftssperren nach § 51 BMG sind zwingend zu respektieren.
- **Baden-Württemberg** hat als erstes Bundesland mit dem Gesetz über dialogische Bürgerbeteiligung (DBG BW) eine explizite Spezialnorm; Österreich hat mit dem **Vorarlberger Modell** (Landesverfassung) ein einzigartiges Konstrukt.

## Best Practices in drei Sätzen (Report 03)

- **Zwei-Stufen-Verfahren** ist internationaler Standard (OECD, newDemocracy Foundation). Rücklauf typisch 5–11 %. Bürgerrat Ernährung 2023/24: 20.000 Einladungen → 2.220 Rückmelder → 160 Teilnehmende.
- **Stratifikation** üblich nach Alter × Geschlecht × Wohnort × Bildung × weitere prozessspezifische Merkmale. **Leximin-Algorithmus** (Flanigan et al., Nature 2021) ist der aktuell fairste dokumentierte Ansatz, frei nutzbar über `panelot.org` und `sortitionfoundation/stratification-app`.
- **Entschädigung**: im Bürgerrat Ernährung 100 €/Präsenztag, 50 €/digitaler Sitzung. Barrierefreiheit (Kinderbetreuung, Sprache, Assistenz) ist erfolgskritisch.

## Drei realistische Umsetzungspfade

### Pfad 1 — Kooperation mit "Es geht LOS" (Anker-Empfehlung für schnellen Start)

Die Stadt fährt das Setup **genau wie Tengen**:
- adhocracy+ als Selbst-Hosting oder auf adhocracy.plus für die Deliberation
- "Es geht LOS"-App für Losverfahren + Briefversand + Aufsuchen (Kontakt: `app@esgehtlos.org`)
- Demokratie Innovation e.V. bietet Beratung für Kommunen

**Vorteil**: kürzester Zeit-zu-Bürgerrat, erprobtes Setup, keine Entwicklung. **Nachteil**: Zwei Tools, zwei Vertragspartner, "Es geht LOS"-Preise nicht öffentlich, App ist nicht offensichtlich Open Source — Vendor-Abhängigkeit.

### Pfad 2 — Sortition extern, Deliberation auf adhocracy+ (Minimal-Eigenleistung)

- Los-Werkzeug: `stratifyselect` (Sortition Foundation, GPL-3, Python, leximin-Algorithmus)
- Briefe: LaTeX/WeasyPrint-Serienbrief, Versand über einen Druck-/Versandpartner
- adhocracy+ selbstgehostet mit PRIVATE-Projekt und CSV-Bulk-Invite

**Aufwand laut Report 04 (Variante A)**: 1–2 Wochen. **Nachteil**: viel Handarbeit im Ablauf, keine Audit-Trails, DSGVO-Cleanup manuell.

### Pfad 3 — Neue Django-App `apps/buergerrat/` (saubere, nachnutzbare Lösung)

- Neue App im Fork — **keine Änderung bestehender Modelle** (Migrations-sensitiv, siehe `docs/contributing.md:36-42`)
- Modelle: `CitizenCouncil`, `MelderegisterSample` (AES-verschlüsselt), `SortitionRound`, `InvitationBatch`, `Invitation`
- Integration mit `apps/projects/` via 1:1-Relation zu einem PRIVATE-Projekt
- Sortition via `panelot` (MIT, Python)
- PDF-Briefe via WeasyPrint + Celery-Batching
- Admin-UI für Stadtverwaltung
- Automatische DSGVO-Löschung (Celery-Beat-Task) nach konfigurierbarer Retention
- Tests + DSGVO-Audit

**Aufwand laut Report 04 (Variante B)**: ~31 Personentage (4–6 Wochen). **Vorteil**: wiederverwendbar, anderen Kommunen anbietbar, Upstream-Contribution an Liquid Democracy e.V. denkbar.

## Klare Empfehlung

Für eine **Stadt, die jetzt loslegen will**: **Pfad 1** anfragen, parallel Pfad 2 als Plan B evaluieren (damit die Stadt nicht vendor-locked ist). Pfad 3 erst, wenn klar ist, dass die Stadt oder eine Gruppe von Kommunen das Werkzeug über mehrere Bürgerräte hinweg einsetzen wird.

**Vor irgendwelcher Technik**: Rechtsamt + Einwohnermeldeamt + LfDI einbeziehen. Das ist kein technisches, sondern ein Governance-Problem. Die 23-Punkte-Checkliste in Report 03 Teil E ist der erste Kilometer.

## Offene Punkte (explizit nicht geklärt)

- **Kostenmodell Es geht LOS**: nicht öffentlich, muss erfragt werden
- **Open-Source-Status der Es-geht-LOS-App**: als "Open Source" beschrieben, aber kein Repo auffindbar — direkt nachfragen
- **Landesrechtliche Spezialnormen** außerhalb BaWü (BMG-Anwendung) — mit LfDI abklären
- **Steuerliche Einordnung der Aufwandsentschädigung** — mit Finanzamt/Stadtkämmerei klären
- **Österreich — ZMR-Gruppenauskunfts-Äquivalent zu § 46 BMG** — nicht abschließend geklärt

## Nächste 3 konkrete Schritte

1. **Kontaktaufnahme** mit Demokratie Innovation e.V. (`app@esgehtlos.org`) und Liquid Democracy e.V. (`info@liqd.net`) — Angebot + Preise + Referenzen einholen.
2. **Interne Klärung** Rechtsamt ↔ Einwohnermeldeamt ↔ Datenschutzbeauftragte*r der Stadt: Ist § 46 BMG für den geplanten Zweck belastbar? Landesspezifische Hürden?
3. **Aus Report 04 die ersten drei Issues** im lokalen Issue-System anlegen (`/issue:new`) — Fokus: Rechtsgutachten, Entscheidung Pfad 1/2/3, Ausschreibungs-/Beschaffungsprozess.

## Index der Einzel-Reports

- [01-codebase-analysis.md](01-codebase-analysis.md) — Was adhocracy+ konkret liefert (818 Zeilen)
- [02-es-geht-los-analysis.md](02-es-geht-los-analysis.md) — Hypothesen-Widerlegung + Alternativen (230 Zeilen)
- [03-legal-framework-and-best-practices.md](03-legal-framework-and-best-practices.md) — § 46 BMG, DSGVO, OECD-Methodik, Checkliste (529 Zeilen)
- [04-gap-analysis-and-implementation.md](04-gap-analysis-and-implementation.md) — Gaps, zwei Umsetzungsvarianten, erste Issues (1033 Zeilen)
