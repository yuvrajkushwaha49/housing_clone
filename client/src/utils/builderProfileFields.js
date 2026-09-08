export const BUILDER_PROFILE_SECTIONS = [
  {
    id: 'identity',
    title: 'Company identity',
    hint: 'How buyers recognize your brand.',
    icon: 'bi-building-gear',
    fields: [
      { key: 'companyName', label: 'Company name', icon: 'bi-building' },
      { key: 'legalName', label: 'Legal name', icon: 'bi-file-earmark-text' },
      { key: 'yearEstablished', label: 'Year established', icon: 'bi-calendar3' },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance & registration',
    hint: 'Registration details shown on listings.',
    icon: 'bi-shield-check',
    fields: [
      { key: 'reraNumber', label: 'RERA number', icon: 'bi-award' },
      { key: 'gstin', label: 'GSTIN', icon: 'bi-receipt' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & presence',
    hint: 'How buyers and reviewers reach you.',
    icon: 'bi-geo-alt',
    fields: [
      { key: 'website', label: 'Website', icon: 'bi-globe2' },
      { key: 'address', label: 'Office address', icon: 'bi-pin-map' },
      { key: 'city', label: 'City', icon: 'bi-geo', valueKey: 'cityName' },
    ],
  },
  {
    id: 'about',
    title: 'About your company',
    hint: 'Portfolio, values, and expertise.',
    icon: 'bi-card-text',
    fields: [
      { key: 'about', label: 'Company description', icon: 'bi-pencil-square', multiline: true },
    ],
  },
];

export const BUILDER_PROFILE_FIELD_WEIGHTS = {
  companyName: 2,
  legalName: 1,
  reraNumber: 2,
  gstin: 1,
  website: 1,
  address: 1,
  yearEstablished: 1,
  about: 2,
};

export function getBuilderProfileCompleteness(profile) {
  const entries = Object.entries(BUILDER_PROFILE_FIELD_WEIGHTS);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const filled = entries.reduce((sum, [key, weight]) => {
    const value = profile?.[key];
    const filledField = value != null && String(value).trim() !== '';
    return sum + (filledField ? weight : 0);
  }, 0);
  return Math.round((filled / total) * 100);
}

export function getInitials(name) {
  if (!name) return 'B';
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'B'
  );
}


export function formatProfileValue(key, profile) {
  if (key === 'city') {
    return profile?.city?.name || profile?.cityName || '—';
  }
  const value = profile?.[key];
  if (value == null || String(value).trim() === '') return '—';
  return value;
}

export function profileToForm(profile) {
  return {
    companyName: profile?.companyName || '',
    legalName: profile?.legalName || '',
    reraNumber: profile?.reraNumber || '',
    gstin: profile?.gstin || '',
    website: profile?.website || '',
    about: profile?.about || '',
    address: profile?.address || '',
    yearEstablished: profile?.yearEstablished ?? '',
    cityId: profile?.city?.id || '',
  };
}
