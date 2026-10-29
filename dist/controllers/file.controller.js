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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const base_controller_1 = require("./base.controller");
const file_model_1 = require("../models/file.model");
const file_service_1 = require("../services/file.service");
const product_model_1 = require("../models/product.model");
const qrcode_model_1 = require("../models/qrcode.model");
const http_utils_1 = require("../utils/http.utils");
const media_service_1 = require("../services/media.service");
class FileController extends base_controller_1.BaseController {
    constructor() {
        super(new file_service_1.FileService());
    }
    content(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = res.locals.record;
            if (!['image', 'video'].includes(String(file.type)))
                throw new http_utils_1.HttpError(400, 'URL files do not contain uploaded media');
            res.set('X-Content-Type-Options', 'nosniff').type(String(file.mimetype));
            res.sendFile((0, media_service_1.mediaPath)(file.path), (error) => {
                if (error)
                    next(error.code === 'ENOENT'
                        ? new http_utils_1.HttpError(404, 'Media not found')
                        : error);
            });
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield file_model_1.FileModel.findOneAndUpdate({ _id: req.params.id, createdBy: res.locals.user._id }, { $set: Object.assign(Object.assign({}, req.body), { updated_at: new Date() }) }, { new: true, runValidators: true });
            if (!file)
                throw new http_utils_1.HttpError(404, 'File not found');
            if (req.body.url !== undefined) {
                const products = yield product_model_1.ProductModel.find({
                    file: file._id,
                    createdBy: res.locals.user._id,
                }).select('_id');
                yield product_model_1.ProductModel.updateMany({ file: file._id, createdBy: res.locals.user._id }, { $set: { url: file.url, updated_at: new Date() } });
                yield qrcode_model_1.QrCodeModel.updateMany({
                    product: { $in: products.map((product) => product._id) },
                    createdBy: res.locals.user._id,
                }, { $unset: { destinationUrl: 1 }, $set: { updated_at: new Date() } });
            }
            res.json(file);
        });
    }
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield product_model_1.ProductModel.exists({ file: req.params.id }))
                throw new http_utils_1.HttpError(409, 'This file is attached to a product. Replace or delete that product first.');
            const file = yield file_model_1.FileModel.findOneAndDelete({
                _id: req.params.id,
                createdBy: res.locals.user._id,
            });
            if (!file)
                throw new http_utils_1.HttpError(404, 'File not found');
            if (file.path)
                yield promises_1.default.unlink((0, media_service_1.mediaPath)(file.path)).catch((error) => {
                    if (error.code !== 'ENOENT')
                        console.error('Could not remove uploaded media:', error);
                });
            res.json(file);
        });
    }
}
exports.FileController = FileController;
