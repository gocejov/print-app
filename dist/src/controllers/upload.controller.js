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
exports.UploadController = void 0;
const file_model_1 = require("../models/file.model");
const file_service_1 = require("../services/file.service");
const user_service_1 = require("../services/user.service");
class UploadController {
    constructor() {
        this.fileService = new file_service_1.FileService();
        this.userService = new user_service_1.UserService();
    }
    videoUpload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const { uid } = req.params;
            try {
                const user = yield this.userService.findById(uid);
                if (!user) {
                    res.status(404).json({ error: "User does not exist" });
                    return;
                }
                const fileData = {
                    url: (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename,
                    mimetype: (_b = req.file) === null || _b === void 0 ? void 0 : _b.mimetype,
                    file: JSON.stringify(req.file),
                    type: 'video',
                    fieldname: (_c = req.file) === null || _c === void 0 ? void 0 : _c.fieldname,
                    originalname: (_d = req.file) === null || _d === void 0 ? void 0 : _d.originalname,
                    encoding: (_e = req.file) === null || _e === void 0 ? void 0 : _e.encoding,
                    destination: (_f = req.file) === null || _f === void 0 ? void 0 : _f.destination,
                    filename: (_g = req.file) === null || _g === void 0 ? void 0 : _g.filename,
                    path: (_h = req.file) === null || _h === void 0 ? void 0 : _h.path,
                    size: (_j = req.file) === null || _j === void 0 ? void 0 : _j.size,
                    createdBy: user.id,
                    baseUrl: `${req.protocol}://${req.get('host')}`
                };
                const file = yield this.fileService.add(new file_model_1.FileModel(fileData));
                res.status(200).json({ message: 'Video uploaded successfully', file: file });
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.UploadController = UploadController;
