import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';

const router = Router();

router.get('/', authenticate, authorize('dashboard.view'), dashboardController.getDashboard);

export default router;
