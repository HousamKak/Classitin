import { Router } from 'express';
import authRoutes from './auth.routes.js';
import roomsRoutes from './rooms.routes.js';
import sessionsRoutes from './sessions.routes.js';
import usersRoutes from './users.routes.js';
import healthRoutes from './health.routes.js';

const router: ReturnType<typeof Router> = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomsRoutes);
router.use('/rooms', sessionsRoutes);
router.use('/users', usersRoutes);
router.use('/health', healthRoutes);

export default router;
