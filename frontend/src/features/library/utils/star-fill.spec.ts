import { STARS, starFillPercent } from './star-fill';

// The arithmetic the whole widget rests on: StarRating clips its filled row to this
// percentage, and StarRatingInput's range maps a click's x position onto the same scale.
// If these two ever disagree the rating lands somewhere other than where it was clicked,
// which is not a failure either component can catch on its own.
describe('starFillPercent', () => {
  it('fills nothing at zero and everything at five', () => {
    expect(starFillPercent(0)).toBe(0);
    expect(starFillPercent(5)).toBe(100);
  });

  it('fills whole stars at exactly their share of the row', () => {
    expect(starFillPercent(1)).toBeCloseTo(20);
    expect(starFillPercent(3)).toBeCloseTo(60);
  });

  // A half star lands on the glyph's own axis of symmetry, which is the property that
  // confirms the quarter offsets are measured by area rather than guessed.
  it('puts a half star on the midpoint of its own star', () => {
    expect(starFillPercent(2.5)).toBeCloseTo(50);
    expect(starFillPercent(0.5)).toBeCloseTo(10);
  });

  // Not 25% and 75% of the star's box: the glyph tapers to points at both edges, so a
  // linear cut shows far less than a quarter at 25% and far more than three quarters at
  // 75%. A quarter reveals more than a quarter of the width, and a three-quarter less.
  it('offsets quarter and three-quarter stars off the linear positions', () => {
    expect(starFillPercent(0.25)).toBeGreaterThan(5);
    expect(starFillPercent(0.75)).toBeLessThan(15);
  });

  // The quarter and three-quarter offsets sum to one whole star, the other property that
  // falls out of measuring by area.
  it('has quarter and three-quarter offsets that sum to a whole star', () => {
    expect(starFillPercent(0.25) + starFillPercent(0.75)).toBeCloseTo(starFillPercent(1));
  });

  it('rises monotonically across every quarter step', () => {
    const steps = Array.from({ length: 21 }, (_, i) => starFillPercent(i * 0.25));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
  });

  // Counting in quarters rather than subtracting a remainder is what keeps the index in
  // range. A value the server would reject still has to render something rather than
  // read past the end of the offsets table and produce NaN.
  it('snaps a value off the quarter grid to the nearest quarter', () => {
    expect(starFillPercent(3.3)).toBe(starFillPercent(3.25));
    expect(starFillPercent(3.9)).toBe(starFillPercent(4));
  });

  it('renders five stars', () => {
    expect(STARS).toHaveLength(5);
  });
});
