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
exports.CampaignService = exports.CategoryService = void 0;
exports.objectId = objectId;
exports.distinctProductIds = distinctProductIds;
exports.randomProduct = randomProduct;
exports.weightedProduct = weightedProduct;
const crypto_1 = require("crypto");
const category_model_1 = require("../models/category.model");
const campaign_model_1 = require("../models/campaign.model");
const product_model_1 = require("../models/product.model");
const qrcode_model_1 = require("../models/qrcode.model");
const http_utils_1 = require("../utils/http.utils");
function objectId(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
        throw new http_utils_1.HttpError(400, 'Invalid ID');
    return value.toLowerCase();
}
function distinctProductIds(direct, categories) {
    return [...new Set([...direct, ...categories.flat()])];
}
function randomProduct(products, choose = crypto_1.randomInt) {
    if (!products.length)
        throw new http_utils_1.HttpError(409, 'This campaign has no eligible products');
    return products[choose(products.length)];
}
/** Missing overrides (including existing campaigns) have weight 1. */
function weightedProduct(products, overrides = [], choose = crypto_1.randomInt) {
    if (!products.length)
        throw new http_utils_1.HttpError(409, 'This campaign has no eligible products');
    const weights = new Map(overrides.map((item) => [String(item.product), item.weight]));
    const values = products.map((product) => { var _a; return (_a = weights.get(String(product._id))) !== null && _a !== void 0 ? _a : 1; });
    if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 1000))
        throw new http_utils_1.HttpError(400, 'Product weights must be integers from 1 to 1000');
    let draw = choose(values.reduce((total, value) => total + value, 0));
    for (let index = 0; index < products.length; index++) {
        draw -= values[index];
        if (draw < 0)
            return products[index];
    }
    throw new Error('Random selection returned an invalid value');
}
function ownedReferences(model, ids, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield model.countDocuments({ _id: { $in: ids }, createdBy: userId })) !== ids.length)
            throw new http_utils_1.HttpError(404, 'Referenced item not found');
    });
}
function productIds(value) {
    if (!Array.isArray(value) || value.length > 200)
        throw new http_utils_1.HttpError(400, 'Supply at most 200 products');
    return [...new Set(value.map(objectId))];
}
class CategoryService {
    list(userId) {
        return category_model_1.CategoryModel.find({ createdBy: userId }).sort({ created_at: -1 });
    }
    find(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield category_model_1.CategoryModel.findOne({ _id: objectId(id), createdBy: userId });
            if (!item)
                throw new http_utils_1.HttpError(404, 'Category not found');
            return item;
        });
    }
    save(userId, input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const body = (0, http_utils_1.objectBody)(input, ['name', 'description', 'products']);
            const data = {
                name: (0, http_utils_1.text)(body.name, 'name', 1, 120),
                description: (0, http_utils_1.text)((_a = body.description) !== null && _a !== void 0 ? _a : '', 'description', 0, 1000),
                products: productIds((_b = body.products) !== null && _b !== void 0 ? _b : []),
                updated_at: new Date(),
            };
            yield ownedReferences(product_model_1.ProductModel, data.products, userId);
            if (!id)
                return category_model_1.CategoryModel.create(Object.assign(Object.assign({}, data), { createdBy: userId }));
            const result = yield category_model_1.CategoryModel.findOneAndUpdate({ _id: objectId(id), createdBy: userId }, { $set: data }, { new: true, runValidators: true });
            if (!result)
                throw new http_utils_1.HttpError(404, 'Category not found');
            return result;
        });
    }
    remove(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.find(userId, id);
            if (yield campaign_model_1.CampaignModel.exists({ entries: { $elemMatch: { kind: 'category', target: id } } }))
                throw new http_utils_1.HttpError(409, 'Remove this category from its campaigns before deleting it');
            return category_model_1.CategoryModel.findOneAndDelete({ _id: id, createdBy: userId });
        });
    }
}
exports.CategoryService = CategoryService;
class CampaignService {
    list(userId) {
        return campaign_model_1.CampaignModel.find({ createdBy: userId }).sort({ created_at: -1 });
    }
    find(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield campaign_model_1.CampaignModel.findOne({ _id: objectId(id), createdBy: userId });
            if (!item)
                throw new http_utils_1.HttpError(404, 'Campaign not found');
            return item;
        });
    }
    save(userId, input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const body = (0, http_utils_1.objectBody)(input, ['name', 'description', 'entries', 'rule', 'status', 'productWeights']);
            if (body.rule !== undefined && body.rule !== 'random')
                throw new http_utils_1.HttpError(400, 'Only the random display rule is supported');
            if (body.status !== undefined && !['active', 'paused'].includes(body.status))
                throw new http_utils_1.HttpError(400, 'Invalid campaign status');
            if (!Array.isArray(body.entries) || body.entries.length > 100)
                throw new http_utils_1.HttpError(400, 'Supply at most 100 campaign entries');
            const seen = new Set();
            const entries = body.entries
                .map((raw) => {
                const item = (0, http_utils_1.objectBody)(raw, ['kind', 'target']);
                if (!['product', 'category'].includes(item.kind))
                    throw new http_utils_1.HttpError(400, 'Entry must be a product or category');
                return { kind: item.kind, target: objectId(item.target) };
            })
                .filter((item) => {
                const key = `${item.kind}:${item.target}`;
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            yield ownedReferences(product_model_1.ProductModel, entries.filter((item) => item.kind === 'product').map((item) => item.target), userId);
            yield ownedReferences(category_model_1.CategoryModel, entries.filter((item) => item.kind === 'category').map((item) => item.target), userId);
            const rawWeights = (_a = body.productWeights) !== null && _a !== void 0 ? _a : [];
            if (!Array.isArray(rawWeights) || rawWeights.length > 20000)
                throw new http_utils_1.HttpError(400, 'Supply at most 20000 product weights');
            const weightIds = new Set();
            const productWeights = rawWeights.map((raw) => {
                const item = (0, http_utils_1.objectBody)(raw, ['product', 'weight']);
                const product = objectId(item.product);
                if (!Number.isInteger(item.weight) || item.weight < 1 || item.weight > 1000)
                    throw new http_utils_1.HttpError(400, 'Product weights must be integers from 1 to 1000');
                if (weightIds.has(product))
                    throw new http_utils_1.HttpError(400, 'Supply only one weight per product');
                weightIds.add(product);
                return { product, weight: item.weight };
            });
            const categories = yield category_model_1.CategoryModel.find({
                _id: { $in: entries.filter((item) => item.kind === 'category').map((item) => item.target) },
                createdBy: userId,
            });
            const members = new Set(distinctProductIds(entries.filter((item) => item.kind === 'product').map((item) => item.target), categories.map((category) => category.products.map(String))));
            if (productWeights.some((item) => !members.has(item.product)))
                throw new http_utils_1.HttpError(400, 'Weights must reference products included in this campaign');
            yield ownedReferences(product_model_1.ProductModel, productWeights.map((item) => item.product), userId);
            const data = {
                name: (0, http_utils_1.text)(body.name, 'name', 1, 120),
                description: (0, http_utils_1.text)((_b = body.description) !== null && _b !== void 0 ? _b : '', 'description', 0, 1000),
                rule: 'random',
                productWeights,
                status: body.status || 'active',
                entries,
                updated_at: new Date(),
            };
            if (!id)
                return campaign_model_1.CampaignModel.create(Object.assign(Object.assign({}, data), { createdBy: userId }));
            const result = yield campaign_model_1.CampaignModel.findOneAndUpdate({ _id: objectId(id), createdBy: userId }, { $set: data }, { new: true, runValidators: true });
            if (!result)
                throw new http_utils_1.HttpError(404, 'Campaign not found');
            return result;
        });
    }
    eligible(userId_1, id_1) {
        return __awaiter(this, arguments, void 0, function* (userId, id, requireActive = false) {
            const campaign = yield this.find(userId, id);
            if (requireActive && campaign.status === 'paused')
                throw new http_utils_1.HttpError(410, 'This campaign is currently paused');
            const categories = yield category_model_1.CategoryModel.find({
                _id: {
                    $in: campaign.entries
                        .filter((entry) => entry.kind === 'category')
                        .map((entry) => entry.target),
                },
                createdBy: userId,
            });
            const ids = distinctProductIds(campaign.entries
                .filter((entry) => entry.kind === 'product')
                .map((entry) => String(entry.target)), categories.map((category) => category.products.map(String)));
            const found = yield product_model_1.ProductModel.find({ _id: { $in: ids }, createdBy: userId }).populate({
                path: 'file',
                match: { createdBy: userId, type: { $in: ['image', 'video', 'web-url'] } },
            });
            const byId = new Map();
            for (const product of found)
                if (product.file)
                    byId.set(String(product._id), product);
            return {
                campaign,
                products: ids
                    .map((id) => byId.get(id))
                    .filter((product) => !!product),
            };
        });
    }
    remove(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.find(userId, id);
            if (yield qrcode_model_1.QrCodeModel.exists({ campaign: id }))
                throw new http_utils_1.HttpError(409, 'Reassign this campaign’s QR codes before deleting it');
            return campaign_model_1.CampaignModel.findOneAndDelete({ _id: id, createdBy: userId });
        });
    }
}
exports.CampaignService = CampaignService;
