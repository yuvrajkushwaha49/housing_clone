import * as builderService from '../services/builder.service.js';
import * as projectService from '../services/project.service.js';
import * as projectReviewService from '../services/projectReview.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getMyBuilderProfile = asyncHandler(async (req, res) => {
  const data = await builderService.getOrCreateProfileForUser(req.user);
  return ApiResponse.success(res, data);
});

export const updateMyBuilderProfile = asyncHandler(async (req, res) => {
  const data = await builderService.updateProfile(req.user, req.body, req);
  return ApiResponse.success(res, data, 'Profile updated');
});

export const getBuilder = asyncHandler(async (req, res) => {
  const data = await builderService.getProfileByUuid(req.params.uuid);
  return ApiResponse.success(res, data);
});

export const listBuilders = asyncHandler(async (req, res) => {
  const result = await builderService.listBuilders({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    q: req.query.q,
  });
  return ApiResponse.success(res, result.items, 'Builders', 200, result.meta);
});

export const listTeam = asyncHandler(async (req, res) => {
  const data = await builderService.listTeam(req.user);
  return ApiResponse.success(res, data);
});

export const addTeamMember = asyncHandler(async (req, res) => {
  const data = await builderService.addTeamMember(req.user, req.body, req);
  return ApiResponse.created(res, data, 'Team member added');
});

export const removeTeamMember = asyncHandler(async (req, res) => {
  const data = await builderService.removeTeamMember(req.user, req.params.uuid, req);
  return ApiResponse.success(res, data, 'Team member removed');
});

export const listBuilderProfileChanges = asyncHandler(async (req, res) => {
  const result = await builderService.listProfileChangeQueue({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status ?? 'pending',
  });
  return ApiResponse.success(res, result.items, 'Builder profile changes', 200, result.meta);
});

export const reviewBuilderProfileChange = asyncHandler(async (req, res) => {
  const data = await builderService.reviewProfileChangeRequest(
    req.user,
    req.params.uuid,
    req.body,
    req
  );
  return ApiResponse.success(res, data, 'Profile change reviewed');
});

export const listProjects = asyncHandler(async (req, res) => {
  const result = await projectService.listProjects(
    {
      page: req.query.page,
      limit: req.query.limit,
      q: req.query.q,
      cityId: req.query.cityId,
      localityId: req.query.localityId,
      status: req.query.status,
      builderId: req.query.builderId,
    },
    req.user
  );
  return ApiResponse.success(res, result.items, 'Projects', 200, result.meta);
});

export const listMyProjects = asyncHandler(async (req, res) => {
  const result = await projectService.listProjects(
    {
      mine: true,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      cityId: req.query.cityId,
    },
    req.user
  );
  return ApiResponse.success(res, result.items, 'My projects', 200, result.meta);
});

export const myProjectStats = asyncHandler(async (req, res) => {
  const data = await projectService.getMyProjectStats(req.user);
  return ApiResponse.success(res, data);
});

export const adminListProjects = asyncHandler(async (req, res) => {
  const result = await projectService.listProjects(
    { admin: true, page: req.query.page, limit: req.query.limit, status: req.query.status, q: req.query.q },
    req.user
  );
  return ApiResponse.success(res, result.items, 'Projects', 200, result.meta);
});

export const getProjectBySlug = asyncHandler(async (req, res) => {
  const data = await projectService.getProjectBySlug(req.params.slug);
  return ApiResponse.success(res, data);
});

export const getProject = asyncHandler(async (req, res) => {
  const data = await projectService.getProjectByUuid(req.params.uuid, {
    includePrivate: Boolean(req.user),
    user: req.user,
  });
  return ApiResponse.success(res, data);
});

