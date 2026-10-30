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
exports.QrPlaybackService = exports.selectionKey = exports.SELECTION_TTL_SECONDS = void 0;
const visitor_service_1 = require("./visitor.service");
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_config_1 = require("../config/redis.config");
const qrcode_model_1 = require("../models/qrcode.model");
const product_model_1 = require("../models/product.model");
const campaign_service_1 = require("./campaign.service");
const http_utils_1 = require("../utils/http.utils");
exports.SELECTION_TTL_SECONDS = 30 * 60;
const selectionKey = (token) => `${process.env.SESSION_KEY_PREFIX || 'sess:'}campaign-selection:${token}`;
exports.selectionKey = selectionKey;
class QrPlaybackService {
    constructor() {
        this.campaigns = new campaign_service_1.CampaignService();
    }
    load(qid) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield qrcode_model_1.QrCodeModel.findOne(mongoose_1.default.Types.ObjectId.isValid(qid) ? { _id: qid } : { alias: qid });
            if (!code)
                throw new http_utils_1.HttpError(406, 'Incorrect URL');
            if (code.status === 'paused')
                throw new http_utils_1.HttpError(410, 'This QR code is currently paused');
            return code;
        });
    }
    target(product, campaignId) {
        return { product, file: product.file, campaignId };
    }
    matchingVisitor(code, req) {
        if (!req || !code.visitorTarget || (0, visitor_service_1.privacyPreference)(req))
            return undefined;
        const raw = (0, visitor_service_1.readVisitor)(req);
        return raw && (0, visitor_service_1.visitorId)(String(code.createdBy), raw) === code.visitorTarget.visitorId
            ? code.visitorTarget
            : undefined;
    }
    personalTarget(code, visitor) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield product_model_1.ProductModel.findOne({
                _id: visitor.productId,
                createdBy: code.createdBy,
            }).populate({
                path: 'file',
                match: { createdBy: code.createdBy, type: { $in: ['image', 'video', 'web-url'] } },
            });
            if (!(product === null || product === void 0 ? void 0 : product.file))
                throw new http_utils_1.HttpError(410, 'Assigned product is unavailable');
            return Object.assign(Object.assign({}, this.target(product)), { visitorId: visitor.visitorId });
        });
    }
    draw(code, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const visitor = this.matchingVisitor(code, req);
            if (visitor)
                return this.personalTarget(code, visitor);
            if (code.campaign) {
                const result = yield this.campaigns.eligible(String(code.createdBy), String(code.campaign), true);
                return this.target((0, campaign_service_1.weightedProduct)(result.products.filter(product => { var _a; return String(product._id) !== String((_a = code.visitorTarget) === null || _a === void 0 ? void 0 : _a.productId); }), result.campaign.productWeights || []), String(code.campaign));
            }
            if (code.visitorTarget && String(code.product) === String(code.visitorTarget.productId))
                throw new http_utils_1.HttpError(409, 'The default product is unavailable');
            const product = yield product_model_1.ProductModel.findOne({
                _id: code.product,
                createdBy: code.createdBy,
            }).populate({
                path: 'file',
                match: { createdBy: code.createdBy, type: { $in: ['image', 'video', 'web-url'] } },
            });
            if (!(product === null || product === void 0 ? void 0 : product.file))
                throw new http_utils_1.HttpError(406, 'Product or attached file not found');
            return this.target(product);
        });
    }
    ticket(code, target) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = (0, crypto_1.randomBytes)(24).toString('hex');
            yield redis_config_1.redisClient.setex((0, exports.selectionKey)(token), exports.SELECTION_TTL_SECONDS, JSON.stringify({
                visitorId: target.visitorId,
                qrId: String(code._id),
                campaignId: String(code.campaign),
                productId: String(target.product._id),
                fileId: String(target.file._id),
            }));
            return token;
        });
    }
    mediaTarget(code, token, req) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!code.campaign && token === undefined)
                return this.draw(code, req);
            if (typeof token !== 'string' || !/^[a-f\d]{48}$/.test(token))
                throw new http_utils_1.HttpError(400, 'Scan the campaign QR code to select a product');
            const raw = yield redis_config_1.redisClient.get((0, exports.selectionKey)(token));
            if (!raw)
                throw new http_utils_1.HttpError(410, 'This selection expired; scan the QR code again');
            const selection = JSON.parse(raw);
            if (selection.qrId !== String(code._id) || selection.campaignId !== String(code.campaign))
                throw new http_utils_1.HttpError(404, 'Selection not found');
            const visitor = this.matchingVisitor(code, req);
            if (selection.visitorId) {
                if (!visitor || visitor.visitorId !== selection.visitorId)
                    throw new http_utils_1.HttpError(403, 'This selected content is not available to this browser');
                if (String(visitor.productId) !== selection.productId)
                    throw new http_utils_1.HttpError(410, 'Assigned content changed; scan again');
                const target = yield this.personalTarget(code, visitor);
                if (String(target.file._id) !== selection.fileId)
                    throw new http_utils_1.HttpError(410, 'Assigned file changed; scan again');
                return target;
            }
            if (!code.campaign || visitor)
                throw new http_utils_1.HttpError(410, 'Selected content changed; scan again');
            // Recheck current membership/status, but never perform a second random draw.
            const result = yield this.campaigns.eligible(String(code.createdBy), String(code.campaign), true);
            const product = result.products.find((product) => {
                var _a;
                return String(product._id) !== String((_a = code.visitorTarget) === null || _a === void 0 ? void 0 : _a.productId) &&
                    String(product._id) === selection.productId &&
                    String(product.file._id) === selection.fileId;
            });
            if (!product)
                throw new http_utils_1.HttpError(410, 'Selected content changed; scan the QR code again');
            return this.target(product, selection.campaignId);
        });
    }
}
exports.QrPlaybackService = QrPlaybackService;
