import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IQrCodeController, QrCodeController } from '../controllers/qrcode.controller';

const qrCodeController: IQrCodeController = new QrCodeController()

const router = Router();

router.get('/', (req, res) => qrCodeController.getAll(req, res))
router.get('/qr-code/:id', (req, res) => qrCodeController.getQrCode(req, res))
router.get('/with-options', (req, res) => qrCodeController.getAllWithOptions(req, res))
router.get('/:id', (req, res) => qrCodeController.findById(req, res))
router.put('/:id', (req, res) => qrCodeController.update(req, res))
router.post('/', (req, res) => qrCodeController.add(req, res))
router.delete('/:id', (req, res) => qrCodeController.remove(req, res))
router.get('/videos/:id', (req, res) => qrCodeController.getVideo(req, res))
router.get('/play-video/:id', (req, res) => qrCodeController.playVideo(req, res))


export default router;
