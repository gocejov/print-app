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
exports.validateVisitorTarget = validateVisitorTarget;
exports.validateVisitorFallback = validateVisitorFallback;
const campaign_service_1 = require("./campaign.service");
const qrcode_model_1 = require("../models/qrcode.model");
const product_model_1 = require("../models/product.model");
const statistic_model_1 = require("../models/statistic.model");
const http_utils_1 = require("../utils/http.utils");
function validateVisitorTarget(owner, input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (input === undefined || input === null)
            return undefined;
        const body = (0, http_utils_1.objectBody)(input, ['visitorId', 'productId']);
        if (typeof body.visitorId !== 'string' ||
            !/^[a-f0-9]{64}$/.test(body.visitorId) ||
            typeof body.productId !== 'string' ||
            !/^[a-f0-9]{24}$/i.test(body.productId))
            throw new http_utils_1.HttpError(400, 'Choose a recognized visitor and product');
        const codes = yield qrcode_model_1.QrCodeModel.find({ createdBy: owner }).select('_id');
        if (!(yield statistic_model_1.StatisticModel.exists({
            qrCode: { $in: codes.map((code) => code._id) },
            'data.visitor.id': body.visitorId,
            'data.visitor.confirmed': true,
        })))
            throw new http_utils_1.HttpError(404, 'Recognized visitor not found');
        const product = yield product_model_1.ProductModel.findOne({ _id: body.productId, createdBy: owner }).populate({
            path: 'file',
            match: { createdBy: owner, type: { $in: ['image', 'video', 'web-url'] } },
        });
        if (!(product === null || product === void 0 ? void 0 : product.file))
            throw new http_utils_1.HttpError(404, 'Product or attached file not found');
        return { visitorId: body.visitorId, productId: String(product._id) };
    });
}
function validateVisitorFallback(owner, productId, campaignId, target) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!target)
            return;
        if (productId && String(productId) === String(target.productId))
            throw new http_utils_1.HttpError(400, 'Choose a different default and visitor product');
        if (campaignId) {
            const campaign = yield new campaign_service_1.CampaignService().eligible(owner, String(campaignId));
            if (!campaign.products.some((product) => String(product._id) !== String(target.productId)))
                throw new http_utils_1.HttpError(409, 'The default campaign needs another eligible product for other visitors');
        }
    });
}
