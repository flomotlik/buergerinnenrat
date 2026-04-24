---
id: 11
slug: csv-json-export-with-audit
title: CSV-Export + signierter JSON-Audit
track: 3
estimate_pt: 2
deps: [10]
status: todo
blocks: [18, 21, 22, 23, 24]
---

# CSV-Export + signierter JSON-Audit

## Kontext

Ein Bürgerrat-Los muss nachvollziehbar sein. Das bedeutet: wer gewählt wurde (CSV für die Einladung) und wie (JSON-Audit mit Input-Hash, Seed, Engine-Version, Timing, Marginalen) — plus eine kryptografische Signatur, die nachträgliche Manipulation erkennbar macht.

Ed25519 via Web Crypto ist Browser-nativ, keine externen Libs nötig.

## Ziel

Zwei Exports aus der Ergebnis-View:
1. **Selected CSV**: eine Zeile pro ausgewählte Person mit ausgewählten Attributen
2. **Audit JSON**: vollständige Lauf-Metadaten, Signatur separat im Datei-Anhang oder detached

## Akzeptanzkriterien

- [ ] "Export Panel (CSV)"-Button exportiert die ausgewählten Personen mit allen verfügbaren Attributen
- [ ] "Export Audit (JSON)"-Button exportiert:
  - `schema_version`, `engine` (Name+Version), `algorithm`, `seed`
  - `input_sha256` (SHA-256 des Pool-CSV-Bytes + Quoten-JSON-kanonisiert)
  - `panel_size`, `pool_size`
  - `selected` (IDs), `marginals` (alle Personen)
  - `quota_fulfillment` (pro Kategorie)
  - `timing` (start, end, duration_ms, iterations)
  - `signature` (Base64 Ed25519) und `public_key` (Base64)
- [ ] Signatur wird mit im Browser generiertem Ed25519-Keypair erstellt (nicht persistiert — einmaliges Keypair pro Lauf ist ausreichend; Audit enthält Public Key)
- [ ] Verification-Skript `scripts/verify_audit.py` bestätigt Signatur + Input-Hash
- [ ] Reproduzierbarkeit: Re-Import desselben CSV + Quoten + Seed produziert denselben `input_sha256`
- [ ] JSON-Schema für das Audit publiziert unter `docs/audit-schema.json`
- [ ] Playwright-E2E: Export-Flow aus der Ergebnis-View

## Out of Scope

- Keine persistenten Keypairs, kein Key-Management-Flow (Iteration 2)
- Kein User-signiertes Audit (nur app-intern signiert)
- Kein Kommunen-Schlüssel / kein Trust-Setup

## Verweise

- `sortition-tool/00-masterplan.md` "Audit-Signatur Ed25519 via Web Crypto"
- Web Crypto API: `window.crypto.subtle` + Ed25519 (Chrome 113+, Firefox 130+)
