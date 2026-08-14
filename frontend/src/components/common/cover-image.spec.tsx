import { fireEvent, render, screen } from '@testing-library/react';
import { CoverImage } from './cover-image';

describe('CoverImage', () => {
  it('renders the title initial when there is no src', () => {
    const { container } = render(<CoverImage src={null} title="Piranesi" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('falls back to the title initial when the image fails to load', () => {
    const { container } = render(<CoverImage src="https://example.com/cover.jpg" title="Dune" />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });
});
