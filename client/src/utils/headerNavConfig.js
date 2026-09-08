function findTypeId(types, { code, pattern }) {
  if (code) {
    const match = types.find((t) => t.code === code);
    if (match) return match.id;
  }
  if (pattern) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const match = types.find((t) => re.test(t.name));
    if (match) return match.id;
  }
  return null;
}

function buildSearchUrl(searchPath, cityId, params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') sp.set(key, String(value));
  });
  if (cityId) sp.set('cityId', cityId);
  const query = sp.toString();
  return query ? `${searchPath}?${query}` : searchPath;
}

function propertyTypeItems(searchPath, cityId, purpose, types, categories) {
  const commercial = categories.find((c) => c.code === 'commercial');
  const defs = [
    { label: 'Flats', icon: 'bi-building', code: 'apartment', pattern: 'flat|apartment' },
    { label: 'Houses', icon: 'bi-house', code: 'house', pattern: 'house|independent' },
    { label: 'Builder floors', icon: 'bi-layers', pattern: 'builder floor|floor' },
    { label: 'Villas', icon: 'bi-house-door', code: 'villa', pattern: 'villa' },
    {
      label: 'Commercial properties',
      icon: 'bi-shop',
      categoryId: commercial?.id,
      pattern: 'commercial|office|shop',
    },
  ];

  return defs.map((item) => {
    const propertyTypeId = findTypeId(types, { code: item.code, pattern: item.pattern });
    const params = { purpose };
    if (item.categoryId) params.categoryId = item.categoryId;
    else if (propertyTypeId) params.propertyTypeId = propertyTypeId;
    return {
      label: item.label,
      icon: item.icon,
      to: buildSearchUrl(searchPath, cityId, params),
    };
  });
}

function bhkItems(searchPath, cityId, purpose, labelSuffix = 'Flats') {
  const options = [
    { label: `1 RK ${labelSuffix}`, bedrooms: '0' },
    { label: `1 BHK ${labelSuffix}`, bedrooms: '1' },
    { label: `2 BHK ${labelSuffix}`, bedrooms: '2' },
    { label: `3 BHK ${labelSuffix}`, bedrooms: '3' },
    { label: `1 BHK Houses`, bedrooms: '1', suffix: 'house' },
    { label: `2 BHK Houses`, bedrooms: '2', suffix: 'house' },
  ];

  return options.map((item) => {
    const params = { purpose, bedrooms: item.bedrooms };
    if (item.suffix === 'house') {
      return {
        label: item.label,
        to: buildSearchUrl(searchPath, cityId, params),
      };
    }
    return {
      label: item.label,
      to: buildSearchUrl(searchPath, cityId, params),
    };
  });
}

function localityItems(searchPath, cityId, purpose, localities) {
  return localities.slice(0, 6).map((locality) => ({
    label: locality.name,
    to: buildSearchUrl(searchPath, cityId, { purpose, localityId: locality.id }),
  }));
}

