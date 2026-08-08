export const STARS = [0, 1, 2, 3, 4];

// How much of a star's box to reveal for a quarter, a half and three quarters of that
// star -- indexed by quarter, so [0] is an untouched star.
//
// Not 0/0.25/0.5/0.75. Clipping by width does not fill by area: a star's mass sits in
// the middle and both sides taper to points, so a linear cut shows far less than a
// quarter at 25% and far more than three quarters at 75%. These are the x offsets where
// the glyph's *area* actually reaches each fraction, measured off the StarIcon path
// (which spans x=2 to x=22 of its 24-unit viewBox) by flattening its curves and
// integrating. Two properties fall out that confirm the numbers: a half lands on 12/24,
// the star's own axis of symmetry, and the quarter and three-quarter offsets sum to 1.
//
// Ratings are validated server-side to 0.25 increments, so these three are the only
// partial states that exist -- there is nothing to interpolate.
const QUARTER_FILL = [0, 0.3556, 0.5, 0.6444];

// Shared by StarRating and StarRatingInput, which draw the same overlay. The two have to
// agree exactly: the input maps a click's x position straight onto this scale, so a
// second copy of the arithmetic would put the fill somewhere other than where you
// clicked.
//
// Counting in quarters rather than subtracting a remainder keeps the index in range
// whatever arrives, and every quarter is exactly representable in binary.
export function starFillPercent(value: number): number {
  const quarters = Math.round(value * 4);
  return ((Math.floor(quarters / 4) + QUARTER_FILL[quarters % 4]) / STARS.length) * 100;
}
