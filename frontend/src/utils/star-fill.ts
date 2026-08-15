export const STARS = [0, 1, 2, 3, 4];

// How much of a star's box to reveal, indexed by quarter. Not 0/0.25/0.5/0.75: clipping
// by width does not fill by area, because the glyph's mass sits in the middle and tapers
// to points at both edges. These are the x offsets where the StarIcon path's *area*
// reaches each fraction, found by flattening its curves and integrating over x=2 to x=22
// of its 24-unit viewBox. Two properties confirm them: the half lands on the star's own
// axis of symmetry, and the quarter and three-quarter offsets sum to 1.
const QUARTER_FILL = [0, 0.3556, 0.5, 0.6444];

// StarRatingInput maps a click's x position straight onto this scale, so a second copy of
// the arithmetic would put the fill somewhere other than where you clicked.
export function starFillPercent(value: number): number {
  const quarters = Math.round(value * 4);
  return ((Math.floor(quarters / 4) + QUARTER_FILL[quarters % 4]) / STARS.length) * 100;
}
