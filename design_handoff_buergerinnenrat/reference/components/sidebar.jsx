// Sidebar with brand mark, grouped nav, language toggle, footer.
function BrandMark({ size = 32 }) {
  // Original mark: a circle of dots — sortition / stratified sample metaphor.
  // Outer ring = population, three filled = drawn.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      {Array.from({ length: 12 }).map((_, i) => {
        const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = 16 + Math.cos(ang) * 11;
        const y = 16 + Math.sin(ang) * 11;
        const drawn = i === 1 || i === 5 || i === 9;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={drawn ? 2.2 : 1.4}
            fill={drawn ? "var(--accent)" : "var(--ink-4)"}
          />
        );
      })}
      <circle cx="16" cy="16" r="3" fill="var(--ink)"/>
    </svg>
  );
}

function NavItem({ id, current, onPick, icon: Icon, step, label, sub }) {
  return (
    <button
      className="nav-item"
      aria-current={current === id ? "page" : undefined}
      onClick={() => onPick(id)}
      title={sub}
    >
      <Icon s={16} className="nav-icon"/>
      <span>{label}</span>
      {step && <span className="nav-step">{step}</span>}
    </button>
  );
}

function Sidebar({ current, onPick, lang, onLang, t }) {
  return (
    <aside className="sidebar" aria-label="Hauptnavigation">
      <div className="brand">
        <div className="brand-mark"><BrandMark/></div>
        <div className="brand-words">
          <span className="name">Bürger:innenrat</span>
          <span className="tag">{t("brand_tag")}</span>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">{t("nav_overview")}</div>
        <NavItem id="overview" current={current} onPick={onPick}
                 icon={I.Overview} label={t("nav_overview")}/>
      </div>

      <div className="nav-section">
        <div className="nav-label">{t("nav_workflow")}</div>
        <NavItem id="stage1" current={current} onPick={onPick}
                 icon={I.Mail} step="Stage 1" label={t("nav_stage1")}
                 sub={t("nav_stage1_sub")}/>
        <NavItem id="stage3" current={current} onPick={onPick}
                 icon={I.Panel} step="Stage 3" label={t("nav_stage3")}
                 sub={t("nav_stage3_sub")}/>
      </div>

      <div className="nav-section">
        <div className="nav-label">{t("nav_resources")}</div>
        <NavItem id="docs" current={current} onPick={onPick}
                 icon={I.Doc} label={t("nav_docs")}/>
        <NavItem id="samples" current={current} onPick={onPick}
                 icon={I.Database} label={t("nav_samples")}/>
        <NavItem id="settings" current={current} onPick={onPick}
                 icon={I.Settings} label={t("nav_settings")}/>
      </div>

      <div className="sidebar-footer">
        <div className="lang-toggle" role="group" aria-label="Sprache">
          <button aria-pressed={lang === "de"} onClick={() => onLang("de")}>DE</button>
          <button aria-pressed={lang === "en"} onClick={() => onLang("en")}>EN</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,color:"var(--ink-3)"}}>
          <I.Lock s={12}/> <span>{t("privacy")}</span>
        </div>
        <div style={{fontFamily:"var(--mono)",fontSize:10.5,color:"var(--ink-4)",letterSpacing:".04em"}}>
          {t("version")}
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
window.BrandMark = BrandMark;
