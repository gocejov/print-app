"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = exports.upload = exports.videoTypes = exports.imageTypes = void 0;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const http_utils_1 = require("../utils/http.utils");
exports.imageTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
exports.videoTypes = {
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/x-msvideo': 'avi',
    'video/mkv': 'mkv',
    'video/x-matroska': 'mkv',
    'video/mov': 'mov',
    'video/quicktime': 'mov',
};
function uploader(directory, types, maxSize) {
    return (0, multer_1.default)({
        storage: multer_1.default.diskStorage({
            destination: (_req, _file, cb) => {
                fs_1.default.mkdirSync(directory, { recursive: true });
                cb(null, directory);
            },
            filename: (_req, file, cb) => cb(null, `${(0, crypto_1.randomUUID)()}.${types[file.mimetype]}`),
        }),
        fileFilter: (_req, file, cb) => {
            if (!types[file.mimetype]) {
                cb(new http_utils_1.HttpError(415, 'Unsupported file type'));
                return;
            }
            cb(null, true);
        },
        limits: { fileSize: maxSize, files: 1 },
    });
}
exports.upload = uploader('uploads/videos', exports.videoTypes, 50 * 1024 * 1024);
exports.uploadImage = uploader('uploads/media-images', exports.imageTypes, 10 * 1024 * 1024);
