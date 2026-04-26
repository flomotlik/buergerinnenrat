/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand-Familie für "Bürger:innenrat":
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
