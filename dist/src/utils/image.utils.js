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
exports.getBuferFromImage = exports.generateBase64ImageFromBuffer = exports.blurImage = void 0;
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const blurImage = (imagePath, blurAmount) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(imagePath, { responseType: 'arraybuffer' });
    const imageBuffer = (0, exports.getBuferFromImage)(response.data);
    return (0, sharp_1.default)(imageBuffer).blur(blurAmount).toBuffer();
});
exports.blurImage = blurImage;
const generateBase64ImageFromBuffer = (imageData) => {
    const buffer = (0, exports.getBuferFromImage)(imageData);
    const base64Image = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64Image}`;
};
exports.generateBase64ImageFromBuffer = generateBase64ImageFromBuffer;
const getBuferFromImage = (imageData) => {
    return Buffer.from(imageData);
};
exports.getBuferFromImage = getBuferFromImage;
