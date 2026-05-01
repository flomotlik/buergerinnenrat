// Docs / samples / settings / overview screens — clean hi-fi mockups.

function Overview({ t, lang, onPick }) {
  return (
    <div>
      <header className="page-head">
        <div className="crumb">{t("nav_overview")}</div>
        <h1 className="page-title">
          {lang === "de"
            ? "Stratifizierte Zufallsauswahl für Bürger:innenräte"
            : "Stratified random selection for citizens' assemblies"}
        </h1>
        <p className="page-lede">
          {lang === "de"
            ? "Ein browser-natives Werkzeug für das zweistufige Sortition-Verfahren. Stage 1 zieht die Versand-Liste aus dem Melderegister; Stage 3 zieht den finalen Pool aus den Antwortenden. Alles lokal, reproduzierbar, signiert."
            : "A browser-native tool for the two-stage sortition workflow. Stage 1 draws a mailing list from the population register; Stage 3 draws the final panel from respondents. All local, reproducible, signed."}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-4)" }}>
        <button className="card" style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--accent-line)", background: "linear-gradient(180deg, var(--bg-card), var(--accent-soft))" }} onClick={() => onPick("stage1")}>
          <div className="card-eyebrow" style={{color:"var(--accent-ink)"}}>Stage 1 · {lang === "de" ? "Verfügbar" : "Available"}</div>
          <h2 className="card-title" style={{marginBottom: 6}}>{t("nav_stage1")}</h2>
          <p style={{color:"var(--ink-2)",margin:"0 0 var(--gap-4)",fontSize:14,lineHeight:1.55}}>
            {lang === "de"
              ? "Largest-Remainder über die Strata, Fisher-Yates-Shuffle innerhalb. Sub-Sekunde bis 100 000 Zeilen."
              : "Largest-remainder across strata, Fisher–Yates within. Sub-second up to 100 000 rows."}
          </p>
          <div className="btn-row" style={{justifyContent:"space-between"}}>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-3)",letterSpacing:".04em"}}>{lang === "de" ? "MELDE-CSV → STICHPROBE" : "REGISTER CSV → SAMPLE"}</span>
            <span className="btn btn-accent" style={{pointerEvents:"none"}}>{lang === "de" ? "Öffnen" : "Open"} →</span>
          </div>
        </button>

        <button className="card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => onPick("stage3")}>
          <div className="card-eyebrow">Stage 3 · {lang === "de" ? "Vorschau" : "Preview"}</div>
          <h2 className="card-title" style={{marginBottom: 6}}>{t("nav_stage3")}</h2>
          <p style={{color:"var(--ink-2)",margin:"0 0 var(--gap-4)",fontSize:14,lineHeight:1.55}}>
            {lang === "de"
              ? "Maximin (Phase 1). Leximin-Variante (Flanigan et al., Nature 2021) ist nicht Phase-1-Scope. Solver-Wahl offen (CLAUDE.md S-2)."
              : "Maximin (Phase 1). The Leximin variant (Flanigan et al., Nature 2021) is out of Phase-1 scope. Solver choice is open (CLAUDE.md S-2)."}
          </p>
          <div className="btn-row" style={{justifyContent:"space-between"}}>
            <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-3)",letterSpacing:".04em"}}>{lang === "de" ? "ANTWORTEN → POOL" : "RESPONSES → PANEL"}</span>
            <span className="btn">{lang === "de" ? "Öffnen" : "Open"} →</span>
          </div>
        </button>
      </div>

      <div className="card" style={{ marginTop: "var(--gap-5)" }}>
        <div className="card-head">
          <div>
            <div className="card-eyebrow">{lang === "de" ? "Architektur-Prinzipien" : "Architecture principles"}</div>
            <h2 className="card-title">{lang === "de" ? "Was dieses Werkzeug ausmacht" : "What this tool stands for"}</h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap-5)" }}>
          {[
            ["Browser-nativ", "Server-frei", lang === "de"
              ? "Keine Daten verlassen den Rechner. Kein Backend, kein Cookie, kein Tracking."
              : "Data never leaves the machine. No backend, no cookie, no tracking."],
            ["Reproduzierbar", "Seed + SHA + Sig", lang === "de"
              ? "Jede Ziehung wird durch Eingabe-Hash, Seed und Algorithmus-Version exakt reproduzierbar — unterschriebener Audit-Snapshot."
              : "Every draw is exactly reproducible from input hash, seed and algorithm version — signed audit snapshot."],
            ["Rechtskonform", "§ 46 BMG · DSGVO", lang === "de"
              ? "Stratifikation nur über Felder, die das Melderegister tatsächlich enthält. Bildung, Migrationshintergrund, Beruf erst nach Selbstauskunft."
              : "Stratify only on fields actually present in the register. Education, migration background, profession only after self-disclosure."],
          ].map(([title, eyebrow, body], i) => (
            <div key={i}>
              <div className="card-eyebrow" style={{margin:0}}>{eyebrow}</div>
              <h3 style={{fontFamily:"var(--serif)",fontSize:18,fontWeight:500,letterSpacing:"-0.01em",margin:"4px 0 8px"}}>{title}</h3>
              <p style={{margin:0,color:"var(--ink-2)",fontSize:13.5,lineHeight:1.6}}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Docs({ t, lang }) {
  const sections = [
    { id: "what", de: "Was ist Sortition?", en: "What is sortition?" },
    { id: "stage1", de: "Stage 1 · Versand-Liste", en: "Stage 1 · Mailing list" },
    { id: "stage3", de: "Stage 3 · Auswahl-Pool", en: "Stage 3 · Final panel" },
    { id: "law", de: "Rechtsrahmen", en: "Legal framework" },
    { id: "audit", de: "Audit & Reproduktion", en: "Audit & reproduction" },
  ];
  return (
    <div>
      <header className="page-head">
        <div className="crumb">{t("nav_docs")}</div>
        <h1 className="page-title">{lang === "de" ? "Dokumentation" : "Documentation"}</h1>
        <p className="page-lede">{lang === "de"
          ? "Die Methodik hinter dem Werkzeug, die Algorithmen, der Rechtsrahmen — und wie sich Ziehungen reproduzieren lassen."
          : "The methodology, the algorithms, the legal context — and how to reproduce a draw."}</p>
      </header>

      <div className="doc-grid">
        <nav className="doc-toc" aria-label="Inhalt">
          {sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={i === 1 ? "is-active" : ""}>
              {lang === "de" ? s.de : s.en}
            </a>
          ))}
        </nav>
        <article className="doc-body">
          <section id="what">
            <h2>{lang === "de" ? "Was ist Sortition?" : "What is sortition?"}</h2>
            <p>{lang === "de"
              ? "Sortition ist die Auswahl politischer Gremien per Los — ergänzt um Stratifikation, damit das Gremium die Bevölkerung in zentralen Merkmalen widerspiegelt. Bürger:innenräte, Klimaräte und Reformversammlungen folgen weltweit diesem Muster."
              : "Sortition is the selection of political bodies by lot — combined with stratification so the body mirrors the population on key features. Citizens' assemblies, climate councils and reform conventions follow this pattern worldwide."}
            </p>
            <div className="callout">{lang === "de"
              ? "„Demokratie durch Los wählt nicht die Tüchtigsten, sondern die Repräsentativsten.\""
              : "\"Democracy by lot doesn't pick the most able — it picks the most representative.\""}</div>
          </section>

          <section id="stage1">
            <h2>{lang === "de" ? "Stage 1 · Versand-Liste" : "Stage 1 · Mailing list"}</h2>
            <p>{lang === "de"
              ? "Aus dem Melderegister wird eine proportional stratifizierte Stichprobe der Größe N gezogen. Pro Stratum h gilt:"
              : "A proportional stratified sample of size N is drawn from the population register. For each stratum h:"}</p>
            <p><code>n_h = round(N · |h| / |Population|)</code></p>
            <p>{lang === "de"
              ? "Bruchteile werden mit der Largest-Remainder-Methode (Hamilton) verteilt, sodass Σ n_h = N exakt gilt. Die Auswahl innerhalb jedes Stratums erfolgt über einen Fisher-Yates-Shuffle mit Mulberry32-PRNG, gespeist durch einen 32-Bit-Seed."
              : "Fractional remainders are allocated via the largest-remainder (Hamilton) method, so Σ n_h = N exactly. Selection within a stratum is a Fisher–Yates shuffle driven by Mulberry32, seeded with a uint32."}</p>
            <h3>{lang === "de" ? "Performance" : "Performance"}</h3>
            <ul>
              <li>{lang === "de" ? "≤ 100 000 Zeilen: < 1 s" : "≤ 100 000 rows: < 1 s"}</li>
              <li>{lang === "de" ? "Encoding: UTF-8, Win-1252, ISO-8859-1 (auto)" : "Encoding: UTF-8, Win-1252, ISO-8859-1 (auto)"}</li>
              <li>{lang === "de" ? "Output: RFC-4180-konformes CSV, alle Original-Spalten erhalten" : "Output: RFC-4180 CSV, all original columns preserved"}</li>
            </ul>
          </section>

          <section id="stage3">
            <h2>{lang === "de" ? "Stage 3 · Auswahl-Pool" : "Stage 3 · Final panel"}</h2>
            <p>{lang === "de"
              ? "Aus den Antwortenden wird der finale Pool über ein **Maximin-MIP** gezogen — die Phase-1-Wahl. Das Ziel: alle Quoten erfüllen und gleichzeitig die kleinste individuelle Auswahlwahrscheinlichkeit so groß wie möglich machen. Die im Flanigan-Paper (Nature 2021) zentrale **Leximin-Garantie** ist explizit nicht Phase-1-Scope."
              : "The final panel is drawn from respondents via a **Maximin MIP** — the Phase-1 choice. The goal: meet every quota while making the smallest individual selection probability as large as possible. The **Leximin guarantee** from the Flanigan paper (Nature 2021) is explicitly out of Phase-1 scope."}</p>
            <p>{lang === "de"
              ? "Konkrete Solver-Wahl ist offen (Strategie-Entscheidung S-2 in `CLAUDE.md`). Kandidaten: HiGHS via `highs-js` (MIT, in Iteration 1 für Maximin verwendet) oder ein eigener Browser-Leximin-Port (Issue #16, deferred — siehe `docs/upstream-verification.md` zur Gurobi-Pflicht im Upstream)."
              : "Concrete solver choice is open (strategic decision S-2 in `CLAUDE.md`). Candidates: HiGHS via `highs-js` (MIT, used in Iteration 1 for Maximin) or a custom in-browser Leximin port (Issue #16, deferred — see `docs/upstream-verification.md` on the upstream Gurobi requirement)."}</p>
          </section>

          <section id="law">
            <h2>{lang === "de" ? "Rechtsrahmen" : "Legal framework"}</h2>
            <p>{lang === "de"
              ? "§ 46 BMG erlaubt Gemeinden, Daten aus dem Melderegister für Auswahlverfahren zu nutzen — beschränkt auf die im Register tatsächlich enthaltenen Felder. Bildung, Migrationshintergrund und Beruf zählen nicht dazu und können erst über Selbstauskunft (Stage 2) erhoben werden."
              : "§ 46 BMG (Germany) allows municipalities to use register data for selection — limited to fields actually held in the register. Education, migration background and profession are not among them and only enter via self-disclosure (Stage 2)."}</p>
            <p>{lang === "de"
              ? "DSGVO: Da das Werkzeug rein lokal läuft, findet keine Verarbeitung durch Dritte statt. Verantwortliche bleibt die durchführende Behörde / Organisation."
              : "GDPR: Because the tool runs purely client-side, no third-party processing occurs. The conducting authority remains the controller."}</p>
          </section>

          <section id="audit">
            <h2>{lang === "de" ? "Audit & Reproduktion" : "Audit & reproduction"}</h2>
            <p>{lang === "de"
              ? "Jede Ziehung erzeugt einen Audit-Snapshot: Seed, SHA-256 der Eingabe-CSV, Stratifikations-Achsen, Stratum-Tabelle (Soll / Ist), Algorithmus-Version, Zeitstempel — Ed25519-signiert (ECDSA-P256-Fallback)."
              : "Every draw emits an audit snapshot: seed, SHA-256 of the input CSV, stratification axes, stratum table (target/actual), algorithm version, timestamp — Ed25519-signed (ECDSA-P256 fallback)."}</p>
            <p>{lang === "de"
              ? "Reproduktion: gleiche Eingabe, gleicher Seed, gleiche Tool-Version → byte-gleiche CSV der gezogenen Personen."
              : "Reproduction: same input, same seed, same tool version → byte-identical CSV of drawn people."}</p>
          </section>
        </article>
      </div>
    </div>
  );
}

function Samples({ t, lang }) {
  const list = [
    ["herzogenburg-melderegister-8000.csv", lang === "de" ? "Vollbevölkerung NÖ-Gemeinde" : "NÖ municipality, full population", "8 042", "1.4 MB"],
    ["herzogenburg-versand-300.csv", lang === "de" ? "Stratifizierte Versand-Stichprobe" : "Stratified mailing sample", "300", "62 KB"],
    ["herzogenburg-antwortende-60.csv", lang === "de" ? "Antwortende mit Selbstauskunft" : "Respondents with self-disclosure", "60", "18 KB"],
    ["kleinstadt-3000.csv", lang === "de" ? "Kleineres Profil zum Testen" : "Smaller profile for testing", "3 018", "520 KB"],
  ];
  return (
    <div>
      <header className="page-head">
        <div className="crumb">{t("nav_samples")}</div>
        <h1 className="page-title">{lang === "de" ? "Beispiel-Daten" : "Sample data"}</h1>
        <p className="page-lede">{lang === "de"
          ? "Vier vor-generierte synthetische CSV-Dateien zum Ausprobieren. Alle Daten sind erzeugt — keine echten Personen."
          : "Four pre-generated synthetic CSV files to try. All data is generated — no real people."}</p>
      </header>

      <div className="card">
        <div style={{ overflow: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{lang === "de" ? "Datei" : "File"}</th>
                <th>{lang === "de" ? "Beschreibung" : "Description"}</th>
                <th className="num">{t("rows")}</th>
                <th className="num">{lang === "de" ? "Größe" : "Size"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(([n, d, r, s], i) => (
                <tr key={i}>
                  <td style={{fontFamily:"var(--mono)",fontSize:12.5}}>{n}</td>
                  <td>{d}</td>
                  <td className="num">{r}</td>
                  <td className="num">{s}</td>
                  <td style={{textAlign:"right"}}>
                    <button className="btn btn-ghost" style={{height:32}}>
                      <I.Download s={14}/> CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="banner info" style={{ marginTop: "var(--gap-5)" }}>
        <I.Info s={16} className="ico"/>
        <div>{lang === "de"
          ? <>Generator und Reproduzier-Anleitung: <code>scripts/synthetic-meldedaten/</code> im Repository.</>
          : <>Generator and reproduce instructions: <code>scripts/synthetic-meldedaten/</code> in the repo.</>}</div>
      </div>
    </div>
  );
}

function Settings({ t, lang }) {
  return (
    <div>
      <header className="page-head">
        <div className="crumb">{t("nav_settings")}</div>
        <h1 className="page-title">{lang === "de" ? "Einstellungen & Datenschutz" : "Settings & privacy"}</h1>
        <p className="page-lede">{lang === "de"
          ? "Das Werkzeug speichert nichts auf einem Server. Was lokal gespeichert wird, kannst du hier kontrollieren."
          : "The tool stores nothing on a server. What is kept locally, you control here."}</p>
      </header>
      <div className="card">
        <div className="card-head"><h2 className="card-title">{lang === "de" ? "Lokale Speicherung" : "Local storage"}</h2></div>
        <div style={{display:"flex",flexDirection:"column",gap:"var(--gap-3)"}}>
          {[
            [lang === "de" ? "Letzten Seed merken" : "Remember last seed", true],
            [lang === "de" ? "Spalten-Mapping merken" : "Remember column mapping", true],
            [lang === "de" ? "Audit-Snapshots im Browser sichern" : "Save audit snapshots in browser", false],
            [lang === "de" ? "Telemetrie senden" : "Send telemetry", false],
          ].map(([lbl, on], i) => (
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"var(--bg-sunken)",border:"1px solid var(--line)",borderRadius:8}}>
              <span style={{fontSize:13.5,color:"var(--ink-2)"}}>{lbl}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:11,color: on ? "var(--ok)" : "var(--ink-4)"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background: on ? "var(--ok)" : "var(--line-strong)"}}/>
                {on ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2 className="card-title">{lang === "de" ? "Schlüssel" : "Keys"}</h2></div>
        <div className="audit">
          <div><span className="k">signing_key</span>     <span className="v">ed25519:browser-generated</span></div>
          <div><span className="k">public_key </span>     <span className="v hash">ed25519:MCowBQYDK2VwAyEAJ3...</span></div>
          <div><span className="k">created_at </span>     <span className="v">2026-04-12T08:14:22Z</span></div>
        </div>
        <div className="btn-row" style={{marginTop:"var(--gap-4)"}}>
          <button className="btn"><I.Download s={14}/> {lang === "de" ? "Public Key exportieren" : "Export public key"}</button>
          <button className="btn"><I.Refresh s={14}/> {lang === "de" ? "Schlüssel rotieren" : "Rotate key"}</button>
        </div>
      </div>
    </div>
  );
}

window.Overview = Overview;
window.Docs = Docs;
window.Samples = Samples;
window.Settings = Settings;
