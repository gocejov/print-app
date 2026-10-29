import { asyncHandler } from '../utils/http.utils';
import { Router } from 'express';
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IProductController, ProductController } from '../controllers/product.controller';

const productController: IProductController = new ProductController()

const router = Router();

router.get('/', asyncHandler((req, res) => productController.getAll(req, res)))
router.get('/with-options', asyncHandler((req, res) => productController.getAllWithOptions(req, res)))
router.get('/:id', asyncHandler((req, res) => productController.findById(req, res)))
router.put('/:id', asyncHandler((req, res) => productController.update(req, res)))
router.post('/create/', asyncHandler((req, res) => productController.createProduct(req, res)))
// router.post('/', asyncHandler((req, res) => productController.add(req, res)))
router.delete('/:id', asyncHandler((req, res) => productController.remove(req, res)))

export default router;
