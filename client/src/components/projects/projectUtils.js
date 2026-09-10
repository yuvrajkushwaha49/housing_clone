export function formatPriceRange(min, max) {
  if (min != null && max != null) {
    return `₹${Number(min).toLocaleString('en-IN')} – ₹${Number(max).toLocaleString('en-IN')}`;
  }
  if (min != null) return `From ₹${Number(min).toLocaleString('en-IN')}`;
  if (max != null) return `Up to ₹${Number(max).toLocaleString('en-IN')}`;
  return '—';
}

function formatSinglePriceCompact(value, withSymbol = true) {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const crore = 10000000;
  const lakh = 100000;
  const prefix = withSymbol ? '₹' : '';
  if (n >= crore) {
    const cr = n / crore;
    const formatted = cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2);
    return `${prefix}${formatted} Cr`;
  }
  const lakhs = n / lakh;
  const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2);
  return `${prefix}${formatted} L`;
}

export function formatPriceCompact(min, max) {
  const minStr = formatSinglePriceCompact(min, true);
  const maxStr = formatSinglePriceCompact(max, false);
  if (minStr && maxStr) return `${minStr} - ${maxStr}`;
  if (minStr) return `From ${minStr}`;
  if (maxStr) return `Up to ₹${maxStr}`;
  return '—';
}

export function formatShortLocation(project) {
  return [project.locality?.name, project.city?.name].filter(Boolean).join(', ') || formatLocation(project);
}

export function formatProjectConfiguration(project) {
  if (project.configLabel) return project.configLabel;
  if (project.category?.name) return project.category.name;
  return 'Residential project';
}

export function formatDetailValue(value) {
  if (value === null || value === undefined || value === '') return '0';
  return value;
}

export function formatAdminPriceRange(min, max) {
  if (min != null && max != null) {
    return `₹${Number(min).toLocaleString('en-IN')} – ₹${Number(max).toLocaleString('en-IN')}`;
  }
  if (min != null) return `From ₹${Number(min).toLocaleString('en-IN')}`;
  if (max != null) return `Up to ₹${Number(max).toLocaleString('en-IN')}`;
  return '0';
}

export function formatAdminLocation(project) {
  const value = [
    project.locality?.name,
    project.city?.name,
    project.state?.name,
    project.country?.name,
  ].filter(Boolean).join(', ');
  return formatDetailValue(value);
}

export function formatLocation(project) {
  return [
    project.locality?.name,
    project.city?.name,
    project.state?.name,
    project.country?.name,
  ].filter(Boolean).join(', ') || '—';
}

export const PROJECT_STATUS_BADGE = {
  draft: 'text-bg-secondary',
  pending: 'text-bg-warning',
  published: 'text-bg-success',
  rejected: 'text-bg-danger',
  archived: 'text-bg-light border',
};

export const PROJECT_STATUS_LABEL = {
  draft: 'Draft',
  pending: 'Pending review',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};

export function formatProjectStatus(status) {
  return PROJECT_STATUS_LABEL[status] || status;
}

export function formatProjectDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const UNIT_STATUS_BADGE = {
  available: 'text-bg-success',
  held: 'text-bg-warning',
  sold: 'text-bg-secondary',
  blocked: 'text-bg-danger',
};

export const UNIT_STATUS_LABEL = {
  available: 'Available',
  held: 'On hold',
  sold: 'Sold',
  blocked: 'Blocked',
};

export function formatUnitStatus(status) {
  return UNIT_STATUS_LABEL[status] || status;
}
