import { render, screen } from '@testing-library/react';
import { ReadingProgress } from './reading-progress';

describe('ReadingProgress', () => {
  it('names the progressbar with the title and percentage', () => {
    render(<ReadingProgress title="Dune" pct={49} />);

    expect(screen.getByRole('progressbar', { name: 'Dune progress: 49%' })).toBeInTheDocument();
  });

  it('treats a null percentage as 0, not indeterminate', () => {
    render(<ReadingProgress title="Piranesi" pct={null} />);

    expect(screen.getByRole('progressbar', { name: 'Piranesi progress: 0%' })).toBeInTheDocument();
  });
});
