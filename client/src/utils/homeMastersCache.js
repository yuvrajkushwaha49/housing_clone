import { mastersService } from '../services';

let cache = null;
let inflight = null;

export async function getHomeMasters() {
  if (cache) {
    return cache;
  }

  if (!inflight) {
    inflight = Promise.all([
      mastersService.listCategories({ activeOnly: true }),
      mastersService.listTypes({ activeOnly: true }),
    ])
      .then(([categoriesRes, typesRes]) => {
        cache = {
          categories: categoriesRes.data.data || [],
          types: typesRes.data.data || [],
        };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function getCommercialCategoryId(categories = []) {
  const commercial = categories.find((c) => c.code === 'commercial');
  return commercial ? String(commercial.id) : '';
}

export function getPlotTypeId(types = []) {
  const plot = types.find((t) => t.code === 'plot');
  return plot ? String(plot.id) : '';
}

/** Maps home hero tabs (Buy / Rent / Commercial / PG / Plots) to search filters. */
export function resolveHeroTabFilters(tab, categories = [], types = []) {
  const commercialId = getCommercialCategoryId(categories);
  const plotTypeId = getPlotTypeId(types);

  if (tab === 'commercial') {
    return {
      purpose: 'sale',
      categoryId: commercialId || undefined,
      propertyTypeId: undefined,
      listingKind: 'property',
      label: 'Commercial',
    };
  }
  if (tab === 'plots') {
    return {
      purpose: 'sale',
      categoryId: undefined,
      propertyTypeId: plotTypeId || undefined,
      listingKind: 'plot',
      label: 'Plots',
    };
  }
  if (tab === 'pg') {
    return {
      purpose: 'pg',
      categoryId: undefined,
      propertyTypeId: undefined,
      listingKind: 'property',
      label: 'PG / Co-living',
    };
  }
  if (tab === 'rent') {
    return {
      purpose: 'rent',
      categoryId: undefined,
      propertyTypeId: undefined,
      listingKind: 'property',
      label: 'Rent',
    };
  }
  return {
    purpose: 'sale',
    categoryId: undefined,
    propertyTypeId: undefined,
    listingKind: 'property',
    label: 'Buy',
  };
}
