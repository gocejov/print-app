import { Router } from 'express';
// import userControler from '../controllers/user.controller';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IUserController, UserController } from '../controllers/user.controller';

const userController: IUserController = new UserController()

const router = Router();

router.get('/', (req, res) => userController.getAll(req, res))
router.get('/:id', (req, res) => userController.findById(req, res))
router.put('/:id', (req, res) => userController.update(req, res))
router.post('/', (req, res) => userController.add(req, res))
router.delete('/', (req, res) => userController.remove(req, res))

export default router;
