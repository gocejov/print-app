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
exports.collectionRoutes = collectionRoutes;
const express_1 = require("express");
const campaign_service_1 = require("../services/campaign.service");
const http_utils_1 = require("../utils/http.utils");
function collectionRoutes(kind) {
    const service = kind === 'category' ? new campaign_service_1.CategoryService() : new campaign_service_1.CampaignService();
    const router = (0, express_1.Router)();
    router.get('/', (0, http_utils_1.asyncHandler)((_req, res) => __awaiter(this, void 0, void 0, function* () {
        res.json(yield service.list(String(res.locals.user._id)));
    })));
    if (kind === 'campaign')
        router.get('/:id/products', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield new campaign_service_1.CampaignService().eligible(String(res.locals.user._id), req.params.id);
            const weights = new Map((result.campaign.productWeights || []).map((item) => [String(item.product), item.weight]));
            const total = result.products.reduce((sum, product) => { var _a; return sum + ((_a = weights.get(String(product._id))) !== null && _a !== void 0 ? _a : 1); }, 0);
            res.json({ count: result.products.length, products: result.products,
                distribution: result.products.map((product) => {
                    var _a;
                    const weight = (_a = weights.get(String(product._id))) !== null && _a !== void 0 ? _a : 1;
                    return { product: String(product._id), weight, probability: weight / total };
                }),
            });
        })));
    router.get('/:id', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
        res.json(yield service.find(String(res.locals.user._id), req.params.id));
    })));
    router.post('/', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
        res.status(201).json(yield service.save(String(res.locals.user._id), req.body));
    })));
    router.put('/:id', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
        yield service.find(String(res.locals.user._id), req.params.id);
        res.json(yield service.save(String(res.locals.user._id), req.body, req.params.id));
    })));
    router.delete('/:id', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
        res.json(yield service.remove(String(res.locals.user._id), req.params.id));
    })));
    return router;
}
