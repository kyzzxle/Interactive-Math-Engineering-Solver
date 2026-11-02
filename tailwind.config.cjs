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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      maxWidth: { prose: '72ch' },
    },
  },
};
