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

  it('asks Google to resize the thumbnail rather than for a bigger tier', () => {
    const { container } = render(
      <CoverImage
        src="http://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api"
        title="Piranesi"
      />
    );

    const src = container.querySelector('img')!.getAttribute('src')!;
    // A tier Google does not hold comes back as a gray placeholder at HTTP 200, so the
    // one that always exists has to stay selected while `w` does the enlarging.
    expect(src).toContain('zoom=1');
    expect(src).toContain('w=600');
    expect(src).not.toContain('edge=curl');
    expect(src).toContain('id=abc');
  });

  it('upgrades a legacy http cover, which the deployed site blocks as mixed content', () => {
    const { container } = render(
      <CoverImage
        src="http://books.google.com/books/content?id=abc&img=1&zoom=1&source=gbs_api"
        title="Piranesi"
      />
    );

    expect(container.querySelector('img')!.getAttribute('src')).toMatch(
      /^https:\/\/books\.google\.com\//
    );
  });

  it('leaves covers from anywhere else alone', () => {
    const { container } = render(
      <CoverImage src="https://example.com/cover.jpg?zoom=1" title="Dune" />
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/cover.jpg?zoom=1'
    );
  });
});
