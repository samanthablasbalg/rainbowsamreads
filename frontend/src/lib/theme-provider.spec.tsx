import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/render';
import { useTheme } from './theme-context';

const STORAGE_KEY = 'reading-tracker-theme';

// Reports what the context resolved to as text, so the assertions read off the DOM
// rather than off the hook's internals.
function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <p>chosen: {theme}</p>
      <p>resolved: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>Go dark</button>
    </div>
  );
}

// setup.ts stubs matchMedia to always report light. Tests that care about the OS
// preference replace it before rendering.
function setSystemPrefersDark(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        media: query,
        matches: prefersDark,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as MediaQueryList
  );
}

describe('ThemeProvider', () => {
  afterEach(() => {
    localStorage.clear();
    // documentElement is shared by every test in the file -- unmounting the provider
    // does not take the class back off.
    document.documentElement.classList.remove('dark');
  });

  it('follows the system when nothing has been chosen', () => {
    setSystemPrefersDark(true);

    render(<ThemeProbe />);

    expect(screen.getByText('chosen: system')).toBeInTheDocument();
    expect(screen.getByText('resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('restores the choice that was persisted', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    setSystemPrefersDark(false);

    render(<ThemeProbe />);

    expect(screen.getByText('chosen: dark')).toBeInTheDocument();
    expect(screen.getByText('resolved: dark')).toBeInTheDocument();
  });

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem(STORAGE_KEY, 'sepia');

    render(<ThemeProbe />);

    expect(screen.getByText('chosen: system')).toBeInTheDocument();
  });

  it('persists a new choice and puts the class on the document', async () => {
    setSystemPrefersDark(false);
    const user = userEvent.setup();
    render(<ThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'Go dark' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('applies the choice for the session even when storage refuses to write', async () => {
    setSystemPrefersDark(false);
    // Private browsing throws on setItem. The choice should still take effect.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const user = userEvent.setup();
    render(<ThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'Go dark' }));

    expect(screen.getByText('resolved: dark')).toBeInTheDocument();
  });
});
