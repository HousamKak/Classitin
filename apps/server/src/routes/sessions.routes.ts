import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createSessionSchema, updateSessionSchema } from '@classitin/shared';
import * as sessionsController from '../controllers/sessions.controller.js';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

router.post('/:roomId/sessions', requireRole('TEACHER'), validate(createSessionSchema), sessionsController.create);
router.patch('/:roomId/sessions/:sessionId', requireRole('TEACHER'), validate(updateSessionSchema), sessionsController.update);
router.get('/:roomId/sessions', sessionsController.list);
router.get('/:roomId/sessions/:sessionId', sessionsController.get);

export default router;
