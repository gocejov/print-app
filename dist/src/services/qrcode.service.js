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
exports.QrCodeService = void 0;
const qrcode_model_1 = require("../models/qrcode.model");
const base_service_1 = require("./base.service");
const qrcode_1 = __importDefault(require("qrcode"));
const sharp_1 = __importDefault(require("sharp"));
const promises_1 = __importDefault(require("fs/promises"));
class QrCodeService extends base_service_1.BaseService {
    constructor() {
        super(qrcode_model_1.QrCodeModel);
    }
    findQrCodesByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({
                createdBy: userId
            });
        });
    }
    generateQrCodeBase64Url(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, qrCodeOptions = null) {
            // errorCorrectionLevel: 'L', // High error correction level (L, M, Q, H)
            // width: 500,               // Size in pixels
            const options = qrCodeOptions ? qrCodeOptions : { errorCorrectionLevel: 'Q', width: 2024, };
            try {
                const qrCodeDataBuffer = yield qrcode_1.default.toBuffer(url, options);
                const logoPath = './uploads/images/qr2share-logo-circle.png';
                const logoBuffer = yield promises_1.default.readFile(logoPath);
                const resizedLogoBuffer = yield (0, sharp_1.default)(logoBuffer)
                    .resize({
                    width: 100, // Adjust as needed (20% of QR size)
                    height: 100, // Adjust to maintain aspect ratio
                    fit: sharp_1.default.fit.inside,
                })
                    .toBuffer();
                const qrWithLogoBuffer = yield (0, sharp_1.default)(qrCodeDataBuffer)
                    .composite([
                    {
                        input: resizedLogoBuffer,
                        gravity: 'center', // Center the logo on the QR code
                    },
                ])
                    .png()
                    .toBuffer();
                // Step 4: Convert the Final QR Code to Base64
                return `data:image/png;base64,${qrWithLogoBuffer.toString('base64')}`;
            }
            catch (err) {
                console.error('Error generating QR code:', err);
                throw err;
            }
        });
    }
}
exports.QrCodeService = QrCodeService;
