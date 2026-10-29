import { asyncHandler } from '../utils/http.utils';
import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IUploadController, UploadController } from '../controllers/upload.controller';
import { upload, uploadImage } from '../services/upload.service';

const uploadController: IUploadController = new UploadController()

const router = Router();

router.post('/video/:uid', upload.single('video'), asyncHandler((req, res) => uploadController.videoUpload(req, res)))

router.post('/image/:uid', uploadImage.single('image'), asyncHandler((req, res) => uploadController.imageUpload(req, res)))

export default router
