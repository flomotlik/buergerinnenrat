// Stage 1 — interactive workbench: Upload → Axes → Params → Draw → Result/Audit.

const SAMPLE_DATASETS = [
  { id: "herzogenburg-8000", name: "herzogenburg-melderegister-8000.csv",
    desc: "Vollbevölkerung NÖ-Gemeinde nach Vorbild Herzogenburg",
    rows: 8042, cols: 9, encoding: "UTF-8", size: "1.4 MB" },
  { id: "kleinstadt-3000", name: "kleinstadt-3000.csv",
    desc: "Kleineres Profil zum schnellen Testen",
    rows: 3018, cols: 9, encoding: "UTF-8", size: "520 KB" },
  { id: "wien-favoriten-22k", name: "wien-favoriten-22000.csv",
    desc: "Großstadtbezirk-Profil mit 22 Strata",
    rows: 22481, cols: 11, encoding: "Win-1252", size: "3.9 MB" },
  { id: "muenchen-pasing-15k", name: "muenchen-pasing-15000.csv",
    desc: "Synthetisches DE-Stadtteil-Profil",
    rows: 15022, cols: 10, encoding: "UTF-8", size: "2.6 MB" },
];

// Synthetic district / age / gender distribution for the demo result.
const DEMO_STRATA = [
  { d: "Altstadt",       age: "18-29", g: "w", pop: 412 },
  { d: "Altstadt",       age: "18-29", g: "m", pop: 401 },
  { d: "Altstadt",       age: "30-44", g: "w", pop: 528 },
  { d: "Altstadt",       age: "30-44", g: "m", pop: 510 },
  { d: "Altstadt",       age: "45-64", g: "w", pop: 624 },
  { d: "Altstadt",       age: "45-64", g: "m", pop: 612 },
  { d: "Altstadt",       age: "65+",   g: "w", pop: 388 },
  { d: "Altstadt",       age: "65+",   g: "m", pop: 314 },
  { d: "Wienerstraße",   age: "18-29", g: "w", pop: 296 },
  { d: "Wienerstraße",   age: "18-29", g: "m", pop: 304 },
  { d: "Wienerstraße",   age: "30-44", g: "w", pop: 388 },
  { d: "Wienerstraße",   age: "30-44", g: "m", pop: 401 },
  { d: "Wienerstraße",   age: "45-64", g: "w", pop: 472 },
  { d: "Wienerstraße",   age: "45-64", g: "m", pop: 458 },
  { d: "Wienerstraße",   age: "65+",   g: "w", pop: 296 },
  { d: "Wienerstraße",   age: "65+",   g: "m", pop: 232 },
  { d: "Mühlbach",       age: "18-29", g: "w", pop: 188 },
  { d: "Mühlbach",       age: "18-29", g: "m", pop: 192 },
  { d: "Mühlbach",       age: "30-44", g: "w", pop: 244 },
  { d: "Mühlbach",       age: "30-44", g: "m", pop: 240 },
  { d: "Mühlbach",       age: "45-64", g: "w", pop: 304 },
  { d: "Mühlbach",       age: "45-64", g: "m", pop: 296 },
];

// Largest-Remainder allocation, deterministic by seed.
function allocate(strata, N) {
  const total = strata.reduce((s, x) => s + x.pop, 0);
  const raw = strata.map((s) => ({ ...s, exact: (s.pop / total) * N }));
  const floor = raw.map((s) => ({ ...s, n: Math.floor(s.exact), rem: s.exact - Math.floor(s.exact) }));
  let assigned = floor.reduce((s, x) => s + x.n, 0);
  const remaining = N - assigned;
  const sorted = [...floor].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remaining; i++) sorted[i].n += 1;
  // restore order
  return floor.map((f) => sorted.find((s) => s === f) || f).map((s) => ({
    ...s,
    n: sorted.find((x) => x.d === s.d && x.age === s.age && x.g === s.g).n,
  }));
}

function fmt(n) { return n.toLocaleString("de-DE"); }

