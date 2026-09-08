import * as authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import config from '../config/index.js';

const REFRESH_COOKIE = 'hous_refresh_token';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'strict' : 'lax',
    maxAge: config.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  return ApiResponse.created(res, result.user, result.message);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, {
    accessToken: result.accessToken,
    user: result.user,
  }, 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
  const result = await authService.refresh(token, req);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, {
    accessToken: result.accessToken,
    user: result.user,
  }, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
  await authService.logout(token, req.user?.id || null);
  clearRefreshCookie(res);
  return ApiResponse.success(res, null, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.uuid);
  return ApiResponse.success(res, user);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token);
  return ApiResponse.success(res, null, result.message);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerification(req.body.email);
  return ApiResponse.success(res, null, result.message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  return ApiResponse.success(res, null, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  return ApiResponse.success(res, null, result.message);
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.uuid,
    req.body.currentPassword,
    req.body.newPassword
  );
  clearRefreshCookie(res);
  return ApiResponse.success(res, null, result.message);
});

export const requestOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestOtp(req.body.email);
  return ApiResponse.success(res, null, result.message);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp, req);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, {
    accessToken: result.accessToken,
    user: result.user,
  }, 'OTP login successful');
});
