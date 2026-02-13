"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
// Configure Multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Set upload directory
        const uploadDir = 'uploads/videos';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Save file with a timestamp to avoid conflicts
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
// File type filter to allow only video files
const videoFileFilter = (req, file, cb) => {
    console.log("file.mimetype", file.mimetype);
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mkv', 'video/mov', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only video files are allowed.'));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});
exports.upload = upload;
