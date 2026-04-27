---
id: 61
slug: seed-no-gating
title: Seed-Workflow vereinfachen — kein Gating, nur Hinweis-Nachricht
track: Z
estimate_pt: 0.25
status: researched
depends_on: [53, 56]
priority: high
priority_rationale: "User-Feedback aus Live-Site: Run-Button war nicht klickbar, Verwirrung wegen unsichtbarer Confirm-Button-Voraussetzung"
---

# Seed-Workflow vereinfachen

## Kontext

Aus #53 (UX-Review-Followup) kam der Seed-Confirmation-Gate als Variante 1: Default-Seed vorbefüllt, Run-Button bleibt disabled bis User explizit "Default-Seed übernehmen" klickt oder Seed editiert. Das sollte gegen "Seed-Grinding" schützen.

**Realer Live-Test zeigte:** UX ist verwirrend. Der primäre grüne Run-Button sieht klickbar aus, ist aber disabled. Der notwendige "Default-Seed übernehmen"-Button ist optisch zu unauffällig. User klickt auf den Run-Button, sieht keinen Grund warum er nicht reagiert.

User-Statement: "Auswahl wird gemeinsam in der Gruppe gemacht" — Seed-Grinding-Risiko ist sozial mitigiert. User-Wunsch: "kein Gating, nur eine Nachricht — der Default ist sichtbar, man kann ihn bearbeiten, sonst läuft er".

## Ziel

Seed-Default ist sofort akzeptiert, Run-Button ist immer klickbar (sofern Pool + N gesetzt). Statt Confirm-Button gibt es einen klaren **Hinweis-Text** — ohne Pflicht-Aktion.

## Acceptance Criteria

- [ ] `seedConfirmed`-Signal entfernen aus `apps/web/src/stage1/Stage1Panel.tsx`
- [ ] `canRun()` ohne `seedConfirmed()`-Check (nur noch `parsed() && targetN() > 0 && !running()`)
- [ ] "Default-Seed übernehmen"-Button entfernen
- [ ] `confirmDefaultSeed()`-Funktion entfernen
- [ ] Seed-Source-Label umformulieren: vorher "(Default — bitte gemeinsam vereinbaren)", nachher "(Default 4711 — nach Bedarf editieren)"
- [ ] Bestehender Hinweis-Aside (amber Box) leicht umformulieren: weg vom "Bestätigen Sie den Seed", hin zu "Sie können den Default übernehmen oder einen gemeinsam vereinbarten Wert eintippen — der gewählte Wert steht im signierten Audit-Protokoll"
- [ ] Playwright-Test in `apps/web/tests/e2e/stage1.spec.ts`: `stage1-seed-confirm`-Klick entfernen, weil Button weg ist
- [ ] Playwright-Test in `apps/web/tests/e2e/beispiele-stage1.spec.ts` (#57): gleiche Anpassung
- [ ] Playwright-Test "Run-Button bleibt disabled bis Seed bestätigt oder editiert wurde (C)" entfernen oder umbauen zu "Run-Button ist sofort klickbar nach N-Eingabe"
- [ ] Bestehende Tests bleiben grün
- [ ] Verify lokal: Upload Beispiel-CSV, N=300, Klick Run → läuft direkt durch ohne Confirm-Schritt

## Out of Scope

- Public-Randomness-Beacon-Integration (NIST/drand) — eigener Issue wenn jemand das später will
- CSPRNG-Upgrade von Mulberry32 — eigener Issue
- Doku-Page-Updates wenn die Seed-Story sich ändert — der Audit-Footer dokumentiert weiterhin den verwendeten Seed transparent

## Verweise

- Vorgänger: #53 Variante 1 (CONTEXT.md)
- User-Live-Feedback: 2026-04-27 ("Versand-Liste-Button funktioniert nicht")
- Heutiger Code: `apps/web/src/stage1/Stage1Panel.tsx:60-67, 74-78, 145-167, 169-175, 190-204, 297-312`
