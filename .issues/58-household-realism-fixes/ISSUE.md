---
id: 58
slug: household-realism-fixes
title: Haushalts-Realismus — Alleinerziehende, Drei-Generation, Kinder-Citizenship
track: Z
estimate_pt: 0.5
status: researched
depends_on: [57]
priority: high
priority_rationale: "User-Verifikation der Live-Daten zeigte 3 untermodellierte Haushaltstypen — Realismus-Lücke gegenüber Statistik Austria"
---

# Haushalts-Realismus-Fixes

## Kontext

Verifikation der Live-Daten (`https://flomotlik.github.io/buergerinnenrat/beispiele/herzogenburg-melderegister-8000.csv`) gegen Statistik-Austria-Werte hat 3 echte Bugs aufgedeckt:

1. **Alleinerziehende: 1.9 % real vs ~18 % erwartet** (`scripts/synthetic-meldedaten/household-builder.ts:228`): Code modelliert Ein-Eltern nur bei Haushaltsgröße 3 mit 15 % Wahrscheinlichkeit. Bei Größe 4+ immer 2 Eltern.
2. **Drei-Generation: 0 %** trotz `threeGenerationShare` im Profil. Builder produziert keine 3-Gen-Haushalte.
3. **Kinder-Citizenship inkonsistent**: Kind in Türkei-Cluster-Familie würfelt Staatsbürgerschaft eigenständig statt vom Haushalt zu erben — Beispiel im Live-CSV: Necati Aksoy (45, AT) + Şule (7j, **TR** statt AT).

User-Statement (CONTEXT für Scope): "Die Daten sind natuerlich fuer die auswahl nicht so wichtig, aber dass nicht einfach nur ein Wohnsitz ist eine person erstellt wird" — Realismus zählt für Vertrauen + UX, nicht für die Auswahl-Algorithmik.

## Ziel

Drei Bugs fixen, CSVs neu generieren (deterministisch, gleicher Seed → andere Outputs durch Logik-Änderung, das ist OK), Tests anpassen.

## Acceptance Criteria

- [ ] **Bug 1 — Alleinerziehende auf realistischen Anteil:** `buildFamilie` in `scripts/synthetic-meldedaten/household-builder.ts` ziehe Ein-Eltern-Wahrscheinlichkeit von ~18 % für ALLE Familien-Größen (3, 4, 5, 6), nicht nur Größe 3
- [ ] Statistische Plausibilität: Alleinerziehende-Anteil im Output 8000-CSV liegt bei 15-20 % aller Familien-Haushalte (3+ Personen mit Kindern)
- [ ] **Bug 2 — Drei-Generation funktioniert:** Debug `buildDreigeneration` — Großeltern (60-85) werden tatsächlich erzeugt, nicht zufällig vom Familien-Core verschluckt. Profil hat `threeGenerationShare: 0.01` oder Wert nach Plausibilität
- [ ] Statistische Plausibilität: 3-Gen-Anteil ist >0 % im Output, idealerweise 0.5-1.5 % aller Mehrpersonenhaushalte
- [ ] **Bug 3 — Kinder erben Citizenship:** `person-builder.ts` oder `household-builder.ts` muss bei Kindern (Alter <18) die Staatsbürgerschaft des Haushalts-Vaters ableiten, NICHT eigenständig würfeln. Realität: Kinder erben Staatsbürgerschaft per Abstammungsprinzip (jus sanguinis Österreich)
- [ ] Test in `apps/web/tests/unit/synthetic-household-builder.test.ts`: alle Kinder eines Haushalts haben gleiche Staatsbürgerschaft wie der Haushalts-Vater (oder eines der Erwachsenen in Mischehe)
- [ ] **CSV neu generieren:** Re-run `tsx scripts/synthetic-meldedaten/generator.ts --profile herzogenburg --output apps/web/public/beispiele/herzogenburg-melderegister-8000.csv --seed 4711` und auch die anderen 3 Beispiel-CSVs neu erzeugen. SHA wird sich ändern (das ist erwartet).
- [ ] **Plausibilitäts-Check** dokumentiert in commit-msg: alte SHA → neue SHA, % Alleinerziehende, % 3-Gen, Citizenship-Konsistenz
- [ ] Bestehende Tests bleiben grün (eventuell statistische Tests mit erweiterten Toleranzen)

## Out of Scope

- Familienstand-Spalte (verheiratet/unverheiratet/etc.) — eigener Issue wenn gewünscht
- Gleichgeschlechtliche Paare — eigener Issue
- Patchwork-Familien — eigener Issue

## Verweise

- Live-Verifikation-Output (welche Bugs gefunden): commit-msg von #57 + User-Konversation 2026-04-27
- Bug 1 location: `scripts/synthetic-meldedaten/household-builder.ts:228`
- Bug 2 location: `scripts/synthetic-meldedaten/household-builder.ts:295-321`
- Bug 3 location: `scripts/synthetic-meldedaten/person-builder.ts` (wo `staatsbuergerschaft` gewürfelt wird) + `household-builder.ts` Aufruf für Kinder
- Profile: `scripts/synthetic-meldedaten/profiles/herzogenburg.json` + `kleinstadt-3000.json`
