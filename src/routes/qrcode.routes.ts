import { createDynamicCode, editDynamicCode } from '../controllers/dynamic-qrcode.controller';
import { asyncHandler } from '../utils/http.utils';
import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IQrCodeController, QrCodeController } from '../controllers/qrcode.controller';

const qrCodeController: IQrCodeController = new QrCodeController()

const router = Router();

router.post('/dynamic', asyncHandler(createDynamicCode));
router.patch('/:id', asyncHandler(editDynamicCode));

router.get('/', asyncHandler((req, res) => qrCodeController.getAll(req, res)))
router.get('/qr-code/:id', asyncHandler((req, res) => qrCodeController.getQrCode(req, res)))
router.get('/with-options', asyncHandler((req, res) => qrCodeController.getAllWithOptions(req, res)))
router.get('/:id', asyncHandler((req, res) => qrCodeController.findById(req, res)))
router.put('/:id', asyncHandler((req, res) => qrCodeController.update(req, res)))
router.post('/', asyncHandler((req, res) => qrCodeController.add(req, res)))
router.delete('/:id', asyncHandler((req, res) => qrCodeController.remove(req, res)))
router.get('/videos/:type/:qid', asyncHandler((req, res) => qrCodeController.getVideo(req, res)))
router.get('/play-video/:qid', asyncHandler((req, res) => qrCodeController.playVideo(req, res)))


export default router;
