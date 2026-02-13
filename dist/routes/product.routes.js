"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { cacheMiddleware } from '../middlewares/cache.middleware';
const product_controller_1 = require("../controllers/product.controller");
const productController = new product_controller_1.ProductController();
const router = (0, express_1.Router)();
router.get('/', (req, res) => productController.getAll(req, res));
router.get('/with-options', (req, res) => productController.getAllWithOptions(req, res));
router.get('/:id', (req, res) => productController.findById(req, res));
router.put('/:id', (req, res) => productController.update(req, res));
router.post('/create/', (req, res) => productController.createProduct(req, res));
// router.post('/', (req, res) => productController.add(req, res))
router.delete('/:id', (req, res) => productController.remove(req, res));
exports.default = router;
