/*
 * Tailwind build settings. Run `npm run css` after adding or changing Tailwind classes in any
 * page, template or script; it rewrites assets/css/tailwind.css (committed, so the site and
 * the GitHub Action need no install). The theme matches the old CDN configuration.
 */
module.exports = {
  darkMode: 'class',
  content: [
    './*.html',
    './calculators/**/*.html',
    './content/**/*.html',
    './assets/js/**/*.js',
    '!./assets/js/bundles/**',
    './tools/**/*.{mjs,partial}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson Hyperlegible Next', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        serif: ['STIX Two Text', 'STIX Two Math', 'Cambria', 'Georgia', 'serif'],
      },
      // Older markup uses slate and indigo utilities; they point at the design tokens in
      // styles.css so every page follows the paper (light) and chalkboard (dark) palettes.
      colors: {
        slate: { 200: 'var(--border)', 300: 'var(--text-2)', 400: 'var(--muted)', 500: 'var(--muted)', 600: 'var(--text-2)', 700: 'var(--text-2)', 800: 'var(--border)' },
        indigo: { 400: 'var(--primary)', 500: 'var(--primary)', 600: 'var(--primary)', 700: 'var(--primary-strong)' },
      },
      maxWidth: { prose: '72ch' },
    },
  },
};
