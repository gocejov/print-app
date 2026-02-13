"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const base_controller_1 = require("./base.controller");
const product_model_1 = require("../models/product.model");
const product_service_1 = require("../services/product.service");
const file_service_1 = require("../services/file.service");
class ProductController extends base_controller_1.BaseController {
    constructor() {
        super(new product_service_1.ProductService());
        this.fileService = new file_service_1.FileService();
    }
    getAllWithOptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryOptions = {
                populate: ['owner', 'createdBy', 'file'],
                // $or: [{ id: "desired_id" }, { alias: "desired_alias" }]
            };
            const products = yield this.service.getAll(queryOptions);
            res.json(products);
        });
    }
    createProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, fileId } = req.body;
            try {
                const file = yield this.fileService.findById(fileId);
                if (!file) {
                    res.status(404).json({ message: 'File not found' });
                    return;
                }
                const productData = {
                    file: file.id,
                    url: file.path,
                    owner: userId,
                    createdBy: userId,
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                const product = yield this.service.add(new product_model_1.ProductModel(productData));
                res.status(200).json({ message: 'Product created successfully', product: product });
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.ProductController = ProductController;
