import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IProductController, ProductController } from '../controllers/product.controller';

const productController: IProductController = new ProductController()

const router = Router();

router.get('/', (req, res) => productController.getAll(req, res))
router.get('/with-options', (req, res) => productController.getAllWithOptions(req, res))
router.get('/:id', (req, res) => productController.findById(req, res))
router.put('/:id', (req, res) => productController.update(req, res))
router.post('/create/', (req, res) => productController.createProduct(req, res))
// router.post('/', (req, res) => productController.add(req, res))
router.delete('/:id', (req, res) => productController.remove(req, res))

export default router;
