---
id: 17
slug: leximin-cached-from-paper
title: Leximin-Ergebnisse aus Paper-Supplement cachen (wenn verfügbar)
track: 5
estimate_pt: 0.5
deps: [04]
status: todo
blocks: [20]
---

# Leximin-Ergebnisse aus Paper-Supplement cachen

## Kontext

`pgoelz/citizensassemblies-replication` und die Nature-Supplementary enthalten möglicherweise fertige Leximin-Marginale für `sf_a..sf_e`. Wenn ja: die sind unsere **Gold-Standard-Referenz für grosse Pools**, wo Gurobi-Free nicht mehr ausreicht (#16). Pfad (iii) aus der Entscheidung.

## Ziel

Erstens feststellen, ob solche Ergebnisse publiziert sind. Zweitens, wenn ja, sie als Fixtures im Engine-Contract-Format cachen.

## Akzeptanzkriterien

- [ ] Recherche-Dokument `docs/leximin-cached.md`: welche Artefakte das Paper-Repo + Supplementary publizieren (Marginale, Panels, Metriken?)
- [ ] Wenn Leximin-Marginale publiziert: `tests/fixtures/paper-leximin-results/{sf_*}.json` im Engine-Contract-Format, mit Herkunfts-Angabe
- [ ] Wenn nicht publiziert: Entscheidung dokumentiert ("Paper publiziert keine per-person-Marginale; Frage 3 muss sich auf Gurobi-Free-Grössen beschränken")
- [ ] Unit-Test: die gecachten Fixtures parsen sauber ins Engine-Contract-Schema

## Out of Scope

- Kein eigener Leximin-Lauf (das wäre #16 oder ein Port-Issue)
- Keine Paper-Review-Arbeit — nur Artefakt-Inventur

## Verweise

- `sortition-tool/06-review-consolidation.md` Teil E (Paper-Pools als Referenz)
- Flanigan et al. 2021 Supplementary
