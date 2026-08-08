import { useEffect, useState } from 'react';

// Holds `value` steady until it has stopped changing for `delayMs`. Search keys its query
// on the returned value, so a request goes out when typing pauses rather than on every
// keystroke -- each one would be a call to Google Books.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
