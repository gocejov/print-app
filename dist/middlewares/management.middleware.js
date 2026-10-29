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
exports.managementAccess = managementAccess;
const campaign_model_1 = require("../models/campaign.model");
const user_model_1 = require("../models/user.model");
const file_model_1 = require("../models/file.model");
const product_model_1 = require("../models/product.model");
const qrcode_model_1 = require("../models/qrcode.model");
const statistic_model_1 = require("../models/statistic.model");
const http_utils_1 = require("../utils/http.utils");
const dynamic_qrcode_service_1 = require("../services/dynamic-qrcode.service");
const models = {
    users: user_model_1.UserModel,
    files: file_model_1.FileModel,
    products: product_model_1.ProductModel,
    qrcodes: qrcode_model_1.QrCodeModel,
    statistics: statistic_model_1.StatisticModel,
};
function id(value, field) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
        throw new http_utils_1.HttpError(400, `Invalid ${field}`);
    return value;
}
function alias(value) {
    const result = (0, http_utils_1.text)(value, 'alias', 1, 40);
    if (!/^[a-zA-Z0-9_-]+$/.test(result))
        throw new http_utils_1.HttpError(400, 'Invalid alias');
    return result;
}
/** Establish an ownership scope and validate only explicit, writable business fields. */
function managementAccess(resource) {
    return (0, http_utils_1.asyncHandler)((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const userId = String(res.locals.user._id);
        const segments = req.path.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (resource === 'upload') {
            if (['video', 'image'].includes(segments[0]) && id(last, 'user ID') !== userId)
                throw new http_utils_1.HttpError(403, 'Cannot upload for another user');
            next();
            return;
        }
        let scope = resource === 'users' ? { _id: userId } : { createdBy: userId };
        if (resource === 'statistics') {
            const codes = yield qrcode_model_1.QrCodeModel.find({ createdBy: userId }).select('_id');
            scope = { qrCode: { $in: codes.map((code) => code._id) } };
            if (['by-codes', 'total-by-codes'].includes(segments[0])) {
                const codeId = id(last, 'QR code ID');
                if (!codes.some((code) => String(code._id) === codeId))
                    throw new http_utils_1.HttpError(404, 'QR code not found');
            }
        }
        res.locals.scope = scope;
        const dynamicCreate = resource === 'qrcodes' && req.method === 'POST' && req.path.replace(/\/$/, '') === '/dynamic';
        const recordRoute = !dynamicCreate &&
            segments.length > 0 &&
            !['with-options', 'create'].includes(last) &&
            !['by-codes', 'total-by-codes'].includes(segments[0]);
        if (recordRoute) {
            const recordId = id(resource === 'files' && last === 'content' ? segments[0] : last, 'ID');
            const record = yield models[resource].findOne({
                $and: [scope, { _id: recordId }],
            });
            if (!record)
                throw new http_utils_1.HttpError(404, 'Item not found');
            res.locals.record = record;
        }
        if (req.method === 'POST' && !dynamicCreate) {
            if (resource === 'files') {
                const body = (0, http_utils_1.objectBody)(req.body, ['name', 'type', 'url', 'createdBy']);
                if (body.createdBy !== undefined && body.createdBy !== userId)
                    throw new http_utils_1.HttpError(403, 'Cannot create for another user');
                if (body.type !== 'web-url')
                    throw new http_utils_1.HttpError(400, 'Use an upload endpoint for images or videos');
                req.body = Object.assign({ type: 'web-url', url: (0, dynamic_qrcode_service_1.destinationUrl)(body.url), createdBy: userId }, (body.name !== undefined ? { name: (0, http_utils_1.text)(body.name, 'name', 1, 120) } : {}));
            }
            else if (resource === 'products' || resource === 'qrcodes') {
                const body = (0, http_utils_1.objectBody)(req.body, [
                    'userId',
                    'name',
                    ...(resource === 'products' ? ['fileId', 'description'] : ['productId', 'campaignId']),
                ]);
                if (body.userId !== undefined && body.userId !== userId)
                    throw new http_utils_1.HttpError(403, 'Cannot create for another user');
                if (resource === 'qrcodes' &&
                    Number(body.productId !== undefined) + Number(body.campaignId !== undefined) !== 1)
                    throw new http_utils_1.HttpError(400, 'Choose exactly one product or campaign');
                const field = resource === 'products'
                    ? 'fileId'
                    : body.campaignId !== undefined
                        ? 'campaignId'
                        : 'productId';
                const referenceId = id(body[field], field);
                const model = field === 'fileId' ? file_model_1.FileModel : field === 'campaignId' ? campaign_model_1.CampaignModel : product_model_1.ProductModel;
                if (!(yield model.exists({ _id: referenceId, createdBy: userId })))
                    throw new http_utils_1.HttpError(404, 'Referenced item not found');
                req.body = Object.assign(Object.assign({ [field]: referenceId, userId }, (body.name !== undefined ? { name: (0, http_utils_1.text)(body.name, 'name', 1, 120) } : {})), (body.description !== undefined
                    ? { description: (0, http_utils_1.text)(body.description, 'description', 0, 1000) }
                    : {}));
            }
        }
        if (req.method === 'PUT' && resource !== 'users') {
            if (resource === 'files') {
                const body = (0, http_utils_1.objectBody)(req.body, ['name', 'url']);
                const changes = {};
                if (body.name !== undefined)
                    changes.name = (0, http_utils_1.text)(body.name, 'name', 1, 120);
                if (body.url !== undefined) {
                    if (res.locals.record.type !== 'web-url')
                        throw new http_utils_1.HttpError(400, 'Uploaded file paths cannot be edited');
                    changes.url = (0, dynamic_qrcode_service_1.destinationUrl)(body.url);
                }
                if (!Object.keys(changes).length)
                    throw new http_utils_1.HttpError(400, 'No changes supplied');
                req.body = changes;
            }
            else if (resource === 'products') {
                const body = (0, http_utils_1.objectBody)(req.body, ['name', 'description', 'fileId', 'alias']);
                const changes = {};
                if (body.name !== undefined)
                    changes.name = (0, http_utils_1.text)(body.name, 'name', 1, 120);
                if (body.description !== undefined)
                    changes.description = (0, http_utils_1.text)(body.description, 'description', 0, 1000);
                if (body.alias !== undefined)
                    changes.alias = alias(body.alias);
                if (body.fileId !== undefined) {
                    changes.fileId = id(body.fileId, 'fileId');
                    if (!(yield file_model_1.FileModel.exists({ _id: changes.fileId, createdBy: userId })))
                        throw new http_utils_1.HttpError(404, 'File not found');
                }
                if (!Object.keys(changes).length)
                    throw new http_utils_1.HttpError(400, 'No changes supplied');
                req.body = changes;
            }
            else {
                const body = (0, http_utils_1.objectBody)(req.body, ['alias']);
                req.body = { alias: alias(body.alias) };
            }
        }
        next();
    }));
}
