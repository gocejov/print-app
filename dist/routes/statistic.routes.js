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
const visitor_label_model_1 = require("../models/visitor-label.model");
const statistic_model_1 = require("../models/statistic.model");
const http_utils_1 = require("../utils/http.utils");
const visitor_profile_service_1 = require("../services/visitor-profile.service");
const http_utils_2 = require("../utils/http.utils");
const http_utils_3 = require("../utils/http.utils");
const express_1 = require("express");
// import { cacheMiddleware } from '../middlewares/cache.middleware';
const statistic_controller_1 = require("../controllers/statistic.controller");
const statisticController = new statistic_controller_1.StatisticController();
const router = (0, express_1.Router)();
router.get('/', (0, http_utils_3.asyncHandler)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const scans = yield statistic_model_1.StatisticModel.find(res.locals.scope).lean();
    const ids = [
        ...new Set(scans
            .filter((scan) => { var _a, _b; return (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.confirmed; })
            .map((scan) => { var _a, _b; return (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.id; })
            .filter(Boolean)),
    ];
    const labels = yield visitor_label_model_1.VisitorLabelModel.find({
        owner: res.locals.user._id,
        visitorId: { $in: ids },
    }).lean();
    const names = new Map(labels.map((label) => [label.visitorId, label.name]));
    const result = scans.map((scan) => {
        var _a, _b;
        if (!((_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.confirmed) || !scan.data.visitor.id)
            return scan;
        return Object.assign(Object.assign({}, scan), { data: Object.assign(Object.assign({}, scan.data), { visitor: Object.assign(Object.assign({}, scan.data.visitor), { name: names.get(scan.data.visitor.id) || '' }) }) });
    });
    res.set('Cache-Control', 'no-store').json(result);
})));
router.get('/visitor-profile/:visitorId', (0, http_utils_3.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const basis = req.query.basis || 'visitor';
    if (basis !== 'visitor' && basis !== 'fingerprint')
        throw new http_utils_2.HttpError(400, 'Invalid profile basis');
    res
        .set('Cache-Control', 'no-store')
        .json(Object.assign(Object.assign({}, (yield (0, visitor_profile_service_1.getVisitorProfile)(res.locals.scope, req.params.visitorId, basis))), { name: basis === 'visitor'
            ? ((_a = (yield visitor_label_model_1.VisitorLabelModel.findOne({
                owner: res.locals.user._id,
                visitorId: req.params.visitorId,
            }).lean())) === null || _a === void 0 ? void 0 : _a.name) || ''
            : '' }));
})));
router.patch('/visitor-profile/:visitorId', (0, http_utils_3.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = (0, http_utils_1.objectBody)(req.body, ['name']);
    const name = (0, http_utils_1.text)(body.name, 'name', 0, 120);
    if ([...name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))
        throw new http_utils_2.HttpError(400, 'Invalid name');
    yield (0, visitor_profile_service_1.getVisitorProfile)(res.locals.scope, req.params.visitorId, 'visitor');
    const key = { owner: res.locals.user._id, visitorId: req.params.visitorId };
    if (name)
        yield visitor_label_model_1.VisitorLabelModel.findOneAndUpdate(key, { $set: { name } }, { upsert: true, runValidators: true });
    else
        yield visitor_label_model_1.VisitorLabelModel.deleteOne(key);
    res.set('Cache-Control', 'no-store').json({ id: req.params.visitorId, name });
})));
router.get('/:id', (0, http_utils_3.asyncHandler)((req, res) => statisticController.findById(req, res)));
router.get('/by-codes/:qid', (0, http_utils_3.asyncHandler)((req, res) => statisticController.findStatisticByQrCode(req, res)));
router.get('/total-by-codes/:qid', (0, http_utils_3.asyncHandler)((req, res) => statisticController.findTotalStatisticByQrCode(req, res)));
exports.default = router;
