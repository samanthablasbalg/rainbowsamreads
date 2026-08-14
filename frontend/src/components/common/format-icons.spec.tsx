import { render, screen } from '@testing-library/react';
import { Format } from '@/api/generated/readingTracker.schemas';
import { FormatIcons } from './format-icons';

describe('FormatIcons', () => {
  it('renders one chip per bound format', () => {
    render(<FormatIcons formats={[Format.print, Format.audio]} />);

    expect(screen.getByText('Print')).toBeVisible();
    expect(screen.getByText('Audio')).toBeVisible();
    expect(screen.queryByText('Digital')).not.toBeInTheDocument();
  });

  it('renders nothing when a read has no bound format', () => {
    const { container } = render(<FormatIcons formats={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
