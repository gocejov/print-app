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
const visitor_profile_service_1 = require("../services/visitor-profile.service");
const http_utils_1 = require("../utils/http.utils");
const http_utils_2 = require("../utils/http.utils");
const express_1 = require("express");
// import { cacheMiddleware } from '../middlewares/cache.middleware';
const statistic_controller_1 = require("../controllers/statistic.controller");
const statisticController = new statistic_controller_1.StatisticController();
const router = (0, express_1.Router)();
router.get('/', (0, http_utils_2.asyncHandler)((req, res) => statisticController.getAll(req, res)));
router.get('/visitor-profile/:visitorId', (0, http_utils_2.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const basis = req.query.basis || 'visitor';
    if (basis !== 'visitor' && basis !== 'fingerprint')
        throw new http_utils_1.HttpError(400, 'Invalid profile basis');
    res
        .set('Cache-Control', 'no-store')
        .json(yield (0, visitor_profile_service_1.getVisitorProfile)(res.locals.scope, req.params.visitorId, basis));
})));
router.get('/:id', (0, http_utils_2.asyncHandler)((req, res) => statisticController.findById(req, res)));
router.get('/by-codes/:qid', (0, http_utils_2.asyncHandler)((req, res) => statisticController.findStatisticByQrCode(req, res)));
router.get('/total-by-codes/:qid', (0, http_utils_2.asyncHandler)((req, res) => statisticController.findTotalStatisticByQrCode(req, res)));
exports.default = router;
