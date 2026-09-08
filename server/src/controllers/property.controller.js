import * as propertyService from '../services/property.service.js';
import * as propertyReviewService from '../services/propertyReview.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const search = asyncHandler(async (req, res) => {
  const result = await propertyService.searchProperties(req.query);
  return ApiResponse.success(res, result.items, 'Properties fetched', 200, result.meta);
});

export const mine = asyncHandler(async (req, res) => {
  const result = await propertyService.searchProperties({
    ...req.query,
    mineUserId: req.user.id,
  });
  return ApiResponse.success(res, result.items, 'My properties', 200, result.meta);
});

export const mineStats = asyncHandler(async (req, res) => {
  const data = await propertyService.getMyPropertyStats(req.user.id);
  return ApiResponse.success(res, data);
});

export const adminList = asyncHandler(async (req, res) => {
  const result = await propertyService.searchProperties({
    ...req.query,
    admin: true,
  });
  return ApiResponse.success(res, result.items, 'Properties fetched', 200, result.meta);
});

export const getBySlug = asyncHandler(async (req, res) => {
  const data = await propertyService.getPropertyBySlug(req.params.slug);
  return ApiResponse.success(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const isStaff = req.user && ['SUPER_ADMIN', 'ADMIN'].includes(req.user.roleCode);
  const data = await propertyService.getPropertyByUuid(req.params.uuid, {
    includePrivate: true,
  });

  if (data.status !== 'approved') {
    const isOwner = req.user && data.listedBy?.id === req.user.uuid;
    if (!isStaff && !isOwner) {
      throw new ApiError(404, 'Property not found');
    }
  }

  return ApiResponse.success(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = await propertyService.createProperty(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Property created');
});

export const update = asyncHandler(async (req, res) => {
  const data = await propertyService.updateProperty(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Property updated');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const data = await propertyService.updatePropertyStatus(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Status updated');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await propertyService.softDeleteProperty(req.params.uuid, req.user, req);
  return ApiResponse.success(res, data);
});

export const uploadMedia = asyncHandler(async (req, res) => {
  const data = await propertyService.addPropertyMedia(
    req.params.uuid,
    req.files,
    {
      mediaType: req.body.mediaType || 'image',
      isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true,
    },
    req.user,
    req
  );
  return ApiResponse.created(res, data, 'Media uploaded');
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const data = await propertyService.deletePropertyMedia(
    req.params.uuid,
    req.params.mediaUuid,
    req.user,
    req
  );
  return ApiResponse.success(res, data);
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const data = await propertyService.toggleWishlist(req.user.id, req.params.uuid);
  return ApiResponse.success(res, data);
});

export const listWishlist = asyncHandler(async (req, res) => {
  const data = await propertyService.listWishlist(req.user.id, {
    sort: req.query.sort,
    kind: req.query.kind,
  });
  return ApiResponse.success(res, data.items, 'Wishlist', 200, data.meta);
});

export const toggleCompare = asyncHandler(async (req, res) => {
  const data = await propertyService.toggleCompare(req.user.id, req.params.uuid);
  return ApiResponse.success(res, data);
});

export const listCompare = asyncHandler(async (req, res) => {
  const data = await propertyService.listCompare(req.user.id);
  return ApiResponse.success(res, data.items, 'Compare list', 200, data.meta);
});

export const removeCompare = asyncHandler(async (req, res) => {
  const data = await propertyService.removeCompare(req.user.id, req.params.uuid);
  return ApiResponse.success(res, data.items, 'Removed from compare', 200, data.meta);
});

export const clearCompare = asyncHandler(async (req, res) => {
  const data = await propertyService.clearCompare(req.user.id);
  return ApiResponse.success(res, data.items, 'Compare cleared', 200, data.meta);
});

export const getPropertyReview = asyncHandler(async (req, res) => {
  let data = await propertyReviewService.getPropertyReview(req.params.uuid);
  if (!data) {
    const property = await propertyService.getPropertyByUuid(req.params.uuid, {
      includePrivate: true,
    });
    if (property.status === 'pending') {
      data = await propertyReviewService.createReviewSession(req.params.uuid);
    }
  }
  return ApiResponse.success(res, data);
});

export const completePropertyReview = asyncHandler(async (req, res) => {
  await propertyReviewService.completePropertyReview(req.params.uuid, req.body, req.user);
  const property = await propertyService.getPropertyByUuid(req.params.uuid, {
    includePrivate: true,
  });
  return ApiResponse.success(res, property, 'Review completed');
});
