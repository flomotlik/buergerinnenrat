---
id: 36
slug: audit-key-management-and-hash-parity
title: Audit-Key-Management + TS/Python Hash-Parity Golden-Test
track: 7
estimate_pt: 1.5
deps: [archived/11]
status: todo
blocks: [37]
source: review-2026-04-25 (Codex #33, Gemini #26-06)
---

# Audit-Key-Management + Hash-Parity

## Kontext

Issue #11 (`.issues/archived/11-csv-json-export-with-audit/ISSUE.md:37-47`) hat frische Ephemeral-Keypairs pro Lauf bewusst als ausreichend für Iteration 1 deklariert. Für Audit-Compliance (P2-4) und rechtliche Nicht-Abstreitbarkeit braucht eine Pilot-Kommune einen **kommunal-vergebenen Schlüssel** — sonst ist der Public Key im Audit-JSON nicht an die Kommune zurückführbar.

Zusätzlich: Codex hat angemerkt, dass es **keinen Golden-Test gibt, der TS- und Python-`input_sha256`-Implementierungen byte-für-byte vergleicht**. Beim aktuellen Stand kennen wir nicht garantiert, ob die beiden Implementierungen im Edge-Case (Unicode, Float-Formatierung, JSON-Escaping) zu unterschiedlichen Hashes kommen. Die separate konkrete Codex-Behauptung "Separator-Mismatch" prüfte sich als falsch heraus, aber die generelle Lücke "kein Parity-Test" stimmt.

## Ziel

(a) Importierbare Schlüssel für die Audit-Signatur, mit langlebigem Browser-Speicher als Default, Public-Key-Export für die Kommune. (b) Golden-Test, der für 5+ Pool-/Quoten-Kombinationen den `input_sha256` aus TS und Python vergleicht.

## Akzeptanzkriterien

### Key-Management

- [ ] UI in `apps/web/src/run/RunPanel.tsx` oder Settings-Bereich: drei Modi
  - **Ephemeral** (Default Iteration 1): wie heute, frischer Key pro Lauf
  - **Persistent** (langlebig im IndexedDB): einmal Schlüssel generieren, bleibt im Browser-Storage; Public Key exportierbar als PEM
  - **Imported** (Kommune liefert Private Key): Import von PEM/JWK, signiert ab dann mit dem
- [ ] Audit-JSON erweitert um:
  - `key_id`: SHA-256-Fingerprint des Public Keys (für Re-Identifikation)
  - `key_provenance`: `"ephemeral" | "persistent_browser" | "imported"`
- [ ] Public-Key-Export als separater Button: PEM-Datei oder JWK
- [ ] `scripts/verify_audit.py` adaptiert: kann `key_id` gegen ein Public-Key-File matchen
- [ ] Doc `docs/audit-trust-pfade.md`: erklärt für Kommune die drei Modi, welcher wann angemessen ist
- [ ] Audit-Schema (`docs/audit-schema.json`) entsprechend erweitert (mit `signature_algo` schon vorhanden, jetzt `key_id` + `key_provenance`)

### Hash-Parity

- [ ] `tests/python/test_audit_hash_parity.py`: Golden-Test
  - Für 5 Pool/Quoten-Fixtures (klein/mittel/Unicode-im-person_id/leere-Strings/größer-2000-Zeichen-Werte):
    - TS-`inputSha256()` via Node-Skript ausführen → Hash A
    - Python-`_input_sha256()` ausführen → Hash B
    - Assert A == B
- [ ] Bei Diff: Test schlägt mit Diff-Diagnose fehl (welcher Teil — Pool-Canonicalization oder Quotas-Canonicalization?)
- [ ] CI-Gate: `make test` schließt diesen Test ein
- [ ] Doku in `docs/audit-schema.json` erwähnt explizit, dass die Reihenfolge (`canonicalPool() + canonicalQuotas()`) Teil der Spec ist

## Out of Scope

- Hardware-Token / Smart-Card-Signatur (Iteration 3+)
- Schlüssel-Rotation / -Revokation (PKI-Workstream)
- Mehrparteien-Signatur (Threshold-Crypto)
- Time-Stamping-Service (Iteration 3)

## Verweise

- Issue #11 Scope: `.issues/archived/11-csv-json-export-with-audit/ISSUE.md`
- Aktuelle Hash-Implementation TS: `apps/web/src/run/audit.ts:68-71`
- Aktuelle Hash-Implementation Python: `scripts/verify_audit.py:113-115`
- Audit-Schema: `docs/audit-schema.json`
- P2-4: `sortition-tool/06-review-consolidation.md`