export const createProject = asyncHandler(async (req, res) => {
  const data = await projectService.createProject(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Project created');
});

export const updateProject = asyncHandler(async (req, res) => {
  const data = await projectService.updateProject(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Project updated');
});

export const updateProjectStatus = asyncHandler(async (req, res) => {
  const data = await projectService.updateProjectStatus(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Status updated');
});

export const getProjectReview = asyncHandler(async (req, res) => {
  let data = await projectReviewService.getProjectReview(req.params.uuid);
  if (!data) {
    const project = await projectService.getProjectByUuid(req.params.uuid, {
      includePrivate: true,
      user: req.user,
    });
    if (project.status === 'pending') {
      data = await projectReviewService.createReviewSession(req.params.uuid);
    }
  }
  return ApiResponse.success(res, data);
});

export const completeProjectReview = asyncHandler(async (req, res) => {
  await projectReviewService.completeProjectReview(req.params.uuid, req.body, req.user);
  const project = await projectService.getProjectByUuid(req.params.uuid, {
    includePrivate: true,
    user: req.user,
  });
  return ApiResponse.success(res, project, 'Review completed');
});

export const deleteProject = asyncHandler(async (req, res) => {
  const data = await projectService.softDeleteProject(req.params.uuid, req.user, req);
  return ApiResponse.success(res, data);
});

export const addTower = asyncHandler(async (req, res) => {
  const data = await projectService.addTower(req.params.uuid, req.body, req.user, req);
  return ApiResponse.created(res, data, 'Tower added');
});

export const updateTower = asyncHandler(async (req, res) => {
  const data = await projectService.updateTower(
    req.params.uuid,
    req.params.towerUuid,
    req.body,
    req.user
  );
  return ApiResponse.success(res, data, 'Tower updated');
});

export const deleteTower = asyncHandler(async (req, res) => {
  const data = await projectService.deleteTower(req.params.uuid, req.params.towerUuid, req.user);
  return ApiResponse.success(res, data, 'Tower removed');
});

export const addBuilding = asyncHandler(async (req, res) => {
  const data = await projectService.addBuilding(req.params.uuid, req.body, req.user);
  return ApiResponse.created(res, data, 'Building added');
});

export const updateBuilding = asyncHandler(async (req, res) => {
  const data = await projectService.updateBuilding(
    req.params.uuid,
    req.params.buildingUuid,
    req.body,
    req.user
  );
  return ApiResponse.success(res, data, 'Building updated');
});

export const deleteBuilding = asyncHandler(async (req, res) => {
  const data = await projectService.deleteBuilding(
    req.params.uuid,
    req.params.buildingUuid,
    req.user
  );
  return ApiResponse.success(res, data, 'Building removed');
});

export const addUnit = asyncHandler(async (req, res) => {
  const data = await projectService.addUnit(req.params.uuid, req.body, req.user);
  return ApiResponse.created(res, data, 'Unit added');
});

export const updateUnitStatus = asyncHandler(async (req, res) => {
  const data = await projectService.updateUnitStatus(req.params.unitUuid, req.body.status, req.user);
  return ApiResponse.success(res, data, 'Unit updated');
});

export const holdUnit = asyncHandler(async (req, res) => {
  const data = await projectService.holdUnit(req.params.unitUuid, req.user, {
    hours: Number(req.body.hours || 24),
  });
  return ApiResponse.created(res, data, 'Unit held');
});

export const releaseHold = asyncHandler(async (req, res) => {
  const data = await projectService.releaseHold(req.params.unitUuid, req.user);
  return ApiResponse.success(res, data, 'Hold released');
});

export const addProjectMedia = asyncHandler(async (req, res) => {
  const captions = Array.isArray(req.body.captions)
    ? req.body.captions
    : (req.body.captions ? [req.body.captions] : []);
  const data = await projectService.addProjectMedia(
    req.params.uuid,
    req.files,
    {
      mediaType: req.body.mediaType || 'image',
      isPrimary: req.body.isPrimary === 'true',
      captions,
    },
    req.user
  );
  return ApiResponse.created(res, data, 'Media uploaded');
});

export const updateProjectMedia = asyncHandler(async (req, res) => {
  const data = await projectService.updateProjectMedia(
    req.params.uuid,
    req.params.mediaUuid,
    { caption: req.body.caption },
    req.user
  );
  return ApiResponse.success(res, data, 'Media updated');
});

export const uploadProjectAmenityImage = asyncHandler(async (req, res) => {
  const data = await projectService.uploadProjectAmenityImage(
    req.params.uuid,
    req.params.amenityUuid,
    req.file,
    req.user
  );
  return ApiResponse.success(res, data, 'Amenity image uploaded');
});

export const deleteProjectMedia = asyncHandler(async (req, res) => {
  const data = await projectService.deleteProjectMedia(
    req.params.uuid,
    req.params.mediaUuid,
    req.user
  );
  return ApiResponse.success(res, data, 'Media deleted');
});

export const createBooking = asyncHandler(async (req, res) => {
  const data = await projectService.createBooking(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Booking requested');
});

export const listBookings = asyncHandler(async (req, res) => {
  const result = await projectService.listBookings(req.user, {
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    source: req.query.source,
    cityId: req.query.cityId,
    projectId: req.query.projectId,
    q: req.query.q,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  return ApiResponse.success(res, result.items, 'Bookings', 200, result.meta);
});

export const getBooking = asyncHandler(async (req, res) => {
  const data = await projectService.getBooking(req.params.uuid, req.user);
  return ApiResponse.success(res, data);
});

export const updateBooking = asyncHandler(async (req, res) => {
  const data = await projectService.updateBooking(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Booking updated');
});

export const toggleProjectWishlist = asyncHandler(async (req, res) => {
  const data = await projectService.toggleProjectWishlist(req.user.id, req.params.uuid);
  return ApiResponse.success(res, data);
});

export const listProjectWishlist = asyncHandler(async (req, res) => {
  const data = await projectService.listProjectWishlist(req.user.id);
  return ApiResponse.success(res, data.items, 'Saved projects', 200, data.meta);
});
