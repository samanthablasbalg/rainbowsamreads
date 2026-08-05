import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useConfirm } from './confirm-context';
import { ConfirmProvider } from './confirm-provider';

// Reports the resolved outcome as text, so assertions read off the DOM rather than off
// the hook's internals.
function ConfirmProbe() {
  const confirm = useConfirm();
  const [result, setResult] = useState('none');

  async function ask() {
    const confirmed = await confirm({
      title: 'Delete this read?',
      description: "This can't be undone.",
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    setResult(confirmed ? 'confirmed' : 'cancelled');
  }

  return (
    <div>
      <p>result: {result}</p>
      <button onClick={ask}>Ask</button>
    </div>
  );
}

// setup.ts stubs matchMedia to always report a fine pointer. Tests that care about a
// coarse (touch) pointer replace it before rendering.
function setCoarsePointer(coarse: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        media: query,
        matches: coarse,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as MediaQueryList
  );
}

describe('ConfirmProvider', () => {
  it('opens a dialog on a fine pointer', async () => {
    setCoarsePointer(false);
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));

    const alertDialog = await screen.findByRole('alertdialog', { name: 'Delete this read?' });
    expect(alertDialog).not.toHaveAttribute('data-side');
  });

  it('opens a sheet on a coarse pointer', async () => {
    setCoarsePointer(true);
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));

    const alertDialog = await screen.findByRole('alertdialog', { name: 'Delete this read?' });
    expect(alertDialog).toHaveAttribute('data-side', 'bottom');
  });

  it('resolves true when the action button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('result: confirmed')).toBeInTheDocument();
  });

  it('resolves false when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('result: cancelled')).toBeInTheDocument();
  });

  it('resolves false on Escape', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');

    expect(await screen.findByText('result: cancelled')).toBeInTheDocument();
  });

  // The one behaviour that justifies AlertDialog/AlertSheet over plain Dialog/Sheet: a
  // backdrop click does nothing, rather than silently resolving false.
  it('does not resolve on a backdrop click, leaving the confirmation pending', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <ConfirmProbe />
      </ConfirmProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Ask' }));
    await screen.findByRole('alertdialog');

    await user.click(document.body);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('result: none')).toBeInTheDocument();
  });
});
