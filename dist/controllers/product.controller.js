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
const category_model_1 = require("../models/category.model");
const campaign_model_1 = require("../models/campaign.model");
const base_controller_1 = require("./base.controller");
const product_model_1 = require("../models/product.model");
const product_service_1 = require("../services/product.service");
const file_model_1 = require("../models/file.model");
const qrcode_model_1 = require("../models/qrcode.model");
const http_utils_1 = require("../utils/http.utils");
class ProductController extends base_controller_1.BaseController {
    constructor() {
        super(new product_service_1.ProductService());
    }
    getAllWithOptions(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.json(yield this.service.getAll(Object.assign(Object.assign({}, res.locals.scope), { populate: ['owner', 'createdBy', 'file'] })));
        });
    }
    createProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield file_model_1.FileModel.findOne({ _id: req.body.fileId, createdBy: res.locals.user._id });
            if (!file)
                throw new http_utils_1.HttpError(404, 'File not found');
            const product = yield product_model_1.ProductModel.create({
                displayMode: req.body.displayMode,
                mediaIds: req.body.mediaIds,
                actionLabel: req.body.actionLabel,
                actionUrl: req.body.actionUrl,
                name: req.body.name || file.name || file.originalname || 'Untitled product',
                description: req.body.description || '',
                file: file._id,
                url: file.type === 'web-url' ? file.url : file.path,
                owner: res.locals.user._id,
                createdBy: res.locals.user._id,
            });
            res.status(200).json({ message: 'Product created successfully', product });
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = Object.assign(Object.assign({}, req.body), { updated_at: new Date() });
            delete changes.fileId;
            if (req.body.fileId) {
                const file = yield file_model_1.FileModel.findOne({ _id: req.body.fileId, createdBy: res.locals.user._id });
                if (!file)
                    throw new http_utils_1.HttpError(404, 'File not found');
                changes.file = file._id;
                changes.url = file.type === 'web-url' ? file.url : file.path;
            }
            const product = yield product_model_1.ProductModel.findOneAndUpdate({ _id: req.params.id, createdBy: res.locals.user._id }, { $set: changes }, { new: true, runValidators: true });
            if (!product)
                throw new http_utils_1.HttpError(404, 'Product not found');
            if (req.body.fileId && String(res.locals.record.file) !== req.body.fileId) {
                yield qrcode_model_1.QrCodeModel.updateMany({ product: product._id, createdBy: res.locals.user._id }, {
                    $set: { file: String(product.file), updated_at: new Date() },
                    $unset: { destinationUrl: 1 },
                });
            }
            res.json(product);
        });
    }
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield category_model_1.CategoryModel.exists({ products: req.params.id })) ||
                (yield campaign_model_1.CampaignModel.exists({
                    entries: { $elemMatch: { kind: 'product', target: req.params.id } },
                })))
                throw new http_utils_1.HttpError(409, 'Remove this product from its categories and campaigns before deleting it');
            if (yield qrcode_model_1.QrCodeModel.exists({ product: req.params.id }))
                throw new http_utils_1.HttpError(409, 'This product is assigned to a QR code. Reassign or delete that QR code first.');
            const product = yield product_model_1.ProductModel.findOneAndDelete({
                _id: req.params.id,
                createdBy: res.locals.user._id,
            });
            if (!product)
                throw new http_utils_1.HttpError(404, 'Product not found');
            res.json(product);
        });
    }
}
exports.ProductController = ProductController;
