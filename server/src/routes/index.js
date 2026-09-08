import { Router } from 'express';
import authRoutes from './auth.routes.js';
import rbacRoutes from './rbac.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import mastersRoutes from './masters.routes.js';
import propertyRoutes from './property.routes.js';
import leadRoutes from './lead.routes.js';
import engagementRoutes from './engagement.routes.js';
import platformRoutes from './platform.routes.js';
import projectRoutes from './project.routes.js';
import profileRoutes from './profile.routes.js';
import settingsRoutes from './settings.routes.js';
import ApiResponse from '../utils/ApiResponse.js';

const router = Router();

router.get('/health', (_req, res) =>
  ApiResponse.success(res, {
    status: 'ok',
    service: 'hous-api',
    timestamp: new Date().toISOString(),
  })
);

router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/masters', mastersRoutes);
router.use('/properties', propertyRoutes);
router.use('/', leadRoutes);
router.use('/', engagementRoutes);
router.use('/', platformRoutes);
router.use('/', projectRoutes);
router.use('/', profileRoutes);
router.use('/', settingsRoutes);

export default router;