function Stage1({ t, lang }) {
  const [phase, setPhase] = React.useState("upload"); // upload|configured|drawn
  const [dataset, setDataset] = React.useState(null);
  const [showSamples, setShowSamples] = React.useState(false);
  const [axes, setAxes] = React.useState(["district", "age_band", "gender"]);
  const [N, setN] = React.useState(300);
  const [seed, setSeed] = React.useState(1745923812);
  const [drawing, setDrawing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const dropRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);

  const pickSample = (s) => {
    setDataset(s);
    setShowSamples(false);
    setPhase("configured");
    setResult(null);
  };

  const toggleAxis = (a) => {
    setAxes((cur) => cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]);
  };

  const newSeed = () => setSeed(Math.floor(Math.random() * 4_294_967_295));
  const copySeed = () => navigator.clipboard?.writeText(String(seed));

  const draw = async () => {
    setDrawing(true);
    await new Promise((r) => setTimeout(r, 650));
    const allocated = allocate(DEMO_STRATA, N);
    setResult({
      total: N,
      strata: allocated,
      ms: 87,
      sha: "3f9c2a0e8b7d4f1e6a52c1b48e9d7a30f1c8b5d6a7e4f3c2b1a098765d4e3f21",
      sig: "MEUCIQDp...kJ8w==",
      ts: new Date().toISOString(),
    });
    setDrawing(false);
    setPhase("drawn");
    setTimeout(() => {
      document.getElementById("s1-result")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const reset = () => {
    setResult(null);
    setPhase(dataset ? "configured" : "upload");
  };

  const stratumCount = axes.length === 0 ? 0 :
    axes.length === 1 ? 4 :
    axes.length === 2 ? 12 : 22;

  // Steps
  const stepStates = [
    phase !== "upload" ? "done" : "current",
    phase === "drawn" || phase === "configured" ? (phase === "drawn" ? "done" : "current") : "todo",
    phase === "drawn" || phase === "configured" ? (phase === "drawn" ? "done" : "current") : "todo",
    phase === "drawn" ? "done" : (phase === "configured" ? "current" : "todo"),
    phase === "drawn" ? "current" : "todo",
  ];

  return (
    <div>
      <header className="page-head">
        <div className="crumb">{t("crumb_stage1")}</div>
        <h1 className="page-title">{t("s1_title")}</h1>
        <p className="page-lede">{t("s1_lede")}</p>
      </header>

      {/* STEP RAIL */}
      <div className="step-rail" role="list">
        {[
          [t("step1"), t("step1_sub")],
          [t("step2"), t("step2_sub")],
          [t("step3"), t("step3_sub")],
          [t("step4"), t("step4_sub")],
          [t("step5"), t("step5_sub")],
        ].map(([lbl, sub], i) => (
          <div key={i} className={`step is-${stepStates[i]}`} role="listitem">
            <div className="num">0{i + 1}</div>
            <div className="lbl">{lbl}</div>
            <div className="sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* CARD 1 — UPLOAD */}
      <section className="card" aria-labelledby="up">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">01 · {t("step1")}</div>
            <h2 id="up" className="card-title">{t("upload_title")}</h2>
            <p className="card-help">{t("upload_help")}</p>
          </div>
        </div>

        {!dataset && !showSamples && (
          <>
            <div
              ref={dropRef}
              className={`dropzone ${drag ? "is-drag" : ""}`}
              onClick={() => setShowSamples(true)}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pickSample(SAMPLE_DATASETS[0]); }}
            >
              <I.Upload s={36} className="ico"/>
              <h3>{t("upload_drop")}</h3>
              <p>{t("upload_alt")}</p>
              <div className="formats">{t("upload_formats")}</div>
            </div>
            <div className="btn-row" style={{ marginTop: "var(--gap-4)", justifyContent: "center" }}>
              <button className="btn" onClick={() => setShowSamples(true)}>
                <I.Database s={14}/> {t("sample_pick")}
              </button>
            </div>
          </>
        )}

        {showSamples && !dataset && (
          <div>
            <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: "var(--gap-3)" }}>
              <strong style={{ fontSize: 13 }}>{t("sample_pick")}</strong>
              <button className="btn btn-ghost" onClick={() => setShowSamples(false)}>{t("sample_close")}</button>
            </div>
            <div className="sample-grid">
              {SAMPLE_DATASETS.map((s) => (
                <button key={s.id} className="sample-card" onClick={() => pickSample(s)}>
                  <span className="name">{s.name}</span>
                  <span className="desc">{s.desc}</span>
                  <span className="size">{fmt(s.rows)} {t("rows")} · {s.cols} {t("cols")} · {s.size} · {s.encoding}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {dataset && (
          <>
            <div className="file-chip">
              <I.File s={24} className="ico"/>
              <div className="meta">
                <span className="name">{dataset.name}</span>
                <span className="stats">
                  {fmt(dataset.rows)} {t("rows")} · {dataset.cols} {t("cols")} · {dataset.encoding}
                </span>
              </div>
              <div className="spacer"/>
              <button className="btn btn-ghost" onClick={() => { setDataset(null); setResult(null); setPhase("upload"); }}>
                <I.Refresh s={14}/> {lang === "de" ? "Andere Datei" : "Change file"}
              </button>
            </div>

            <div className="stats-grid" style={{ marginTop: "var(--gap-4)" }}>
              <div className="stat"><div className="k">{t("rows")}</div><div className="v">{fmt(dataset.rows)}</div></div>
              <div className="stat"><div className="k">{t("cols")}</div><div className="v">{dataset.cols}</div></div>
              <div className="stat"><div className="k">{t("encoding")}</div><div className="v mono">{dataset.encoding}</div></div>
              <div className="stat"><div className="k">{t("sha")}</div><div className="v mono" style={{fontSize:13}}>3f9c2a0e…</div><div className="delta">SHA-256 · 64 hex</div></div>
            </div>
          </>
        )}
      </section>

      {/* CARD 2 — AXES */}
      {dataset && (
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">02 · {t("step2")}</div>
              <h2 className="card-title">{t("axes_title")}</h2>
              <p className="card-help">{t("axes_help")}</p>
            </div>
            <div style={{display:"flex",gap:"var(--gap-5)",alignItems:"baseline",flexShrink:0}}>
              <div style={{textAlign:"right",minWidth:96}}>
                <div className="card-eyebrow" style={{margin:0}}>{t("axes_strata")}</div>
                <div style={{fontFamily:"var(--serif)",fontSize:24,letterSpacing:"-0.01em"}}>{stratumCount}</div>
              </div>
              <div style={{textAlign:"right",minWidth:130}}>
                <div className="card-eyebrow" style={{margin:0}}>{t("axes_smallest")}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:14,color:"var(--ink-2)"}}>n = 188</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "var(--gap-3)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              {t("axes_available")}
            </div>
            <div className="axis-chips">
              {[
                { id: "district",  lbl: lang === "de" ? "Bezirk / Sprengel" : "District" },
                { id: "age_band",  lbl: lang === "de" ? "Altersband" : "Age band" },
                { id: "gender",    lbl: lang === "de" ? "Geschlecht" : "Gender" },
                { id: "nationality", lbl: lang === "de" ? "Staatsbürgerschaft" : "Nationality" },
                { id: "marital",   lbl: lang === "de" ? "Familienstand" : "Marital status" },
              ].map((a) => (
                <button key={a.id}
                        className={`chip ${axes.includes(a.id) ? "is-on" : ""}`}
                        onClick={() => toggleAxis(a.id)}>
                  {a.lbl}
                  <span className="x">{axes.includes(a.id) ? "✓" : "+"}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>
              {t("axes_unavailable")}
            </div>
            <div className="axis-chips">
              {[
                lang === "de" ? "Bildung" : "Education",
                lang === "de" ? "Migrationshintergrund" : "Migration background",
                lang === "de" ? "Beruf" : "Profession",
                lang === "de" ? "Haushaltseinkommen" : "Household income",
              ].map((lbl) => (
                <span key={lbl} className="chip" style={{ opacity: 0.55, cursor: "not-allowed" }}>
                  {lbl}
                </span>
              ))}
            </div>
          </div>

          <div className="banner info" style={{ marginTop: "var(--gap-4)" }}>
            <I.Info s={16} className="ico"/>
            <div><strong>§ 46 BMG.</strong> {t("bmg_note")}</div>
          </div>
        </section>
      )}

      {/* CARD 3 — PARAMS + DRAW */}
      {dataset && (
        <section className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">03 · {t("step3")}</div>
              <h2 className="card-title">{t("params_title")}</h2>
            </div>
          </div>

          <div className="row-3">
            <div className="field">
              <label htmlFor="N">{t("params_n")}</label>
              <input id="N" className="input mono" type="number" min="1" max={dataset.rows}
                     value={N} onChange={(e) => setN(parseInt(e.target.value) || 0)}/>
              <div className="hint">{t("params_n_hint")}</div>
            </div>
            <div className="field">
              <label htmlFor="seed">{t("params_seed")}</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input id="seed" className="input mono" type="number"
                       value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                       style={{ flex: 1 }}/>
                <button className="btn" title={t("params_seed_random")} onClick={newSeed}>
                  <I.Refresh s={14}/>
                </button>
              </div>
              <div className="hint">{t("params_seed_hint")}</div>
            </div>
            <div className="field">
              <label>{t("params_method")}</label>
              <div className="input" style={{ display: "flex", alignItems: "center", color: "var(--ink-2)", fontSize: 13 }}>
                {t("params_method_v")}
              </div>
              <div className="hint">Mulberry32 · Fisher–Yates</div>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: "var(--gap-5)", justifyContent: "flex-end" }}>
            {result && (
              <button className="btn" onClick={reset}>
                <I.Refresh s={14}/> {lang === "de" ? "Zurücksetzen" : "Reset"}
              </button>
            )}
            <button className="btn btn-accent" onClick={draw} disabled={drawing || axes.length === 0}>
              {drawing ? <><I.Refresh s={14}/> {t("drawing")}</> : <><I.Check s={14}/> {result ? t("redraw") : t("draw")}</>}
            </button>
          </div>
        </section>
      )}

      {/* RESULT */}
      {result && (
        <div id="s1-result" className="scroll-anchor">
          <ResultBlock t={t} lang={lang} result={result} dataset={dataset} N={N} seed={seed} axes={axes}/>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ t, lang, result, dataset, N, seed, axes }) {
  const totalPop = result.strata.reduce((s, x) => s + x.pop, 0);
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <div className="card-eyebrow" style={{ color: "var(--accent-ink)" }}>
              <I.Check s={12} className="i-inline" style={{color:"var(--ok)"}}/> {t("result_eyebrow")}
            </div>
            <h2 className="card-title">{t("result_title")}</h2>
            <p className="card-help">{t("result_help")}</p>
          </div>
          <div className="btn-row">
            <button className="btn"><I.Download s={14}/> {t("download_csv")}</button>
            <button className="btn btn-primary"><I.Download s={14}/> {t("download_audit")}</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat">
            <div className="k">{t("result_total")}</div>
            <div className="v">{fmt(result.total)}</div>
            <div className="delta">{lang === "de" ? "von" : "of"} {fmt(totalPop)} ({((result.total / totalPop) * 100).toFixed(2)} %)</div>
          </div>
          <div className="stat">
            <div className="k">{t("result_strata")}</div>
            <div className="v">{result.strata.length} / {result.strata.length}</div>
            <div className="delta">Σ n_h = N · {lang === "de" ? "exakt" : "exact"}</div>
          </div>
          <div className="stat">
            <div className="k">{t("result_time")}</div>
            <div className="v mono">{result.ms} ms</div>
            <div className="delta">{lang === "de" ? "im Browser, single-thread" : "in-browser, single-threaded"}</div>
          </div>
          <div className="stat">
            <div className="k">{t("result_seed")}</div>
            <div className="v mono">{seed}</div>
            <div className="delta">Mulberry32 · uint32</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <div className="card-eyebrow">04 · {lang === "de" ? "Stratum-Tabelle" : "Stratum table"}</div>
            <h2 className="card-title">{lang === "de" ? "Soll vs. Ist je Stratum" : "Target vs. drawn per stratum"}</h2>
          </div>
        </div>
        <div style={{ overflow: "auto", maxHeight: 420, border: "1px solid var(--line)", borderRadius: 8 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("table_stratum")}</th>
                <th className="num">{t("table_pop")}</th>
                <th className="num">{t("table_share")}</th>
                <th className="num">{t("table_target")}</th>
                <th className="num">{t("table_drawn")}</th>
                <th className="bar-cell">{t("table_dist")}</th>
              </tr>
            </thead>
            <tbody>
              {result.strata.map((s, i) => (
                <tr key={i}>
                  <td>
                    <span style={{fontWeight:500}}>{s.d}</span>
                    <span style={{color:"var(--ink-3)",fontFamily:"var(--mono)",fontSize:11,marginLeft:8}}>{s.age} · {s.g}</span>
                  </td>
                  <td className="num">{fmt(s.pop)}</td>
                  <td className="num">{((s.pop / totalPop) * 100).toFixed(2)} %</td>
                  <td className="num">{s.exact.toFixed(2)}</td>
                  <td className="num" style={{color:"var(--ink)", fontWeight:600}}>{s.n}</td>
                  <td className="bar-cell">
                    <div className="bar">
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(s.n / Math.max(...result.strata.map(x => x.n))) * 100}%` }}/>
                      </div>
                      <div className="bar-val">{s.n}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AuditPanel t={t} lang={lang} result={result} dataset={dataset} seed={seed} N={N} axes={axes}/>
    </>
  );
}

window.Stage1 = Stage1;
