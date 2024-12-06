import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IFileController, FileController } from '../controllers/file.controller';

const fileController: IFileController = new FileController()

const router = Router();

router.get('/', (req, res) => fileController.getAll(req, res))
router.get('/:id', (req, res) => fileController.findById(req, res))
router.put('/:id', (req, res) => fileController.update(req, res))
router.post('/', (req, res) => fileController.add(req, res))
router.delete('/', (req, res) => fileController.remove(req, res))

export default router;
