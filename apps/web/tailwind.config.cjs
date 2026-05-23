/*
 * Tailwind config — Phase 2 of the design-system migration (#12).
 *
 * The previous OkLCH Hue-145 token layer is gone. The aliases below
 * are thin Tailwind utility shims that read DS variables loaded via
 * `apps/web/index.html` (`https://grueneat.github.io/design-system/design-system.css`).
 *
 * Branding direction: full Grüne-AT branding — magenta CTAs, green
 * wordmark via the DS CDN, Barlow Semi Condensed via the DS stack.
 * No civic-tech-neutral framing.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Token-aliased colors — read CSS variables defined in
        // `apps/web/src/index.css`, which themselves alias the DS tokens
        // (`--gat-color-*` / `--gat-web-*`). New code can also reach for
        // the DS variables directly via arbitrary Tailwind values
        // (`bg-[var(--gat-color-magenta)]`).
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
        // Aliased to the DS Grüne-AT stack via `--gat-font-*` (Barlow
        // Semi Condensed for copy/headline, Vollkorn for emphasis serif).
        sans: [
          'var(--gat-font-copy)',
          'Barlow Semi Condensed',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        serif: ['var(--gat-font-emphasis)', 'Vollkorn', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
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
        // Card shadows — kept light deliberately, not a material drop.
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
