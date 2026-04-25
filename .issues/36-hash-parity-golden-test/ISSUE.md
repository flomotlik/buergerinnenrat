---
id: 36
slug: hash-parity-golden-test
title: TS/Python input_sha256 Golden-Parity-Test
track: 5
estimate_pt: 0.5
deps: [archived/11]
status: todo
blocks: [27]
source: review-2026-04-25 (Codex #33 — generelle Audit-Hash-Forderung; Codex' konkrete Separator-Behauptung war falsch)
---

# Hash-Parity Golden-Test

## Kontext

`apps/web/src/run/audit.ts:67-71` und `scripts/verify_audit.py:113-115` implementieren `input_sha256(pool, quotas)` doppelt — einmal in TS, einmal in Python. Der Reviewer Codex hat behauptet, sie würden mit unterschiedlichen Separatoren joinen; das stimmt nicht (beide nutzen leeren Concat). Aber: **es gibt keinen Test, der die beiden Implementierungen byte-für-byte vergleicht**. Edge-Cases in JSON-Serialisierung (Unicode-Escapes, Float-Formatierung, Key-Sortierung mit Sonderzeichen) könnten zu echtem Drift führen, was die Audit-Verifikation silent kaputt machen würde.

Die Iteration-1-Tests (`tests/python/test_metrics_cross_lang.py`) prüfen nur Quality-Metriken-Parität, nicht den Audit-Hash.

## Ziel

Golden-Test, der für ein Set repräsentativer Pool/Quoten-Inputs den TS- und Python-Hash byte-für-byte vergleicht. Teil von `make test`.

## Akzeptanzkriterien

- [ ] `tests/python/test_audit_hash_parity.py` mit ≥ 5 Fixtures:
  - Klein synthetisch (Toy-Pool n=10)
  - Mittel synthetisch (kleinstadt-100)
  - Unicode in `person_id` (Beispiel: `"мария-01"`, `"hänsel-02"`, `"عمر-03"`)
  - Werte mit Komma/Anführungszeichen in Attributen
  - Leerer Migrationshintergrund-String
- [ ] Pro Fixture: TS-Implementierung via Node-Skript ausführen → Hash A; Python-Implementierung ausführen → Hash B
- [ ] `assert A == B` mit Diff-Diagnose bei Fehlschlag (zeigt, ob Pool-Canonicalization oder Quotas-Canonicalization divergiert)
- [ ] Bei Drift: Test schlägt fehl + zeigt die kanonischen Strings beider Seiten zum direkten Vergleich
- [ ] CI-Gate: in `make test` enthalten
- [ ] `docs/audit-schema.json` JSON-Schema-Datei dokumentiert die Canonicalization-Regeln (Reihenfolge, Sortierung, JSON-Format) als verbindliche Spec

## Out of Scope

- Importierbare/persistente Schlüssel (kommunal-vergebene Keys etc.) — nicht-technisch / Iteration 3
- Hardware-Token, PKI, Schlüssel-Rotation
- Ed25519 vs ECDSA-Auswahl-Erweiterung — Iteration 1 Fallback reicht

## Verweise

- TS-Implementation: `apps/web/src/run/audit.ts:67-71`
- Python-Implementation: `scripts/verify_audit.py:113-115`
- Existierender Cross-Lang-Test (Pattern): `tests/python/test_metrics_cross_lang.py`
