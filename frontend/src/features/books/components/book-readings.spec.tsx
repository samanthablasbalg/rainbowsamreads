import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookReadings } from './book-readings';

describe('BookReadings', () => {
  it('links Progress log at the read’s own page', async () => {
    const user = userEvent.setup();
    render(
      <BookReadings
        book={buildBook()}
        tracked
        engagements={[buildEngagement({ id: 'engagement-Piranesi' })]}
      />
    );

    // The row is a `details`, so its actions only exist once the summary is expanded.
    await user.click(screen.getByRole('group'));

    expect(screen.getByRole('link', { name: 'Progress log' })).toHaveAttribute(
      'href',
      '/reads/engagement-Piranesi'
    );
  });
});
