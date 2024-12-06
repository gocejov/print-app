import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IUploadController, UploadController } from '../controllers/upload.controller';
import { upload } from '../services/upload.service';

const uploadController: IUploadController = new UploadController()

const router = Router();

router.post('/video/:uid', upload.single('video'), (req, res) => uploadController.videoUpload(req, res))

export default router
