---
id: 31
slug: dsfa-template-and-dataflow
title: DSFA-Template + Datenflussdiagramm + Verarbeitungsverzeichnis-Bausteine
track: 7
estimate_pt: 3
deps: [archived/24]
status: todo
blocks: [37]
source: review-2026-04-25 (Claude #31, Codex #29, Gemini #26-03 — alle drei einig)
---

# DSFA-Template für Pilot-Kommunen

## Kontext

P1-1 aus `sortition-tool/06-review-consolidation.md` ist offen (`docs/iteration-1-findings.md:47-48`). Eine deutsche Kommune darf die App nicht für Melderegister-Verarbeitung einsetzen ohne DSFA nach DSGVO Art. 35. Die Architektur "kein Backend, alles in-memory" eliminiert die Pflicht NICHT, aber vereinfacht das DSFA stark.

Wir liefern ein **Template** plus die für die App-Architektur typischen Bausteine. Die einzelne Pilot-Kommune muss das in ihrem konkreten Verfahren konkretisieren — aber nicht von Null aufsetzen. Ohne dieses Template ist jede Pilot-Anbahnung Friktion-blockiert.

## Ziel

Ein DSFA-Paket unter `docs/dsfa/`, das die Kommune mit ihren Daten ausfüllt + ein einseitiger Datenfluss-Nachweis, der die "kein Backend"-Eigenschaft technisch belegt.

## Akzeptanzkriterien

- [ ] `docs/dsfa/template.md`: ausfüllbares Template mit klar markierten Kommune-spezifischen Slots (Verantwortlicher, Zweck, Rechtsgrundlage gemäß §46 BMG, Risiken, TOMs, Betroffenenrechte)
- [ ] `docs/dsfa/datenfluss.md`: Diagramm (Mermaid) — Browser-Tab → kein Backend, kein Telemetrie, kein Cookie. Belegt mit:
  - CSP aus `docs/deploy.md`
  - Network-Audit-Spec (Playwright-Test, der assertet: keine externen `fetch()`-Requests während eines End-to-End-Laufs)
  - Verweis auf `apps/web/src/`-Code-Stellen, die diese Eigenschaft erzeugen
- [ ] `docs/dsfa/verarbeitungsverzeichnis-baustein.md`: VVT-Eintrag-Vorlage nach DSGVO Art. 30
- [ ] `docs/dsfa/risiko-bewertung.md`: vorausgefüllt mit den 5 Standard-Risikofeldern (Identifizierbarkeit, Re-Identifizierung, Aggregation, Ungerechtfertigte Auswahl, Manipulationsversuch) — mit Default-Mitigationen aus der App-Architektur
- [ ] `docs/dsfa/tom-liste.md`: Technisch-Organisatorische Maßnahmen-Liste, gemappt auf konkrete App-Eigenschaften (statisches Hosting, Audit-Signatur, in-Memory-Verarbeitung, Reproducibility-Hash)
- [ ] `docs/dsfa/checklist-fuer-kommunen.md`: 1-seitige Anwendungs-Checkliste (Datei runterladen, ausfüllen, intern abstimmen)
- [ ] Retention-Hinweise: was darf der Bediener mit CSV, Audit-JSON, Browser-Cache nach dem Lauf machen — explizit dokumentiert
- [ ] `apps/web/tests/e2e/network-audit.spec.ts`: Playwright-Test, der während eines End-to-End-Laufs `page.on('request')` mitschneidet und assertet: nur Same-Origin-Requests zu statischem Asset
- [ ] Externe Validierung: muss von einer DE-DSGVO-erfahrenen Person reviewed werden — im Issue dokumentiert, wer und wann (kommt mit Issue #38 Rechtsgutachten)

## Out of Scope

- Implementierung App-seitiger Audit-Trails über das vorhandene Audit-JSON hinaus (das ist #36)
- Vollständige BITV-2.0-Konformität (das ist #32)
- Konkrete Pilot-Kommunen-DSFA — wir liefern Vorlage, nicht das spezifische Dokument

## Verweise

- P1-1 in: `sortition-tool/06-review-consolidation.md`
- Findings-Status: `docs/iteration-1-findings.md:47-48`
- App-Architektur: `apps/web/src/` (kein `fetch()` an externe Origins)
- CSP: `docs/deploy.md`
