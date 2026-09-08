import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ToastStack from '../components/ToastStack';
import { formatApiError } from '../utils/apiError';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (text, type = 'success', duration = 3500) => {
      if (!text) return null;
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, text, type }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const success = useCallback((text) => show(text, 'success'), [show]);
  const error = useCallback((text) => show(text, 'danger', 5000), [show]);
  const info = useCallback((text) => show(text, 'info'), [show]);
  const apiError = useCallback(
    (err, fallback = 'Request failed') => error(formatApiError(err, fallback)),
    [error]
  );

  const value = useMemo(
    () => ({ show, dismiss, success, error, info, apiError }),
    [show, dismiss, success, error, info, apiError]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
