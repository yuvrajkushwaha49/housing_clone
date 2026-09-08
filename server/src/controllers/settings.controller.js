import * as settingsService from '../services/settings.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const data = await settingsService.getPublicSettings();
  return ApiResponse.success(res, data);
});

export const listSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.listSettings({ group: req.query.group });
  return ApiResponse.success(res, data);
});

export const upsertSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.upsertSettings(req.body.settings || [], req.user, req);
  return ApiResponse.success(res, data, 'Settings saved');
});
