/*
 * Tokens & font stack defined in apps/web/src/index.css; see issue #65 +
 * design_handoff_buergerinnenrat/. The brand.* aliases below are kept for
 * backward-compat during the redesign sweep; new code should reference the
 * token-aliased colors (bg, ink, accent, ok, warn, err …) which read CSS
 * variables from :root / [data-theme="dark"] in index.css.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand-Familie für "Bürger:innenrat" — kept for backward-compat.
        // - DEFAULT: dunkler, seriöser Grundton (Slate-900-Variante) für H1/Logo
        // - fg: Vordergrundfarbe auf Brand-Hintergrund (weiß)
        // - muted: ganz leichter Brand-Tint für Card-Hintergründe
        // - accent: civic-grüner Primär-Akzent (Bürgerrat = zivil/demokratisch)
        // - accent-strong: dunklere Hover-/Press-Variante des Accent-Tons
        brand: {
          DEFAULT: '#0f172a',
          fg: '#f8fafc',
          muted: '#f1f5f9',
          accent: '#16a34a',
          'accent-strong': '#15803d',
        },
        'accent-warm': '#d97706',
        'accent-cool': '#2563eb',
        // === Token-aliased colors (read CSS variables from index.css) ===
        bg: 'var(--bg)',
        'bg-sunken': 'var(--bg-sunken)',
        'bg-card': 'var(--bg-card)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        'accent-ink': 'var(--accent-ink)',
        ok: 'var(--ok)',
        'ok-soft': 'var(--ok-soft)',
        warn: 'var(--warn)',
        'warn-soft': 'var(--warn-soft)',
        err: 'var(--err)',
        'err-soft': 'var(--err-soft)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        serif: ['Source Serif 4', 'Vollkorn', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        'gap-1': 'var(--gap-1)',
        'gap-2': 'var(--gap-2)',
        'gap-3': 'var(--gap-3)',
        'gap-4': 'var(--gap-4)',
        'gap-5': 'var(--gap-5)',
        'gap-6': 'var(--gap-6)',
        'gap-7': 'var(--gap-7)',
        'row-h': 'var(--row-h)',
        'sidebar-w': 'var(--sidebar-w)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        // Subtle civic-tech card shadows — not the heavy material drop-shadow
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover':
          '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // Use class strategy so the plugin only styles `.form-input` etc, not all
    // global <input> tags — protects existing Stage-3 inputs from regressions.
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
};
