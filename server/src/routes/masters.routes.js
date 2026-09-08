import { Router } from 'express';
import * as mastersController from '../controllers/masters.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';
import {
  amenityRules,
  categoryRules,
  cityRules,
  countryRules,
  localityRules,
  stateRules,
  typeRules,
  validate,
} from '../validators/masters.validator.js';

const router = Router();

// Public reads
router.get('/countries', mastersController.listCountries);
router.get('/countries/:countryUuid/states', mastersController.listStates);
router.get('/cities', mastersController.listAllCities);
router.get('/states/:stateUuid/cities', mastersController.listCities);
router.get('/cities/:cityUuid/localities', mastersController.listLocalities);
router.get('/amenities', mastersController.listAmenities);
router.get('/categories', mastersController.listCategories);
router.get('/property-types', mastersController.listTypes);
router.get('/lookups', mastersController.getLookups);

// Admin writes
router.post(
  '/countries',
  authenticate,
  authorize('locations.manage'),
  countryRules,
  validate,
  mastersController.createCountry
);
router.put(
  '/countries/:uuid',
  authenticate,
  authorize('locations.manage'),
  mastersController.updateCountry
);
router.delete(
  '/countries/:uuid',
  authenticate,
  authorize('locations.manage'),
  mastersController.deleteCountry
);

router.post(
  '/states',
  authenticate,
  authorize('locations.manage'),
  stateRules,
  validate,
  mastersController.createState
);
router.delete(
  '/states/:uuid',
  authenticate,
  authorize('locations.manage'),
  mastersController.deleteState
);

router.post(
  '/cities',
  authenticate,
  authorize('locations.manage'),
  cityRules,
  validate,
  mastersController.createCity
);
router.delete(
  '/cities/:uuid',
  authenticate,
  authorize('locations.manage'),
  mastersController.deleteCity
);

router.post(
  '/localities',
  authenticate,
  authorize('locations.manage'),
  localityRules,
  validate,
  mastersController.createLocality
);
router.delete(
  '/localities/:uuid',
  authenticate,
  authorize('locations.manage'),
  mastersController.deleteLocality
);

router.post(
  '/amenities',
  authenticate,
  authorize('amenities.manage'),
  amenityRules,
  validate,
  mastersController.createAmenity
);
router.put(
  '/amenities/:uuid',
  authenticate,
  authorize('amenities.manage'),
  mastersController.updateAmenity
);
router.delete(
  '/amenities/:uuid',
  authenticate,
  authorize('amenities.manage'),
  mastersController.deleteAmenity
);

router.post(
  '/categories',
  authenticate,
  authorize('categories.manage'),
  categoryRules,
  validate,
  mastersController.createCategory
);
router.put(
  '/categories/:uuid',
  authenticate,
  authorize('categories.manage'),
  mastersController.updateCategory
);

router.post(
  '/property-types',
  authenticate,
  authorize('categories.manage'),
  typeRules,
  validate,
  mastersController.createType
);
router.put(
  '/property-types/:uuid',
  authenticate,
  authorize('categories.manage'),
  mastersController.updateType
);

export default router;
