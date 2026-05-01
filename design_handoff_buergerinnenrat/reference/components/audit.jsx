// Audit-Snapshot panel: hash, seed, axes, signature.
function AuditPanel({ t, lang, result, dataset, seed, N, axes }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">05 · Audit</div>
          <h2 className="card-title">{t("audit_title")}</h2>
          <p className="card-help">{t("audit_help")}</p>
        </div>
        <span className="sig-pill">{t("audit_signed")}</span>
      </div>

      <div className="audit">
        <div><span className="k">algorithm</span>     <span className="v">largest_remainder</span></div>
        <div><span className="k">prng       </span>     <span className="v">mulberry32</span></div>
        <div><span className="k">seed       </span>     <span className="v">{seed}</span></div>
        <div><span className="k">N          </span>     <span className="v">{N}</span></div>
        <div><span className="k">axes       </span>     <span className="v">[{axes.map((a) => `"${a}"`).join(", ")}]</span></div>
        <div><span className="k">input_sha  </span>     <span className="v hash">sha256:{result.sha}</span></div>
        <div><span className="k">input_rows </span>     <span className="v">{dataset.rows}</span></div>
        <div><span className="k">strata     </span>     <span className="v">{result.strata.length}</span></div>
        <div><span className="k">created_at </span>     <span className="v">{result.ts}</span></div>
        <div><span className="k">signature  </span>     <span className="v hash">ed25519:{result.sig}</span></div>
        <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <span className="k">tool_version</span>     <span className="v">buergerinnenrat@0.4.0</span>
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: "var(--gap-4)" }}>
        <button className="btn"><I.Copy s={14}/> {t("copy_seed")}</button>
        <button className="btn"><I.Download s={14}/> {t("download_audit")}</button>
        <a href="#docs" className="btn btn-ghost" style={{textDecoration:"none"}}><I.Doc s={14}/> {lang === "de" ? "Reproduzier-Anleitung" : "Reproduce guide"}</a>
      </div>
    </section>
  );
}

window.AuditPanel = AuditPanel;
