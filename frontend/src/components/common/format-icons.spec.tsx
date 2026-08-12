import { render, screen } from '@testing-library/react';
import { Format } from '@/api/generated/readingTracker.schemas';
import { FormatIcons } from './format-icons';

describe('FormatIcons', () => {
  it('renders one labelled icon per bound format', () => {
    render(<FormatIcons formats={[Format.print, Format.audio]} />);

    expect(screen.getByRole('img', { name: 'Format: print' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Format: audio' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('renders nothing when a read has no bound format', () => {
    render(<FormatIcons formats={[]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
