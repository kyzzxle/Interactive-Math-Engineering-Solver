# Changelog

## 2.0.0 — 2026-10-31 — Calculator hub expansion

### New calculators (47)
- **Solid Mensuration:** sphere, cylinder, cone, prism, pyramid, frustum of a pyramid.
- **Analytic Geometry:** midpoint and distance, slope and equation of a line, intersection of two lines, line–circle intersection, circle equation, parabola.
- **Algebra:** linear equations, quadratic equations, polynomial factoring, systems of linear equations, exponents and radicals, logarithms.
- **Trigonometry:** right-triangle solver, law of sines (with the ambiguous case), law of cosines, trig identity checker, trig equation solver, degrees/radians and the unit circle.
- **Calculus:** derivatives, tangent lines, critical points, indefinite integrals, definite integrals, area between curves.
- **Statistics & Probability:** mean/median/mode/range, variance and standard deviation, z-scores, normal distribution, binomial probability, confidence intervals.
- **Combinatorics:** factorials, permutations with repetition, circular permutations, binomial theorem expansion, inclusion–exclusion.
- **Engineering Mathematics:** complex numbers, matrices, linear systems by matrix methods, numerical root finding, numerical differentiation, numerical integration.

Every new calculator has labelled inputs with units, validation with specific error messages, a final-answer box, a step-by-step solution (identify → formula → substitute → simplify → answer) that can be hidden, a formula and variable list, assumptions and rounding notes, one or more worked-example buttons, a graph or labelled diagram where useful, and related links.

### Math rendering
- Fixed raw TeX appearing on pages (for example when opened from disk or when the CDN was blocked). Formulas are now converted to MathML at build time with a self-hosted KaTeX, and formulas in results are converted in the browser, with a readable plain-text fallback.
- Removed the jsDelivr dependency.
- Page scripts are bundled into plain scripts so calculators also work from `file://`.

### Existing calculators
- Frustum of a cone, distance from a point to a line, and permutations and combinations keep all their features. They now use the new math rendering and bundled scripts, and link to the closely related new calculators.

### Site
- Homepage shows popular calculators until you search or pick a subject; directory lists all 50.
- Footer lists the eight subjects.
- Tests: generic tests for every generated calculator (worked examples, TeX validity, fuzzing with invalid input), site tests for all 57 pages including a raw-TeX check.

## 1.0.0 — 2026-10-30 — Initial release

### Pages
- Homepage with searchable calculator list, subject filter chips and subject tiles.
- Calculator directory (`calculators/`) grouped by eight subjects, with search that also matches planned topics.
- Three calculator pages, each with a 13-section lesson.
- About, Contact, Privacy Policy, Terms of Service, Disclaimer and a custom 404 page.

### Calculators
- **Frustum of a cone**: height or slant height mode, slant/height, lateral and total surface area, base areas and volume; exact forms with π and simplified radicals; to-scale diagram; cone and cylinder special cases; impossible-shape detection.
- **Distance from a point to a line**: numerator and denominator shown separately, rationalised exact answer, foot of the perpendicular as exact fractions, side-of-line note, plotted graph.
- **Permutations and combinations**: exact BigInt results with binary-splitting multiplication, factorial cancellation steps, self-check, full-digit view and copy, listed outcomes for small cases, labelled approximation for results above 200,000 digits.
- Shared features: inline validation messages, Load example, Reset, copy buttons, shareable URLs, screen-reader status messages.

### SEO
- Unique titles, descriptions, canonical and Open Graph tags; breadcrumbs; JSON-LD (WebSite, WebPage, BreadcrumbList, WebApplication, FAQPage) generated from visible content; sitemap.xml with lastmod; robots.txt.

### Monetisation readiness
- Configurable AdSense loader (manual or Auto ads), reserved-height ad slots, layout preview mode, ads.txt template, AdSense verification meta tag, consent "Privacy choices" link.

### Tooling
- Zero-dependency build script, GitHub Pages-like preview server, link checker, 38 automated tests, GitHub Actions workflow that builds, tests and deploys.
