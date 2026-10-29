import { asyncHandler } from '../utils/http.utils';
import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IFileController, FileController } from '../controllers/file.controller';

const fileController: IFileController = new FileController()

const router = Router();

router.get('/', asyncHandler((req, res) => fileController.getAll(req, res)))
router.get('/:id/content', asyncHandler((req, res, next) => fileController.content(req, res, next)))
router.get('/:id', asyncHandler((req, res) => fileController.findById(req, res)))
router.put('/:id', asyncHandler((req, res) => fileController.update(req, res)))
router.post('/', asyncHandler((req, res) => fileController.add(req, res)))
router.delete('/:id', asyncHandler((req, res) => fileController.remove(req, res)))

export default router;
