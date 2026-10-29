"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaPath = mediaPath;
exports.escapeHtml = escapeHtml;
const path_1 = __importDefault(require("path"));
const http_utils_1 = require("../utils/http.utils");
// User media is separate from the application's branding assets.
function mediaPath(filePath) {
    if (typeof filePath !== 'string')
        throw new http_utils_1.HttpError(404, 'Media not found');
    const resolved = path_1.default.resolve(filePath);
    const roots = ['uploads/videos', 'uploads/media-images'].map((root) => path_1.default.resolve(root) + path_1.default.sep);
    if (!roots.some((root) => resolved.startsWith(root)))
        throw new http_utils_1.HttpError(404, 'Media not found');
    return resolved;
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
