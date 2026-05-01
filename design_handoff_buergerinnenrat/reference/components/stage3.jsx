// Stage 3 — Maximin auswahl mockup (statisch, hi-fi).
function Stage3({ t, lang }) {
  const quotas = [
    { lbl: lang === "de" ? "Bezirk · Altstadt" : "District · Old town",   min: 9, max: 13, ach: 11 },
    { lbl: lang === "de" ? "Bezirk · Wienerstr." : "District · Vienna st.", min: 7, max: 10, ach: 9  },
    { lbl: lang === "de" ? "Bezirk · Mühlbach" : "District · Mühlbach",   min: 4, max: 7,  ach: 5  },
    { lbl: lang === "de" ? "Alter · 18-29" : "Age · 18-29",                min: 5, max: 8,  ach: 6  },
    { lbl: lang === "de" ? "Alter · 30-44" : "Age · 30-44",                min: 7, max: 10, ach: 8  },
    { lbl: lang === "de" ? "Alter · 45-64" : "Age · 45-64",                min: 8, max: 11, ach: 9  },
    { lbl: lang === "de" ? "Alter · 65+" : "Age · 65+",                    min: 4, max: 7,  ach: 5  },
    { lbl: lang === "de" ? "Geschlecht · w" : "Gender · f",                min: 12, max: 15, ach: 13 },
    { lbl: lang === "de" ? "Geschlecht · m" : "Gender · m",                min: 12, max: 15, ach: 12 },
    { lbl: lang === "de" ? "Bildung · niedrig" : "Education · low",        min: 5, max: 8, ach: 7 },
    { lbl: lang === "de" ? "Bildung · mittel" : "Education · medium",      min: 9, max: 12, ach: 10 },
    { lbl: lang === "de" ? "Bildung · hoch" : "Education · high",          min: 6, max: 10, ach: 8  },
  ];

  const dist = [
    { l: "18-29", t: 22, a: 24 },
    { l: "30-44", t: 30, a: 32 },
    { l: "45-64", t: 32, a: 30 },
    { l: "65+",   t: 16, a: 14 },
  ];

  return (
    <div>
      <header className="page-head">
        <div className="crumb">Stage 3 <span className="sep">›</span> {lang === "de" ? "Auswahl-Pool" : "Final panel"} <span className="sep">›</span> Maximin</div>
        <h1 className="page-title">{lang === "de" ? "Auswahl-Pool aus den Antwortenden ziehen" : "Draw final panel from respondents"}</h1>
        <p className="page-lede">
          {lang === "de"
            ? "Aus den Personen, die nach der Versand-Liste geantwortet haben, wird eine Auswahl gezogen, die alle Quoten erfüllt und gleichzeitig die Auswahlwahrscheinlichkeit über alle Antwortenden möglichst gleich hält (Maximin (Phase 1) — Leximin-Variante nach Flanigan et al., Nature 2021, ist nicht Phase-1-Scope; Begründung siehe Doku)."
            : "From the people who replied to the mailing, a panel is drawn that meets every quota while keeping the selection probability across respondents as uniform as possible (Maximin (Phase 1) — the Leximin variant from Flanigan et al., Nature 2021, is out of Phase-1 scope; see docs)."}
        </p>
      </header>

      <div className="banner warn" style={{ marginBottom: "var(--gap-5)" }}>
        <I.Warn s={16} className="ico"/>
        <div>
          <strong>{lang === "de" ? "Vorschau-Mockup." : "Preview mockup."}</strong>{" "}
          {lang === "de"
            ? "Stage 3 ist in dieser Vorschau **Konzept** — noch nicht implementiert. **Solver-Wahl ist offen (S-2 in CLAUDE.md).** Eine Browser-Leximin-Garantie ist nicht zugesagt; Upstream-Leximin (sortition-algorithms) erfordert Gurobi. Die hier gezeigten Werte sind Beispieldaten."
            : "Stage 3 is **concept-only** in this preview — not implemented. **Solver choice is open (S-2 in CLAUDE.md).** No in-browser Leximin guarantee is promised; upstream Leximin (sortition-algorithms) requires Gurobi. The values shown here are illustrative."}
        </div>
      </div>

      <div className="dual-pane">
        <section className="card" style={{margin:0}}>
          <div className="card-head">
            <div>
              <div className="card-eyebrow">{lang === "de" ? "Quoten" : "Quotas"}</div>
              <h2 className="card-title">{lang === "de" ? "Min / Max je Merkmal" : "Min / max per feature"}</h2>
            </div>
          </div>
          <div className="quota-list">
            {quotas.map((q, i) => (
              <div key={i} className="quota-row">
                <span className="lbl">{q.lbl}</span>
                <span className="min">≥ {q.min}</span>
                <span className="max">≤ {q.max}</span>
                <span className="achieved">{q.ach}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{display:"flex",flexDirection:"column",gap:"var(--gap-5)"}}>
          <section className="card" style={{margin:0}}>
            <div className="card-head">
              <div>
                <div className="card-eyebrow">{lang === "de" ? "Solver" : "Solver"}</div>
                <h2 className="card-title">{lang === "de" ? "Solver — Auswahl offen" : "Solver — to be decided"}</h2>
              </div>
              <span className="sig-pill" style={{background:"var(--bg-sunken)",color:"var(--ink-3)",border:"1px solid var(--line-strong)"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"var(--ink-4)",display:"inline-block"}}/>
                {lang === "de" ? "Konzept" : "Concept"}
              </span>
            </div>
            <div className="solver-panel">
              <div className="solver-step is-done"><span className="dot"/> 01 · {lang === "de" ? "CSV mit Antworten geladen" : "Respondent CSV loaded"} · 312 {t("rows")}</div>
              <div className="solver-step is-done"><span className="dot"/> 02 · {lang === "de" ? "Quoten validiert" : "Quotas validated"} · 12 {lang === "de" ? "Beschränkungen" : "constraints"}</div>
              <div className="solver-step is-done"><span className="dot"/> 03 · {lang === "de" ? "LP-Modell aufgebaut" : "LP model built"}</div>
              <div className="solver-step is-active"><span className="dot"/> 04 · Maximin-{lang === "de" ? "Iterationen" : "iterations"} · 3 / 24</div>
              <div className="solver-step"><span className="dot"/> 05 · {lang === "de" ? "Marginale ziehen" : "Sample marginals"}</div>
              <div className="solver-step"><span className="dot"/> 06 · {lang === "de" ? "Audit-Snapshot signieren" : "Sign audit snapshot"}</div>
            </div>
          </section>

          <section className="card" style={{margin:0}}>
            <div className="card-head">
              <div>
                <div className="card-eyebrow">{lang === "de" ? "Verteilung" : "Distribution"}</div>
                <h2 className="card-title">{lang === "de" ? "Soll vs. Auswahl · Alter" : "Target vs. selected · Age"}</h2>
              </div>
            </div>
            <div className="dist">
              {dist.map((d, i) => (
                <div className="dist-row" key={i}>
                  <span className="lbl">{d.l}</span>
                  <div className="dist-bar">
                    <div className="achieved" style={{ width: `${(d.a / 35) * 100}%` }}/>
                    <div className="target" style={{ left: `${(d.t / 35) * 100}%` }}/>
                  </div>
                  <span className="val">{d.a} / {d.t}</span>
                </div>
              ))}
            </div>
            <div style={{fontSize:11.5,color:"var(--ink-3)",marginTop:"var(--gap-3)",display:"flex",gap:"var(--gap-4)"}}>
              <span><span style={{display:"inline-block",width:10,height:6,background:"var(--accent)",borderRadius:2,verticalAlign:"middle",marginRight:6}}/>{lang === "de" ? "Ist" : "Selected"}</span>
              <span><span style={{display:"inline-block",width:2,height:10,background:"var(--ink)",verticalAlign:"middle",marginRight:6}}/>{lang === "de" ? "Soll" : "Target"}</span>
            </div>
          </section>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--gap-5)" }}>
        <div className="card-head">
          <div>
            <div className="card-eyebrow">{lang === "de" ? "Fairness" : "Fairness"}</div>
            <h2 className="card-title">{lang === "de" ? "Auswahlwahrscheinlichkeit über Antwortende" : "Selection probability across respondents"}</h2>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"var(--gap-4)"}}>
          <div className="stat"><div className="k">min π</div><div className="v mono">0.078</div><div className="delta">{lang === "de" ? "Maximin-Schranke" : "Maximin bound"}</div></div>
          <div className="stat"><div className="k">max π</div><div className="v mono">0.142</div><div className="delta">Δ = 0.064</div></div>
          <div className="stat"><div className="k">{lang === "de" ? "Mittelwert" : "Mean"}</div><div className="v mono">0.111</div><div className="delta">35 / 312</div></div>
          <div className="stat"><div className="k">{lang === "de" ? "Gini" : "Gini"}</div><div className="v mono">0.087</div><div className="delta">{lang === "de" ? "niedriger = fairer" : "lower = fairer"}</div></div>
        </div>
      </div>
    </div>
  );
}

window.Stage3 = Stage3;
