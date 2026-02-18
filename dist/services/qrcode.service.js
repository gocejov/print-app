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
exports.QrCodeServiceNew = exports.QrCodeService = void 0;
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
            const WIDTH = 2024;
            const LOGO_WIDTH = Math.round((20 / 100) * WIDTH); // 20% of QR code width
            const options = qrCodeOptions ? qrCodeOptions : { errorCorrectionLevel: 'Q', width: WIDTH, };
            try {
                const qrCodeDataBuffer = yield qrcode_1.default.toBuffer(url, options);
                const logoPath = './uploads/images/qr2share-logo-circle.png';
                const logoBuffer = yield promises_1.default.readFile(logoPath);
                const resizedLogoBuffer = yield (0, sharp_1.default)(logoBuffer)
                    .resize({
                    width: LOGO_WIDTH, // Adjust as needed (20% of QR size)
                    height: LOGO_WIDTH, // Adjust to maintain aspect ratio
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
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
class QrCodeServiceNew extends base_service_1.BaseService {
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
            // Prefer shorter content for low-density QR.
            // Ideally pass in a SHORT URL (your own redirect) instead of long URLs.
            var _a, _b;
            const ecLevel = (_a = qrCodeOptions === null || qrCodeOptions === void 0 ? void 0 : qrCodeOptions.errorCorrectionLevel) !== null && _a !== void 0 ? _a : "Q";
            const options = Object.assign({ errorCorrectionLevel: ecLevel, margin: 6, scale: 18, color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                } }, qrCodeOptions);
            const qrCodeDataBuffer = yield qrcode_1.default.toBuffer(url, options);
            const logoPath = "./uploads/images/qr2share-logo-circle.png";
            const logoBuffer = yield promises_1.default.readFile(logoPath);
            // Compute logo size relative to QR size (keeps it scannable)
            const qrMeta = yield (0, sharp_1.default)(qrCodeDataBuffer).metadata();
            const qrWidth = (_b = qrMeta.width) !== null && _b !== void 0 ? _b : 800;
            const logoSize = clamp(Math.round(qrWidth * 0.14), 70, 160); // ~14% of QR width
            const resizedLogoBuffer = yield (0, sharp_1.default)(logoBuffer)
                .resize({ width: logoSize, height: logoSize, fit: sharp_1.default.fit.inside })
                .png()
                .toBuffer();
            // Optional: add a white “plate” behind logo to improve contrast
            const platePadding = Math.round(logoSize * 0.18);
            const plateSize = logoSize + platePadding * 2;
            const plate = yield (0, sharp_1.default)({
                create: {
                    width: plateSize,
                    height: plateSize,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 },
                },
            })
                .png()
                .toBuffer();
            const logoOnPlate = yield (0, sharp_1.default)(plate)
                .composite([{ input: resizedLogoBuffer, gravity: "center" }])
                .png()
                .toBuffer();
            const qrWithLogoBuffer = yield (0, sharp_1.default)(qrCodeDataBuffer)
                .composite([{ input: logoOnPlate, gravity: "center" }])
                .png()
                .toBuffer();
            return `data:image/png;base64,${qrWithLogoBuffer.toString("base64")}`;
        });
    }
}
exports.QrCodeServiceNew = QrCodeServiceNew;
