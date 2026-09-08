import { body, param, query as q } from 'express-validator';
import { validate } from './auth.validator.js';

export { validate };

export const countryRules = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('iso2').trim().isLength({ min: 2, max: 2 }),
  body('phoneCode').optional({ nullable: true }).isLength({ max: 10 }),
  body('isActive').optional().isBoolean(),
];

export const stateRules = [
  body('countryId').isUUID(),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('code').optional({ nullable: true }).isLength({ max: 20 }),
  body('isActive').optional().isBoolean(),
];

export const cityRules = [
  body('stateId').isUUID(),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('slug').optional({ nullable: true }).isLength({ max: 120 }),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body('isActive').optional().isBoolean(),
];

export const localityRules = [
  body('cityId').isUUID(),
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('slug').optional({ nullable: true }).isLength({ max: 180 }),
  body('pincode').optional({ nullable: true }).isLength({ max: 12 }),
  body('isActive').optional().isBoolean(),
];

export const amenityRules = [
  body('code').trim().notEmpty().isLength({ max: 50 }),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('icon').optional({ nullable: true }).isLength({ max: 100 }),
  body('category').optional().isIn(['internal', 'external', 'nearby']),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const categoryRules = [
  body('code').trim().notEmpty().isLength({ max: 50 }),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).isLength({ max: 255 }),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const typeRules = [
  body('categoryId').isUUID(),
  body('code').trim().notEmpty().isLength({ max: 50 }),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

export const propertyRules = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
  body('description').trim().notEmpty().isLength({ min: 20 }),
  body('categoryId').isUUID(),
  body('propertyTypeId').isUUID(),
  body('purpose').isIn(['sale', 'rent', 'lease', 'pg']),
  body('price').isFloat({ gt: 0 }),
  body('priceNegotiable').optional().isBoolean(),
  body('area').isFloat({ gt: 0 }),
  body('areaUnitId').isInt({ gt: 0 }),
  body('carpetArea').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('bedrooms').optional({ nullable: true }).isInt({ min: 0, max: 50 }),
  body('bathrooms').optional({ nullable: true }).isInt({ min: 0, max: 50 }),
  body('balconies').optional({ nullable: true }).isInt({ min: 0, max: 20 }),
  body('parking').optional({ nullable: true }).isInt({ min: 0, max: 50 }),
  body('facingId').optional({ nullable: true }).isInt({ gt: 0 }),
  body('furnishingId').optional({ nullable: true }).isInt({ gt: 0 }),
  body('ownershipId').optional({ nullable: true }).isInt({ gt: 0 }),
  body('constructionStatusId').optional({ nullable: true }).isInt({ gt: 0 }),
  body('floorNumber').optional({ nullable: true }).isInt(),
  body('totalFloors').optional({ nullable: true }).isInt({ min: 0 }),
  body('ageYears').optional({ nullable: true }).isInt({ min: 0 }),
  body('countryId').isUUID(),
  body('stateId').isUUID(),
  body('cityId').isUUID(),
  body('localityId').optional({ nullable: true }).isUUID(),
  body('addressLine').trim().notEmpty().isLength({ max: 500 }),
  body('landmark').optional({ nullable: true }).isLength({ max: 255 }),
  body('pincode').optional({ nullable: true }).isLength({ max: 12 }),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body('amenityIds').optional().isArray(),
  body('amenityIds.*').optional().isUUID(),
  body('plotAmenities').optional({ nullable: true }).isObject(),
  body('plotAmenities.*').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('nearbyPlaces').optional().isArray(),
  body('submit').optional().isBoolean(),
  body('metaTitle').optional({ nullable: true }).isLength({ max: 255 }),
  body('metaDescription').optional({ nullable: true }).isLength({ max: 500 }),
  body('metaKeywords').optional({ nullable: true }).isLength({ max: 255 }),
];

export const propertyStatusRules = [
  param('uuid').isUUID(),
  body('status').isIn(['draft', 'pending', 'approved', 'rejected', 'sold', 'rented', 'archived']),
  body('rejectionReason').optional({ nullable: true }).isString(),
];

export const propertySearchRules = [
  q('page').optional().isInt({ min: 1 }),
  q('limit').optional().isInt({ min: 1, max: 50 }),
  q('purpose').optional().isIn(['sale', 'rent', 'lease', 'pg']),
  q('sort').optional().isIn(['price_asc', 'price_desc', 'newest', 'rating_desc', 'rating_asc']),
  q('kind').optional().isIn(['property', 'plot']),
];
