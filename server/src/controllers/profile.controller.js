import * as profileService from '../services/profile.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getMyProfile = asyncHandler(async (req, res) => {
  const data = await profileService.getMyProfile(req.user);
  return ApiResponse.success(res, data);
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const data = await profileService.updateMyProfile(req.user, req.body, req);
  return ApiResponse.success(res, data, 'Profile updated');
});

export const submitVerification = asyncHandler(async (req, res) => {
  const data = await profileService.submitVerification(req.user, req.body, req);
  return ApiResponse.created(res, data, 'Verification submitted');
});

export const listMyVerifications = asyncHandler(async (req, res) => {
  const data = await profileService.listMyVerifications(req.user);
  return ApiResponse.success(res, data);
});

export const listVerificationQueue = asyncHandler(async (req, res) => {
  const result = await profileService.listVerificationQueue({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status,
  });
  return ApiResponse.success(res, result.items, 'Verification queue', 200, result.meta);
});

export const reviewVerification = asyncHandler(async (req, res) => {
  const data = await profileService.reviewVerification(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Verification reviewed');
});
