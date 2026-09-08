export default function AppModal({ title, children, onClose, footer, size = '' }) {
  const handleClose = onClose || (() => {});

  return (
    <>
      <div className="modal-backdrop fade show" onClick={handleClose} aria-hidden />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        onClick={handleClose}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id="app-modal-title">{title}</h2>
              {onClose && (
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                />
              )}
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
