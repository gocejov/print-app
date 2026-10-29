"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadErrorHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const uploadErrorHandler = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        res.status(400).json({ error: err.message });
        return;
    }
    next(err);
};
exports.uploadErrorHandler = uploadErrorHandler;
