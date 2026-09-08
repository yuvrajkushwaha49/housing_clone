import { useCallback, useEffect, useRef } from 'react';
import { useToast } from './useToast';
import { validateProjectPriceRange } from '../utils/unitUtils';

const DEBOUNCE_MS = 5000;

export function useDebouncedProjectPriceToast(delayMs = DEBOUNCE_MS) {
  const toast = useToast();
  const timerRef = useRef(null);

  const clearScheduled = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const notifyDebounced = useCallback(
    (minPrice, maxPrice) => {
      clearScheduled();
      timerRef.current = setTimeout(() => {
        const err = validateProjectPriceRange(minPrice, maxPrice);
        if (err) toast.error(err);
        timerRef.current = null;
      }, delayMs);
    },
    [clearScheduled, delayMs, toast]
  );

  const notifyNow = useCallback(
    (minPrice, maxPrice) => {
      clearScheduled();
      const err = validateProjectPriceRange(minPrice, maxPrice);
      if (err) toast.error(err);
    },
    [clearScheduled, toast]
  );

  useEffect(() => clearScheduled, [clearScheduled]);

  return { notifyDebounced, notifyNow };
}
