const EXCLUDE_SELECTOR = [
  '[data-keep-enabled]',
  '.review-rating-pill',
  '.review-group-header',
  '.review-detail-tab',
  '.admin-filter-tab',
  '.location-add-toggle',
  '.btn-close',
  '.btn-link',
  '.dropdown-toggle',
  '[aria-expanded]',
  '[aria-label="Open menu"]',
  '[aria-label="Toggle sidebar"]',
  '[aria-label="Toggle theme"]',
  '[aria-label="Notifications"]',
].join(',');

function shouldDisableButton(button) {
  if (!button || button.disabled) return false;
  if (button.dataset.keepEnabled !== undefined) return false;
  if (button.matches(EXCLUDE_SELECTOR)) return false;

  const tag = button.tagName;
  if (tag === 'BUTTON') {
    return button.classList.contains('btn') || button.type === 'submit';
  }
  if (tag === 'INPUT' && button.type === 'submit') return true;
  return false;
}

function reenableDelay(button) {
  if (button.type === 'submit' || button.closest('form')) return 15000;
  return 8000;
}

function disableButton(button) {
  if (!button || button.disabled || !shouldDisableButton(button)) return;

  button.disabled = true;
  button.classList.add('is-click-disabled');
  button.setAttribute('aria-disabled', 'true');

  window.setTimeout(() => {
    if (!button.isConnected) return;
    button.disabled = false;
    button.classList.remove('is-click-disabled');
    button.removeAttribute('aria-disabled');
  }, reenableDelay(button));
}

export function installButtonDisableOnClick() {
  if (typeof document === 'undefined') return () => {};

  const onClick = (event) => {
    const button = event.target.closest('button, input[type="submit"]');
    if (!shouldDisableButton(button)) return;

    // Defer so the browser can fire form submit before the button is disabled.
    if (button.type === 'submit' || button.closest('form')) {
      window.setTimeout(() => disableButton(button), 0);
      return;
    }

    disableButton(button);
  };

  document.addEventListener('click', onClick, true);

  return () => {
    document.removeEventListener('click', onClick, true);
  };
}