export function buildHeaderMegaMenus({
  searchPath = '/search',
  cityId,
  localities = [],
  types = [],
  categories = [],
  isBuyerPanel = false,
}) {
  const popularRentSearches = [
  { label: 'Flats for rent without brokerage', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'no brokerage' }) },
  { label: 'Houses for rent without brokerage', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'house no brokerage' }) },
  { label: 'Fully furnished houses for rent', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'furnished house' }) },
  { label: 'Fully furnished flats for rent', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'furnished flat' }) },
  { label: 'Semi furnished flats for rent', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'semi furnished' }) },
  { label: 'Unfurnished flats for rent', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent', q: 'unfurnished' }) },
  ];

  const popularBuySearches = [
    { label: 'Ready to move flats', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale', q: 'ready to move' }) },
    { label: 'Under construction projects', to: '/projects' },
    { label: 'Affordable housing', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale', maxPrice: '5000000' }) },
    { label: 'Luxury homes', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale', minPrice: '20000000' }) },
    { label: 'Plots / land for sale', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale', propertyTypeId: findTypeId(types, { code: 'plot', pattern: 'plot|land' }) }) },
    { label: 'Commercial spaces', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale', categoryId: categories.find((c) => c.code === 'commercial')?.id }) },
  ];

  return {
    buyers: {
      id: 'buyers',
      label: 'For Buyers',
      to: buildSearchUrl(searchPath, cityId, { purpose: 'sale' }),
      columns: [
        {
          title: 'Property type',
          variant: 'icons',
          items: propertyTypeItems(searchPath, cityId, 'sale', types, categories),
        },
        {
          title: 'Popular areas',
          items: localityItems(searchPath, cityId, 'sale', localities),
        },
        {
          title: 'Search by BHK',
          items: bhkItems(searchPath, cityId, 'sale'),
        },
        {
          title: 'Popular searches',
          items: popularBuySearches,
        },
      ],
    },
    tenants: {
      id: 'tenants',
      label: 'For Tenants',
      to: buildSearchUrl(searchPath, cityId, { purpose: 'rent' }),
      columns: [
        {
          title: 'Property type',
          variant: 'icons',
          items: propertyTypeItems(searchPath, cityId, 'rent', types, categories),
        },
        {
          title: 'Popular areas',
          items: localityItems(searchPath, cityId, 'rent', localities),
        },
        {
          title: 'Search by BHK',
          items: bhkItems(searchPath, cityId, 'rent'),
        },
        {
          title: 'Popular searches',
          items: popularRentSearches,
        },
      ],
    },
    sellers: {
      id: 'sellers',
      label: 'For Sellers',
      to: '/register?role=OWNER',
      columns: [
        {
          title: 'List your property',
          variant: 'icons',
          items: [
            { label: 'Post property FREE', icon: 'bi-megaphone', to: '/register?role=OWNER' },
            { label: 'Post plot / land', icon: 'bi-pin-map', to: '/register?role=OWNER' },
            { label: 'Register as agent', icon: 'bi-person-badge', to: '/register?role=AGENT' },
            { label: 'Register as builder', icon: 'bi-buildings', to: '/register?role=BUILDER' },
          ],
        },
        {
          title: 'Seller tools',
          items: [
            { label: 'How listing works', to: '/blog' },
            { label: 'Property valuation tips', to: '/blog' },
            { label: 'RERA guidelines', to: '/blog' },
          ],
        },
        {
          title: 'Get started',
          items: [
            { label: 'Create seller account', to: '/register?role=OWNER' },
            { label: 'Sign in to dashboard', to: '/login' },
          ],
        },
      ],
    },
    services: {
      id: 'services',
      label: 'Services',
      to: '/projects',
      columns: [
        {
          title: 'Explore',
          variant: 'icons',
          items: [
            { label: 'New projects', icon: 'bi-buildings', to: '/projects' },
            { label: 'Search properties', icon: 'bi-search', to: buildSearchUrl(searchPath, cityId, { purpose: 'sale' }) },
            { label: 'Rent homes', icon: 'bi-key', to: buildSearchUrl(searchPath, cityId, { purpose: 'rent' }) },
            { label: 'PG & co-living', icon: 'bi-people', to: buildSearchUrl(searchPath, cityId, { purpose: 'pg' }) },
          ],
        },
        {
          title: 'Tools',
          items: [
            { label: 'Loan calculator', to: isBuyerPanel ? '/panel/buyer/loan-calculator' : '/login' },
            { label: 'Compare properties', to: isBuyerPanel ? '/panel/buyer/compare' : '/register' },
            { label: 'Saved listings', to: isBuyerPanel ? '/panel/buyer/saved' : '/login' },
          ],
        },
        {
          title: 'Support',
          items: [
            { label: 'FAQ', to: isBuyerPanel ? '/panel/buyer/faq' : '/login' },
            { label: 'Contact support', to: isBuyerPanel ? '/panel/buyer/tickets' : '/login' },
          ],
        },
      ],
    },
    news: {
      id: 'news',
      label: 'News & Guide',
      to: '/blog',
      columns: [
        {
          title: 'Guides',
          items: [
            { label: 'Home buying guide', to: '/blog' },
            { label: 'Renting tips', to: '/blog' },
            { label: 'Investment insights', to: '/blog' },
            { label: 'Legal & documentation', to: '/blog' },
          ],
        },
        {
          title: 'Topics',
          items: [
            { label: 'Market trends', to: '/blog' },
            { label: 'Interior & decor', to: '/blog' },
            { label: 'Home loans', to: '/blog' },
            { label: 'Neighbourhood guides', to: '/blog' },
          ],
        },
        {
          title: 'Read more',
          items: [{ label: 'View all articles', to: '/blog' }],
        },
      ],
    },
  };
}

export const HEADER_NAV_ITEMS = [
  { id: 'buyers', label: 'For Buyers' },
  { id: 'tenants', label: 'For Tenants' },
  { id: 'sellers', label: 'For Sellers' },
  { id: 'services', label: 'Services' },
  { id: 'news', label: 'News & Guide' },
];
