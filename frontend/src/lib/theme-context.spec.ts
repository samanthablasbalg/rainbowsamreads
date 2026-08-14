import { renderHook } from '@testing-library/react';
import { useTheme } from './theme-context';

describe('useTheme', () => {
  it('refuses to run outside a ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be called inside a ThemeProvider'
    );
  });
});
