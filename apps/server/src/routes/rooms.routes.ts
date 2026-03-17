import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createRoomSchema, updateRoomSchema, joinRoomSchema } from '@classitin/shared';
import * as roomsController from '../controllers/rooms.controller.js';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

router.post('/', requireRole('TEACHER'), validate(createRoomSchema), roomsController.create);
router.get('/', roomsController.list);
router.get('/:roomId', roomsController.get);
router.put('/:roomId', requireRole('TEACHER'), validate(updateRoomSchema), roomsController.update);
router.delete('/:roomId', requireRole('TEACHER'), roomsController.remove);
router.post('/join', validate(joinRoomSchema), roomsController.join);
router.get('/:roomId/roster', roomsController.roster);
router.delete('/:roomId/enrollments/:enrollmentId', requireRole('TEACHER'), roomsController.removeEnrollment);

export default router;
