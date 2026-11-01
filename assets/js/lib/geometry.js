/** Plane-geometry helpers shared by the solid-mensuration calculators. */
export const apothem = (n, s) => s / (2 * Math.tan(Math.PI / n));
export const circumradius = (n, s) => s / (2 * Math.sin(Math.PI / n));
export const regularArea = (n, s) => (n * s * s) / (4 * Math.tan(Math.PI / n));
/** Heron's formula; returns NaN when the sides cannot form a triangle. */
export function heron(a, b, c) {
  const s = (a + b + c) / 2;
  const q = s * (s - a) * (s - b) * (s - c);
  return q > 0 ? Math.sqrt(q) : NaN;
}
export const POLYGON_NAMES = { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon', 7: 'regular heptagon', 8: 'regular octagon', 9: 'regular nonagon', 10: 'regular decagon', 12: 'regular dodecagon' };
export const polygonName = (n) => POLYGON_NAMES[n] || `regular ${n}-gon`;
/** Field options for "number of sides" selects. */
export const SIDES_OPTIONS = [3, 4, 5, 6, 8, 10, 12].map((n) => [String(n), `${n} sides (${polygonName(n)})`]);
