import { renderHook } from '@testing-library/react';
import { useTheme } from './theme-context';

describe('useTheme', () => {
  it('refuses to run outside a ThemeProvider', () => {
    // The context defaults to undefined, so without this guard a consumer would read
    // properties off undefined somewhere far away from the missing provider.
    //
    // RTL's own renderHook, deliberately: the helper in test/render.tsx supplies the
    // provider, which is the thing being withheld here.
    //
    // React logs every render error to the console on its way out. Silenced so a
    // passing run stays readable.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be called inside a ThemeProvider'
    );

    consoleError.mockRestore();
  });
});
