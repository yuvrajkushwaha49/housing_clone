const ICONS = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-popup toast-popup-${toast.type}`}
          role="alert"
        >
          <i className={`bi ${ICONS[toast.type] || ICONS.info} toast-popup-icon`} />
          <span className="toast-popup-text">{toast.text}</span>
          <button
            type="button"
            className="toast-popup-close"
            aria-label="Dismiss"
            onClick={() => onDismiss(toast.id)}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
    </div>
  );
}
