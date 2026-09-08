import * as chatService from '../services/chat.service.js';
import * as reviewService from '../services/review.service.js';
import * as supportService from '../services/support.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listConversations = asyncHandler(async (req, res) => {
  const data = await chatService.listConversations(req.user.id);
  return ApiResponse.success(res, data);
});

export const startConversation = asyncHandler(async (req, res) => {
  const data = await chatService.startConversation(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Conversation started');
});

export const getConversation = asyncHandler(async (req, res) => {
  const data = await chatService.getConversation(req.params.uuid, req.user.id);
  return ApiResponse.success(res, data);
});

export const listMessages = asyncHandler(async (req, res) => {
  const result = await chatService.listMessages(req.params.uuid, req.user.id, {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 50),
  });
  return ApiResponse.success(res, result.items, 'Messages', 200, result.meta);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const data = await chatService.sendMessage(
    req.params.uuid,
    req.user,
    req.body,
    { req }
  );
  return ApiResponse.created(res, data, 'Message sent');
});

export const createReview = asyncHandler(async (req, res) => {
  const data = await reviewService.createReview(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Review submitted for moderation');
});

export const listPropertyReviews = asyncHandler(async (req, res) => {
  const data = await reviewService.listPropertyReviews(req.params.propertyUuid);
  return ApiResponse.success(res, data);
});

export const listMyReviews = asyncHandler(async (req, res) => {
  const data = await reviewService.listMyReviews(req.user.id);
  return ApiResponse.success(res, data);
});

export const listPendingReviews = asyncHandler(async (req, res) => {
  const data = await reviewService.listPendingReviews({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
  });
  return ApiResponse.success(res, data.items, 'Pending reviews', 200, data.meta);
});

export const moderateReview = asyncHandler(async (req, res) => {
  const data = await reviewService.moderateReview(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Review moderated');
});

export const createTicket = asyncHandler(async (req, res) => {
  const data = await supportService.createTicket(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Ticket created');
});

export const listTickets = asyncHandler(async (req, res) => {
  const result = await supportService.listTickets(req.user, req.query);
  return ApiResponse.success(res, result.items, 'Tickets', 200, result.meta);
});

export const getTicket = asyncHandler(async (req, res) => {
  const data = await supportService.getTicket(req.params.uuid, req.user);
  return ApiResponse.success(res, data);
});

export const addTicketMessage = asyncHandler(async (req, res) => {
  const data = await supportService.addTicketMessage(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Message added');
});

export const updateTicket = asyncHandler(async (req, res) => {
  const data = await supportService.updateTicket(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Ticket updated');
});

export const listFaqs = asyncHandler(async (req, res) => {
  const data = await supportService.listFaqs({
    activeOnly: req.query.activeOnly !== 'false',
  });
  return ApiResponse.success(res, data);
});

export const createFaq = asyncHandler(async (req, res) => {
  const data = await supportService.createFaq(req.body, req.user, req);
  return ApiResponse.created(res, data, 'FAQ created');
});

export const createComplaint = asyncHandler(async (req, res) => {
  const data = await supportService.createComplaint(req.body, req.user, req);
  return ApiResponse.created(res, data, data.message);
});

export const listComplaints = asyncHandler(async (req, res) => {
  const data = await supportService.listComplaints(req.user, req.query);
  return ApiResponse.success(res, data);
});
