import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserSchema } from '@classitin/shared';
import * as usersController from '../controllers/users.controller.js';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

router.get('/:userId', usersController.get);
router.patch('/:userId', validate(updateUserSchema), usersController.update);

export default router;
