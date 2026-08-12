import { render, screen } from '@testing-library/react';
import { StreakIndicator } from './streak-indicator';

describe('StreakIndicator', () => {
  it.each([
    [0, '0 days'],
    [1, '1 day'],
    [2, '2 days'],
  ])('reads %i days as "%s"', (days, expected) => {
    render(<StreakIndicator days={days} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
