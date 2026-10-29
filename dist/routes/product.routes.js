"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_utils_1 = require("../utils/http.utils");
const express_1 = require("express");
// import { cacheMiddleware } from '../middlewares/cache.middleware';
const product_controller_1 = require("../controllers/product.controller");
const productController = new product_controller_1.ProductController();
const router = (0, express_1.Router)();
router.get('/', (0, http_utils_1.asyncHandler)((req, res) => productController.getAll(req, res)));
router.get('/with-options', (0, http_utils_1.asyncHandler)((req, res) => productController.getAllWithOptions(req, res)));
router.get('/:id', (0, http_utils_1.asyncHandler)((req, res) => productController.findById(req, res)));
router.put('/:id', (0, http_utils_1.asyncHandler)((req, res) => productController.update(req, res)));
router.post('/create/', (0, http_utils_1.asyncHandler)((req, res) => productController.createProduct(req, res)));
// router.post('/', asyncHandler((req, res) => productController.add(req, res)))
router.delete('/:id', (0, http_utils_1.asyncHandler)((req, res) => productController.remove(req, res)));
exports.default = router;
