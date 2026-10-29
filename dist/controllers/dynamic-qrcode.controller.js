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
exports.createDynamicCode = createDynamicCode;
exports.editDynamicCode = editDynamicCode;
const dynamic_qrcode_service_1 = require("../services/dynamic-qrcode.service");
const http_utils_1 = require("../utils/http.utils");
const service = new dynamic_qrcode_service_1.DynamicQrCodeService();
function createDynamicCode(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = (0, http_utils_1.objectBody)(req.body, ['name', 'url']);
        const name = (0, http_utils_1.text)(body.name, 'name', 1, 120);
        const url = (0, dynamic_qrcode_service_1.destinationUrl)(body.url);
        res
            .status(201)
            .json(yield service.create(String(res.locals.user._id), name, url, `${req.protocol}://${req.get('host')}`));
    });
}
function editDynamicCode(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = (0, http_utils_1.objectBody)(req.body, ['name', 'status', 'destinationUrl', 'productId', 'campaignId']);
        const changes = {};
        if (body.campaignId !== undefined)
            changes.campaignId = (0, http_utils_1.text)(body.campaignId, 'campaignId', 24, 24);
        if (body.productId !== undefined)
            changes.productId = (0, http_utils_1.text)(body.productId, 'productId', 24, 24);
        if (body.name !== undefined)
            changes.name = (0, http_utils_1.text)(body.name, 'name', 1, 120);
        if (body.status !== undefined) {
            if (!['active', 'paused'].includes(body.status))
                throw new http_utils_1.HttpError(400, 'Status must be active or paused');
            changes.status = body.status;
        }
        if (body.destinationUrl !== undefined)
            changes.destinationUrl = (0, dynamic_qrcode_service_1.destinationUrl)(body.destinationUrl);
        if (!Object.keys(changes).length)
            throw new http_utils_1.HttpError(400, 'No changes supplied');
        res.json(yield service.edit(String(res.locals.user._id), req.params.id, changes));
    });
}
