import * as dashboardService from '../services/dashboard.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardStats(req.user.roleCode);
  return ApiResponse.success(res, data);
});
