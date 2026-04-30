// App shell + Tweaks integration.
const { useState, useEffect } = React;

function App() {
  const defaults = window.__BR_TWEAKS;
  const [tweaks, setTweak] = useTweaks(defaults);
  const [screen, setScreen] = useState(defaults.screen || "stage1");

  const t = useT(tweaks.lang);

  // Reflect tweaks → DOM root attributes
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-theme", tweaks.theme);
    r.setAttribute("data-density", tweaks.density);
    r.style.setProperty("--hue", String(tweaks.accentHue));
    document.documentElement.lang = tweaks.lang;
  }, [tweaks.theme, tweaks.density, tweaks.accentHue, tweaks.lang]);

  const Screen = {
    overview: Overview,
    stage1:   Stage1,
    stage3:   Stage3,
    docs:     Docs,
    samples:  Samples,
    settings: Settings,
  }[screen] || Stage1;

  return (
    <div className="shell" data-screen-label={`Screen · ${screen}`}>
      <Sidebar
        current={screen}
        onPick={(id) => { setScreen(id); window.scrollTo({ top: 0 }); }}
        lang={tweaks.lang}
        onLang={(l) => setTweak("lang", l)}
        t={t}
      />
      <main className="main">
        <Screen t={t} lang={tweaks.lang} onPick={setScreen}/>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label={tweaks.lang === "de" ? "Darstellung" : "Appearance"}>
          <TweakRadio
            label={tweaks.lang === "de" ? "Theme" : "Theme"}
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "light", label: tweaks.lang === "de" ? "Hell" : "Light" },
              { value: "dark",  label: tweaks.lang === "de" ? "Dunkel" : "Dark" },
            ]}
          />
          <TweakRadio
            label={tweaks.lang === "de" ? "Dichte" : "Density"}
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "comfortable", label: tweaks.lang === "de" ? "Komfortabel" : "Comfortable" },
              { value: "compact",     label: tweaks.lang === "de" ? "Kompakt" : "Compact" },
            ]}
          />
          <TweakSlider
            label={tweaks.lang === "de" ? "Akzent-Hue" : "Accent hue"}
            min={0} max={360} step={1} unit="°"
            value={tweaks.accentHue}
            onChange={(v) => setTweak("accentHue", v)}
          />
        </TweakSection>

        <TweakSection label={tweaks.lang === "de" ? "Sprache" : "Language"}>
          <TweakRadio
            label="UI"
            value={tweaks.lang}
            onChange={(v) => setTweak("lang", v)}
            options={[
              { value: "de", label: "Deutsch" },
              { value: "en", label: "English" },
            ]}
          />
        </TweakSection>

        <TweakSection label={tweaks.lang === "de" ? "Schnellsprung" : "Jump to"}>
          <TweakSelect
            label={tweaks.lang === "de" ? "Bildschirm" : "Screen"}
            value={screen}
            onChange={(v) => setScreen(v)}
            options={[
              { value: "overview", label: t("nav_overview") },
              { value: "stage1",   label: t("nav_stage1") },
              { value: "stage3",   label: t("nav_stage3") },
              { value: "docs",     label: t("nav_docs") },
              { value: "samples",  label: t("nav_samples") },
              { value: "settings", label: t("nav_settings") },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
