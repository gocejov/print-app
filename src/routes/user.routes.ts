import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { limitAuthAttempts, requireAuth } from '../middlewares/auth.middleware';
import { managementAccess } from '../middlewares/management.middleware';
import { asyncHandler } from '../utils/http.utils';

const controller = new UserController();
const router = Router();

router.post('/', limitAuthAttempts, asyncHandler((req, res) => controller.add(req, res)));
router.post('/login', limitAuthAttempts, asyncHandler((req, res) => controller.login(req, res)));
router.post('/logout', asyncHandler((req, res) => controller.logout(req, res)));
router.use(requireAuth);
router.get('/me', (req, res) => { res.json(res.locals.user); });
router.use(managementAccess('users'));
router.get('/', asyncHandler((req, res) => controller.getAll(req, res)));
router.get('/:id', asyncHandler((req, res) => controller.findById(req, res)));
router.put('/:id', asyncHandler((req, res) => controller.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => controller.remove(req, res)));

export default router;
