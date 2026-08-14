import { STARS, starFillPercent } from './star-fill';

describe('starFillPercent', () => {
  it('fills nothing at zero and everything at five', () => {
    expect(starFillPercent(0)).toBe(0);
    expect(starFillPercent(5)).toBe(100);
  });

  it('fills whole stars at exactly their share of the row', () => {
    expect(starFillPercent(1)).toBeCloseTo(20);
    expect(starFillPercent(3)).toBeCloseTo(60);
  });

  it('puts a half star on the midpoint of its own star', () => {
    expect(starFillPercent(2.5)).toBeCloseTo(50);
    expect(starFillPercent(0.5)).toBeCloseTo(10);
  });

  it('offsets quarter and three-quarter stars off the linear positions', () => {
    expect(starFillPercent(0.25)).toBeGreaterThan(5);
    expect(starFillPercent(0.75)).toBeLessThan(15);
  });

  it('has quarter and three-quarter offsets that sum to a whole star', () => {
    expect(starFillPercent(0.25) + starFillPercent(0.75)).toBeCloseTo(starFillPercent(1));
  });

  it('rises monotonically across every quarter step', () => {
    const steps = Array.from({ length: 21 }, (_, i) => starFillPercent(i * 0.25));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('snaps a value off the quarter grid to the nearest quarter', () => {
    expect(starFillPercent(3.3)).toBe(starFillPercent(3.25));
    expect(starFillPercent(3.9)).toBe(starFillPercent(4));
  });

  it('renders five stars', () => {
    expect(STARS).toHaveLength(5);
  });
});
