export function phoneToTelHref(value) {
  if (value == null || value === '—') return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.startsWith('91') && digits.length >= 12) return `tel:+${digits}`;
  return `tel:+${digits}`;
}

export function isPhoneLike(value) {
  if (value == null || value === '—') return false;
  const text = String(value).trim();
  if (!text || /^https?:\/\//i.test(text)) return false;
  const digits = text.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

export function normalizeWebHref(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (isHttpUrl(text)) return text;
  if (isPhoneLike(text)) return null;
  if (/^www\./i.test(text)) return `https://${text}`;
  if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}(\/.*)?$/i.test(text)) {
    return `https://${text}`;
  }
  return null;
}

/** Normalize website field on save — accepts example.com, www.example.com, https://… */
export function normalizeWebsiteInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (isPhoneLike(text)) return text;
  return normalizeWebHref(text) || text;
}
