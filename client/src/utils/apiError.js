export function formatApiError(err, fallback = 'Request failed') {
  const api = err.response?.data;
  if (Array.isArray(api?.errors) && api.errors.length) {
    return [...new Set(api.errors.map((e) => e.message))].join(' · ');
  }
  return api?.message || fallback;
}
