import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { registerSchema, loginSchema, refreshSchema } from './authSchemas.js';
import * as c from './authController.js';

const router = Router();
router.post('/register', validate(registerSchema), c.register);
router.post('/login', validate(loginSchema), c.login);
router.post('/refresh', validate(refreshSchema), c.refresh);
router.post('/logout', validate(refreshSchema), c.logout);
router.get('/me', requireAuth, c.me);

export default router;