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
exports.UploadController = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const file_model_1 = require("../models/file.model");
const http_utils_1 = require("../utils/http.utils");
class UploadController {
    videoUpload(req, res) {
        return this.save(req, res, 'video');
    }
    imageUpload(req, res) {
        return this.save(req, res, 'image');
    }
    save(req, res, type) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!req.file)
                throw new http_utils_1.HttpError(400, `An uploaded ${type} file is required`);
            try {
                if (type === 'image') {
                    const metadata = yield (0, sharp_1.default)(req.file.path, { limitInputPixels: 40000000 })
                        .metadata()
                        .catch(() => null);
                    const expected = {
                        'image/jpeg': 'jpeg',
                        'image/png': 'png',
                        'image/webp': 'webp',
                        'image/gif': 'gif',
                    };
                    if (!metadata || metadata.format !== expected[req.file.mimetype])
                        throw new http_utils_1.HttpError(400, 'Image contents do not match a supported image format');
                }
                const name = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.name) === undefined
                    ? req.file.originalname.slice(0, 120)
                    : (0, http_utils_1.text)(req.body.name, 'name', 1, 120);
                const file = yield file_model_1.FileModel.create({
                    name,
                    type,
                    url: req.file.filename,
                    file: JSON.stringify(req.file),
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    encoding: req.file.encoding,
                    mimetype: req.file.mimetype,
                    destination: req.file.destination,
                    filename: req.file.filename,
                    path: req.file.path,
                    size: req.file.size,
                    createdBy: res.locals.user._id,
                    baseUrl: `${req.protocol}://${req.get('host')}`,
                });
                res
                    .status(200)
                    .json({ message: `${type === 'image' ? 'Image' : 'Video'} uploaded successfully`, file });
            }
            catch (error) {
                yield promises_1.default.unlink(req.file.path).catch(() => { });
                throw error;
            }
        });
    }
}
exports.UploadController = UploadController;
