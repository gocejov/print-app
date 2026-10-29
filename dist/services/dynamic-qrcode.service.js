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
exports.DynamicQrCodeService = void 0;
exports.destinationUrl = destinationUrl;
const campaign_service_1 = require("./campaign.service");
const mongoose_1 = __importDefault(require("mongoose"));
const file_model_1 = require("../models/file.model");
const product_model_1 = require("../models/product.model");
const qrcode_model_1 = require("../models/qrcode.model");
const user_model_1 = require("../models/user.model");
const qrcode_service_1 = require("./qrcode.service");
const http_utils_1 = require("../utils/http.utils");
function destinationUrl(value) {
    const raw = (0, http_utils_1.text)(value, 'destination URL', 1, 2048);
    try {
        const url = new URL(raw);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
            throw new Error();
        return url.href;
    }
    catch (_a) {
        throw new http_utils_1.HttpError(400, 'Enter a valid http or https URL without credentials');
    }
}
class DynamicQrCodeService {
    constructor() {
        this.renderer = new qrcode_service_1.QrCodeService();
    }
    create(userId, name, target, origin) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.UserModel.findById(userId);
            if (!user)
                throw new http_utils_1.HttpError(401, 'Login required');
            const codeId = new mongoose_1.default.Types.ObjectId();
            const alias = user.useAlias ? user.alias : 'q';
            const publicBase = (process.env.PUBLIC_URL || origin).replace(/\/$/, '');
            const url = `${publicBase}/${alias}/${codeId}`;
            // Render before any inserts, so rendering failures leave no partial records.
            const image = yield this.renderer.generateQrCodeBase64Url(url);
            const fileId = new mongoose_1.default.Types.ObjectId();
            const productId = new mongoose_1.default.Types.ObjectId();
            try {
                yield file_model_1.FileModel.create({ _id: fileId, type: 'web-url', url: target, createdBy: userId });
                yield product_model_1.ProductModel.create({
                    _id: productId,
                    file: fileId,
                    url: target,
                    owner: userId,
                    createdBy: userId,
                });
                return yield qrcode_model_1.QrCodeModel.create({
                    _id: codeId,
                    name,
                    destinationUrl: target,
                    status: 'active',
                    file: String(fileId),
                    product: productId,
                    owner: userId,
                    createdBy: userId,
                    url,
                    qrCode: image,
                });
            }
            catch (error) {
                // Standalone MongoDB installations cannot use multi-document transactions.
                // Only remove IDs allocated by this operation; preserve the original failure.
                yield Promise.allSettled([
                    qrcode_model_1.QrCodeModel.deleteOne({ _id: codeId, createdBy: userId }),
                    product_model_1.ProductModel.deleteOne({ _id: productId, createdBy: userId }),
                    file_model_1.FileModel.deleteOne({ _id: fileId, createdBy: userId }),
                ]);
                throw error;
            }
        });
    }
    createForProduct(userId, productId, name, origin) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield product_model_1.ProductModel.findOne({ _id: productId, createdBy: userId }).populate('file');
            const file = product === null || product === void 0 ? void 0 : product.file;
            if (!product || !file || !['image', 'video', 'web-url'].includes(file.type))
                throw new http_utils_1.HttpError(404, 'Product or attached file not found');
            if (String(file.createdBy) !== userId)
                throw new http_utils_1.HttpError(404, 'File not found');
            const user = yield user_model_1.UserModel.findById(userId);
            if (!user)
                throw new http_utils_1.HttpError(401, 'Login required');
            const codeId = new mongoose_1.default.Types.ObjectId();
            const publicBase = (process.env.PUBLIC_URL || origin).replace(/\/$/, '');
            const url = `${publicBase}/${user.useAlias ? user.alias : 'q'}/${codeId}`;
            const image = yield this.renderer.generateQrCodeBase64Url(url);
            return qrcode_model_1.QrCodeModel.create({
                _id: codeId,
                name: name || product.name || 'Untitled QR code',
                status: 'active',
                file: String(file._id),
                product: product._id,
                owner: userId,
                createdBy: userId,
                url,
                qrCode: image,
            });
        });
    }
    createForCampaign(userId, campaignId, name, origin) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield new campaign_service_1.CampaignService().eligible(userId, campaignId);
            if (!result.products.length)
                throw new http_utils_1.HttpError(409, 'This campaign has no eligible products');
            const user = yield user_model_1.UserModel.findById(userId);
            if (!user)
                throw new http_utils_1.HttpError(401, 'Login required');
            const id = new mongoose_1.default.Types.ObjectId();
            const base = (process.env.PUBLIC_URL || origin).replace(/\/$/, '');
            const url = `${base}/${user.useAlias ? user.alias : 'q'}/${id}`;
            const image = yield this.renderer.generateQrCodeBase64Url(url);
            return qrcode_model_1.QrCodeModel.create({
                _id: id,
                name: name || result.campaign.name,
                status: 'active',
                campaign: campaignId,
                owner: userId,
                createdBy: userId,
                url,
                qrCode: image,
            });
        });
    }
    edit(userId, codeId, changes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const code = yield qrcode_model_1.QrCodeModel.findOne({ _id: codeId, createdBy: userId });
            if (!code)
                throw new http_utils_1.HttpError(404, 'QR code not found');
            if ([changes.productId, changes.campaignId, changes.destinationUrl].filter((value) => value !== undefined).length > 1)
                throw new http_utils_1.HttpError(400, 'Choose one product, campaign or destination override');
            if (changes.destinationUrl !== undefined) {
                if (code.campaign)
                    throw new http_utils_1.HttpError(400, 'A campaign QR cannot have a direct URL override');
                const product = yield product_model_1.ProductModel.findOne({ _id: code.product, createdBy: userId }).populate('file');
                if (!product || ((_a = product.file) === null || _a === void 0 ? void 0 : _a.type) !== 'web-url')
                    throw new http_utils_1.HttpError(400, 'Only website QR destinations can be edited');
            }
            const update = Object.assign(Object.assign({}, changes), { updated_at: new Date() });
            delete update.productId;
            delete update.campaignId;
            let unset;
            if (changes.productId !== undefined) {
                if (!/^[a-f\d]{24}$/i.test(changes.productId))
                    throw new http_utils_1.HttpError(400, 'Invalid productId');
                if (changes.destinationUrl !== undefined)
                    throw new http_utils_1.HttpError(400, 'Choose a product or a destination override, not both');
                const product = yield product_model_1.ProductModel.findOne({
                    _id: changes.productId,
                    createdBy: userId,
                }).populate('file');
                const file = product === null || product === void 0 ? void 0 : product.file;
                if (!product || !file || String(file.createdBy) !== userId)
                    throw new http_utils_1.HttpError(404, 'Product or file not found');
                update.product = product._id;
                update.file = String(file._id);
                unset = { destinationUrl: 1, campaign: 1 };
            }
            if (changes.campaignId !== undefined) {
                const result = yield new campaign_service_1.CampaignService().eligible(userId, changes.campaignId);
                if (!result.products.length)
                    throw new http_utils_1.HttpError(409, 'This campaign has no eligible products');
                update.campaign = result.campaign._id;
                unset = { product: 1, file: 1, destinationUrl: 1 };
            }
            // The image and public scan URL are immutable when changing a destination.
            const updated = yield qrcode_model_1.QrCodeModel.findOneAndUpdate({ _id: codeId, createdBy: userId }, Object.assign({ $set: update }, (unset ? { $unset: unset } : {})), { new: true, runValidators: true });
            if (!updated)
                throw new http_utils_1.HttpError(404, 'QR code not found');
            return updated;
        });
    }
}
exports.DynamicQrCodeService = DynamicQrCodeService;
