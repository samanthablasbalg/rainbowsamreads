import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { Button } from '@/components/ui/button';
import { ErrorState } from './error-state';

const axiosFailure = (status?: number) =>
  new AxiosError(
    status ? `Request failed with status code ${status}` : 'Network Error',
    undefined,
    undefined,
    undefined,
    status ? ({ status } as AxiosResponse) : undefined
  );

const routeErrorResponse = (status: number) => ({
  status,
  statusText: 'Error',
  internal: false,
  data: null,
});

describe('ErrorState', () => {
  it('names a stale build when a chunk fails to import', () => {
    render(
      <ErrorState
        error={new TypeError('Failed to fetch dynamically imported module: /src/routes/home')}
      />
    );

    expect(screen.getByText('The app was updated')).toBeVisible();
  });

  it('recognises the Safari wording for the same failure', () => {
    render(<ErrorState error={new Error('Importing a module script failed.')} />);

    expect(screen.getByText('The app was updated')).toBeVisible();
  });

  it('blames the connection when the request never reached the server', () => {
    render(<ErrorState error={axiosFailure()} />);

    expect(screen.getByText("Can't reach the server")).toBeVisible();
  });

  it.each([
    [404, "We couldn't find that"],
    [403, "You don't have access to that"],
    [500, 'Something went wrong on our end'],
    [503, 'Something went wrong on our end'],
  ])('maps an axios %i to its own copy', (status, title) => {
    render(<ErrorState error={axiosFailure(status)} />);

    expect(screen.getByText(title)).toBeVisible();
  });

  it.each([
    [404, "We couldn't find that"],
    [403, "You don't have access to that"],
    [500, 'Something went wrong on our end'],
  ])('maps a thrown %i Response to the same copy', (status, title) => {
    render(<ErrorState error={routeErrorResponse(status)} />);

    expect(screen.getByText(title)).toBeVisible();
  });

  it('falls back to generic copy for anything unrecognised', () => {
    render(<ErrorState error={new Error('boom')} />);

    expect(screen.getByText('Something went wrong')).toBeVisible();
  });

  it('falls back for a status with no dedicated copy', () => {
    render(<ErrorState error={axiosFailure(418)} />);

    expect(screen.getByText('Something went wrong')).toBeVisible();
  });

  it('announces itself to assistive technology', () => {
    render(<ErrorState error={new Error('boom')} />);

    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('renders no action when none is passed', () => {
    render(<ErrorState error={new Error('boom')} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the action it is given and lets it be clicked', async () => {
    const onClick = vi.fn();
    render(
      <ErrorState error={new Error('boom')} action={<Button onClick={onClick}>Try again</Button>} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
