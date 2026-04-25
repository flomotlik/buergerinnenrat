---
id: 46
slug: verfahren-state-file-persistence
title: Verfahren-State als Datei (Download/Upload, kein Backend)
track: Z
estimate_pt: 1.5
status: open
depends_on: []
priority: critical
priority_rationale: "Voraussetzung für Multi-Step-Verfahren (Stage 1 → Stage 3 → Nachholung) ohne Backend"
---

# Verfahren-State-Datei

## Kontext

Ein Bürger:innenrats-Verfahren erstreckt sich über 4–8 Wochen (Versand, Antworten sammeln, Panel-Auswahl, mögliche Nachholung). Ohne Backend muss der Zustand zwischen Sitzungen transportiert werden. Lösung: **eine signierte JSON-Datei**, die der Nutzer auf seiner Platte speichert und bei der nächsten Sitzung wieder hochlädt. Datei = Source of Truth + Audit-Beleg.

Vollständige Begründung: `sortition-tool/08-product-redesign.md` Abschnitt "Wo der State liegt".

## Ziel

Schema und UI für `verfahren-{name}.json`. Nach jeder Operation (Stage 1 ziehen, Stage 3 ziehen, Nachholung) lädt der Nutzer die aktualisierte Datei herunter; vor jeder Folge-Operation lädt er sie hoch. Optional: IndexedDB-Cache als Convenience für "Browser versehentlich geschlossen".

## Acceptance Criteria

- [ ] JSON-Schema in `packages/core/src/verfahren/schema.ts` definiert: Verfahren-Metadaten (Name, ID, erstellt-am, Schema-Version), Operation-Historie als Array, jede Operation mit Typ + Input-Hash + Output + Seed + Zeitstempel + Signatur + Vorgänger-Hash
- [ ] TypeScript-Typen + Zod-Schema für Laufzeit-Validierung beim Upload
- [ ] Hash-Verkettung: jede Operation enthält `previous_op_hash`; bei Upload prüft das Tool die Kette + warnt bei Bruch (UI-Banner, kein Hard-Fail)
- [ ] UI: "Verfahren herunterladen" und "Verfahren laden" Buttons in der Hauptnavigation, immer sichtbar
- [ ] Nach Stage 1 / Stage 3 / Nachholung wird die Datei automatisch zum Download angeboten (Browser-Download-Dialog)
- [ ] Beim Upload wird der Stand rekonstruiert: alle bisherigen Operationen werden visualisiert (Timeline-Komponente), Nutzer sieht "Stage 1: 300 von 6000 gezogen am ...", "Stage 3 ausstehend"
- [ ] Optional IndexedDB-Cache: nach jedem Download wird die Datei auch in IndexedDB gespeichert; beim Tab-Open wird angeboten "letzten Stand wiederherstellen?". Cache ist Convenience, nicht autoritativ.
- [ ] Datei-Versionierung: `schema_version: 1` jetzt; Upload mit höherer Version → klare Fehlermeldung "Tool-Update nötig"
- [ ] Unit-Tests: Schema-Roundtrip, Hash-Kette korrekt, Manipulations-Erkennung bei verändertem Operation-Output
- [ ] Playwright: Stage-1-Lauf → Download → Tab schließen → neuer Tab → Upload → Timeline zeigt vorigen Lauf

## Out of Scope

- Multi-User-Konfliktlösung (es gibt nur eine Datei zur Zeit)
- Verschlüsselung der Datei (Nutzer ist verantwortlich für lokale Sicherheit)
- Cloud-Sync (kein Backend)
- Retro-Migration alter Schema-Versionen (jetzt nur v1; Migration kommt wenn v2 nötig wird)

## Verweise

- Architektur: `sortition-tool/08-product-redesign.md`
- Bestehende Signatur-Logik: `packages/core/src/audit/`
- Bestehender Single-Run-Audit-Snapshot: `docs/audit-schema.json`
