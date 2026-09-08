import * as locationService from '../services/location.service.js';
import * as amenityService from '../services/amenity.service.js';
import * as categoryService from '../services/category.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listCountries = asyncHandler(async (req, res) => {
  const data = await locationService.listCountries({
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createCountry = asyncHandler(async (req, res) => {
  const data = await locationService.createCountry(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'Country created');
});

export const updateCountry = asyncHandler(async (req, res) => {
  const data = await locationService.updateCountry(req.params.uuid, req.body, req.user.id, req);
  return ApiResponse.success(res, data, 'Country updated');
});

export const deleteCountry = asyncHandler(async (req, res) => {
  const data = await locationService.softDeleteByUuid('countries', req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listStates = asyncHandler(async (req, res) => {
  const data = await locationService.listStates(req.params.countryUuid, {
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createState = asyncHandler(async (req, res) => {
  const data = await locationService.createState(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'State created');
});

export const deleteState = asyncHandler(async (req, res) => {
  const data = await locationService.softDeleteByUuid('states', req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listCities = asyncHandler(async (req, res) => {
  const data = await locationService.listCities(req.params.stateUuid, {
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const listAllCities = asyncHandler(async (req, res) => {
  const data = await locationService.listAllCities({
    activeOnly: req.query.activeOnly === 'true',
    countryIso: req.query.countryIso || 'IN',
  });
  return ApiResponse.success(res, data);
});

export const createCity = asyncHandler(async (req, res) => {
  const data = await locationService.createCity(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'City created');
});

export const deleteCity = asyncHandler(async (req, res) => {
  const data = await locationService.softDeleteByUuid('cities', req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listLocalities = asyncHandler(async (req, res) => {
  const data = await locationService.listLocalities(req.params.cityUuid, {
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createLocality = asyncHandler(async (req, res) => {
  const data = await locationService.createLocality(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'Locality created');
});

export const deleteLocality = asyncHandler(async (req, res) => {
  const data = await locationService.softDeleteByUuid('localities', req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listAmenities = asyncHandler(async (req, res) => {
  const data = await amenityService.listAmenities({
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createAmenity = asyncHandler(async (req, res) => {
  const data = await amenityService.createAmenity(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'Amenity created');
});

export const updateAmenity = asyncHandler(async (req, res) => {
  const data = await amenityService.updateAmenity(req.params.uuid, req.body, req.user.id, req);
  return ApiResponse.success(res, data, 'Amenity updated');
});

export const deleteAmenity = asyncHandler(async (req, res) => {
  const data = await amenityService.deleteAmenity(req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listCategories = asyncHandler(async (req, res) => {
  const data = await categoryService.listCategories({
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = await categoryService.createCategory(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'Category created');
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = await categoryService.updateCategory(req.params.uuid, req.body, req.user.id, req);
  return ApiResponse.success(res, data, 'Category updated');
});

export const listTypes = asyncHandler(async (req, res) => {
  const data = await categoryService.listTypes(req.query.categoryId || null, {
    activeOnly: req.query.activeOnly === 'true',
  });
  return ApiResponse.success(res, data);
});

export const createType = asyncHandler(async (req, res) => {
  const data = await categoryService.createType(req.body, req.user.id, req);
  return ApiResponse.created(res, data, 'Property type created');
});

export const updateType = asyncHandler(async (req, res) => {
  const data = await categoryService.updateType(req.params.uuid, req.body, req.user.id, req);
  return ApiResponse.success(res, data, 'Property type updated');
});

export const getLookups = asyncHandler(async (_req, res) => {
  const data = await categoryService.getLookups();
  return ApiResponse.success(res, data);
});
