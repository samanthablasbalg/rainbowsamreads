import { renderHook } from '@testing-library/react';
import { useConfirm } from './confirm-context';

describe('useConfirm', () => {
  it('refuses to run outside a ConfirmProvider', () => {
    // The context defaults to undefined, so without this guard a consumer would read
    // properties off undefined somewhere far away from the missing provider.
    //
    // React logs every render error to the console on its way out. Silenced so a
    // passing run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useConfirm())).toThrow(
      'useConfirm must be called inside a ConfirmProvider'
    );
  });
});
