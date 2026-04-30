// Bilingual strings — DE primary, EN secondary.
const STRINGS = {
  de: {
    brand_tag: "Sortition · Werkzeug",
    nav_overview: "Übersicht",
    nav_workflow: "Verfahrensschritte",
    nav_stage1: "Versand-Liste ziehen",
    nav_stage1_sub: "Stratifizierte Stichprobe aus dem Melderegister",
    nav_stage3: "Auswahl-Pool ziehen",
    nav_stage3_sub: "Maximin-Auswahl aus den Antwortenden",
    nav_resources: "Ressourcen",
    nav_docs: "Dokumentation",
    nav_samples: "Beispiel-Daten",
    nav_settings: "Einstellungen",

    privacy: "Daten bleiben lokal",
    privacy_sub: "Kein Server, kein Tracking",
    version: "v0.4 · Iteration 2",

    crumb_stage1: "Stage 1 · Versand-Liste",
    s1_title: "Stratifizierte Versand-Liste ziehen",
    s1_lede:
      "Aus einer Melderegister-Eingabe wird eine proportional stratifizierte Zufallsstichprobe gezogen, die anschließend angeschrieben werden kann. Alle Daten bleiben im Browser — kein Upload, kein Server.",

    step1: "Eingabe",
    step1_sub: "Melderegister hochladen",
    step2: "Achsen",
    step2_sub: "Stratifikation wählen",
    step3: "Parameter",
    step3_sub: "Stichprobengröße & Seed",
    step4: "Ziehen",
    step4_sub: "Largest-Remainder + Mulberry32",
    step5: "Export",
    step5_sub: "CSV + signiertes Audit",

    upload_title: "Melderegister-CSV hochladen",
    upload_help: "UTF-8, Win-1252 oder ISO-8859-1 — Encoding wird automatisch erkannt.",
    upload_drop: "CSV hier ablegen oder Datei wählen",
    upload_alt: "oder Beispiel-Datensatz verwenden",
    upload_formats: "CSV · ≤ 100 MB · Verarbeitet im Browser",

    sample_pick: "Beispiel-Datensatz wählen",
    sample_close: "schließen",

    parsed: "Eingelesen",
    rows: "Zeilen",
    cols: "Spalten",
    encoding: "Encoding",
    sha: "SHA-256",

    axes_title: "Stratifikations-Achsen",
    axes_help:
      "Aus diesen Spalten werden die Strata gebildet. Vorgeschlagen werden Spalten, die im Melderegister tatsächlich verfügbar sind (§ 46 BMG).",
    axes_available: "Verfügbar im Melderegister",
    axes_unavailable: "Nicht im Melderegister (erst nach Selbstauskunft)",
    axes_strata: "Strata",
    axes_smallest: "Kleinstes Stratum",

    params_title: "Stichprobengröße & Seed",
    params_n: "Stichprobengröße N",
    params_n_hint: "Anzahl der zu ziehenden Personen",
    params_seed: "Seed (uint32)",
    params_seed_hint: "Default = aktuelle Unix-Sekunde · Mulberry32-PRNG",
    params_seed_random: "Neu",
    params_method: "Methode",
    params_method_v: "Largest-Remainder (Hamilton)",

    draw: "Stichprobe ziehen",
    drawing: "Ziehe…",
    redraw: "Neu ziehen",

    result_title: "Ergebnis",
    result_eyebrow: "Stichprobe gezogen",
    result_help:
      "Die Verteilung ist exakt — Summe aller n_h gleich N. Innerhalb jedes Stratums wurde mit Fisher-Yates-Shuffle gezogen.",
    result_total: "Gezogen",
    result_strata: "Strata erfüllt",
    result_time: "Dauer",
    result_seed: "Seed",

    table_stratum: "Stratum",
    table_pop: "Bevölkerung",
    table_share: "Anteil",
    table_target: "Soll n_h",
    table_drawn: "Gezogen",
    table_dist: "Verteilung",

    audit_title: "Audit-Snapshot",
    audit_help:
      "Reproduzierbarer Beleg über Eingabe-Hash, Seed, Stratum-Tabelle, Algorithmus-Version und Zeitstempel.",
    audit_signed: "Ed25519 signiert",
    download_csv: "CSV herunterladen",
    download_audit: "Audit-JSON",
    copy_seed: "Seed kopieren",

    bmg_note:
      "Stratifikation kann nur über Felder erfolgen, die im Melderegister enthalten sind. Bildung, Migrationshintergrund und Beruf kommen erst nach Selbstauskunft hinzu.",
  },
  en: {
    brand_tag: "Sortition · Toolkit",
    nav_overview: "Overview",
    nav_workflow: "Workflow",
    nav_stage1: "Draw mailing list",
    nav_stage1_sub: "Stratified sample from population register",
    nav_stage3: "Draw final panel",
    nav_stage3_sub: "Maximin selection from respondents",
    nav_resources: "Resources",
    nav_docs: "Documentation",
    nav_samples: "Sample data",
    nav_settings: "Settings",

    privacy: "Data stays local",
    privacy_sub: "No server, no tracking",
    version: "v0.4 · Iteration 2",

    crumb_stage1: "Stage 1 · Mailing list",
    s1_title: "Draw stratified mailing list",
    s1_lede:
      "Draws a proportional stratified random sample from a population-register CSV — the people you write to. Everything stays in the browser. No upload, no server.",

    step1: "Input",
    step1_sub: "Upload register",
    step2: "Axes",
    step2_sub: "Choose stratification",
    step3: "Parameters",
    step3_sub: "Sample size & seed",
    step4: "Draw",
    step4_sub: "Largest-remainder + Mulberry32",
    step5: "Export",
    step5_sub: "CSV + signed audit",

    upload_title: "Upload population-register CSV",
    upload_help: "UTF-8, Win-1252 or ISO-8859-1 — encoding is auto-detected.",
    upload_drop: "Drop CSV here or click to choose",
    upload_alt: "or use a sample dataset",
    upload_formats: "CSV · ≤ 100 MB · processed in-browser",

    sample_pick: "Choose sample dataset",
    sample_close: "close",

    parsed: "Parsed",
    rows: "rows",
    cols: "columns",
    encoding: "encoding",
    sha: "SHA-256",

    axes_title: "Stratification axes",
    axes_help:
      "Strata are formed from these columns. Suggestions are limited to columns actually present in a German/Austrian population register (§ 46 BMG).",
    axes_available: "Available in register",
    axes_unavailable: "Not in register (only after self-disclosure)",
    axes_strata: "Strata",
    axes_smallest: "Smallest stratum",

    params_title: "Sample size & seed",
    params_n: "Sample size N",
    params_n_hint: "Number of people to draw",
    params_seed: "Seed (uint32)",
    params_seed_hint: "Default = current Unix second · Mulberry32 PRNG",
    params_seed_random: "New",
    params_method: "Method",
    params_method_v: "Largest-remainder (Hamilton)",

    draw: "Draw sample",
    drawing: "Drawing…",
    redraw: "Re-draw",

    result_title: "Result",
    result_eyebrow: "Sample drawn",
    result_help:
      "The distribution is exact — sum of all n_h equals N. Within each stratum a Fisher–Yates shuffle was used.",
    result_total: "Drawn",
    result_strata: "Strata met",
    result_time: "Duration",
    result_seed: "Seed",

    table_stratum: "Stratum",
    table_pop: "Population",
    table_share: "Share",
    table_target: "Target n_h",
    table_drawn: "Drawn",
    table_dist: "Distribution",

    audit_title: "Audit snapshot",
    audit_help:
      "Reproducible record: input hash, seed, stratum table, algorithm version, timestamp.",
    audit_signed: "Ed25519 signed",
    download_csv: "Download CSV",
    download_audit: "Audit JSON",
    copy_seed: "Copy seed",

    bmg_note:
      "Stratification is only possible on columns the register actually contains. Education, migration background and profession only become available through self-disclosure.",
  },
};

function useT(lang) {
  return React.useMemo(() => {
    const dict = STRINGS[lang] || STRINGS.de;
    return (key) => dict[key] ?? key;
  }, [lang]);
}

window.STRINGS = STRINGS;
window.useT = useT;
