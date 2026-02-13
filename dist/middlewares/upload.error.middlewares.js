"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadErrorHandler = void 0;
const multer_1 = __importDefault(require("multer"));
// Error handling middleware
const uploadErrorHandler = ((err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(500).json({ error: err.message });
    }
    next();
});
exports.uploadErrorHandler = uploadErrorHandler;
