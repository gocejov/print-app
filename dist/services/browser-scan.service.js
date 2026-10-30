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
exports.BrowserScanService = void 0;
exports.validateBrowserMetrics = validateBrowserMetrics;
exports.browserScanPage = browserScanPage;
const visitor_service_1 = require("./visitor.service");
const crypto_1 = require("crypto");
const redis_config_1 = require("../config/redis.config");
const statistic_model_1 = require("../models/statistic.model");
const http_utils_1 = require("../utils/http.utils");
const key = (token) => `${process.env.SESSION_KEY_PREFIX || 'sess:'}browser-scan:${token}`;
/** A short-lived capability can enrich only the scan that created it. No account required. */
class BrowserScanService {
    create(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = (0, crypto_1.randomBytes)(24).toString('hex');
            yield redis_config_1.redisClient.setex(key(token), 600, JSON.stringify(context));
            return token;
        });
    }
    load(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!/^[a-f\d]{48}$/.test(token))
                throw new http_utils_1.HttpError(404, 'Scan not found');
            const raw = yield redis_config_1.redisClient.get(key(token));
            if (!raw)
                throw new http_utils_1.HttpError(410, 'Scan expired; scan the QR code again');
            return JSON.parse(raw);
        });
    }
    confirm(context, req) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = (0, visitor_service_1.readVisitor)(req);
            if (!raw || !context.ownerId || (0, visitor_service_1.privacyPreference)(req))
                return;
            yield statistic_model_1.StatisticModel.updateOne({
                _id: context.statisticId,
                qrCode: context.qrId,
                'data.visitor.id': (0, visitor_service_1.visitorId)(context.ownerId, raw),
            }, { $set: { 'data.visitor.confirmed': true } });
        });
    }
    collect(token, body, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const context = yield this.load(token);
            const browser = validateBrowserMetrics(body);
            const scan = yield statistic_model_1.StatisticModel.findOne({ _id: context.statisticId, qrCode: context.qrId });
            const changes = {};
            if ((0, visitor_service_1.privacyPreference)(req) || browser.globalPrivacyControl === true) {
                changes['data.visitor'] = { method: 'unrecognized', reason: 'privacy-preference' };
                res.clearCookie(visitor_service_1.VISITOR_COOKIE, { path: '/' });
            }
            else if (scan && context.ownerId) {
                const raw = (0, visitor_service_1.readVisitor)(req);
                if (raw && ((_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.id) === (0, visitor_service_1.visitorId)(context.ownerId, raw))
                    changes['data.visitor.confirmed'] = true;
                const fingerprint = (0, visitor_service_1.browserFingerprint)(context.ownerId, browser, (_d = (_c = scan.data) === null || _c === void 0 ? void 0 : _c.fingerprintData) === null || _d === void 0 ? void 0 : _d.ua);
                if (fingerprint)
                    changes['data.browserFingerprint'] = {
                        hash: fingerprint,
                        version: 1,
                        confidence: 'estimated',
                    };
            }
            yield statistic_model_1.StatisticModel.updateOne({ _id: context.statisticId, qrCode: context.qrId, 'data.browser': { $exists: false } }, {
                $set: Object.assign(Object.assign({}, changes), { 'data.browser': Object.assign(Object.assign({}, browser), { receivedAt: new Date().toISOString(), source: 'browser-self-reported' }) }),
            });
        });
    }
}
exports.BrowserScanService = BrowserScanService;
function validateBrowserMetrics(body) {
    if (!body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        JSON.stringify(body).length > 8192)
        throw new http_utils_1.HttpError(400, 'Invalid browser metrics');
    const input = body;
    const result = {};
    const strings = {
        pointer: 20,
        connectionType: 30,
        language: 64,
        timezone: 100,
        platform: 100,
        colorScheme: 20,
        orientation: 30,
        effectiveType: 20,
        locationStatus: 40,
        referrerOrigin: 256,
    };
    for (const [field, max] of Object.entries(strings)) {
        if (input[field] !== undefined) {
            if (typeof input[field] !== 'string' || input[field].length > max)
                throw new http_utils_1.HttpError(400, `Invalid ${field}`);
            result[field] = input[field];
        }
    }
    if (input.languages !== undefined) {
        if (!Array.isArray(input.languages) ||
            input.languages.length > 10 ||
            input.languages.some((value) => typeof value !== 'string' || value.length > 64))
            throw new http_utils_1.HttpError(400, 'Invalid languages');
        result.languages = input.languages;
    }
    const numbers = {
        hardwareConcurrency: [0, 4096],
        deviceMemoryGB: [0, 65536],
        availableScreenWidth: [0, 32768],
        availableScreenHeight: [0, 32768],
        colorDepth: [0, 128],
        downlinkMbps: [0, 1000000],
        networkRttMs: [0, 1000000],
        screenWidth: [0, 32768],
        screenHeight: [0, 32768],
        viewportWidth: [0, 32768],
        viewportHeight: [0, 32768],
        pixelRatio: [0, 20],
        maxTouchPoints: [0, 100],
        timezoneOffsetMinutes: [-1440, 1440],
        localHour: [0, 23],
        collectionMs: [0, 60000],
    };
    for (const [field, [min, max]] of Object.entries(numbers)) {
        if (input[field] !== undefined) {
            if (typeof input[field] !== 'number' ||
                !Number.isFinite(input[field]) ||
                input[field] < min ||
                input[field] > max)
                throw new http_utils_1.HttpError(400, `Invalid ${field}`);
            result[field] = input[field];
        }
    }
    for (const field of [
        'online',
        'hover',
        'pdfViewerEnabled',
        'mobileHint',
        'reducedMotion',
        'saveData',
        'cookiesEnabled',
        'webdriver',
        'globalPrivacyControl',
    ]) {
        if (input[field] !== undefined) {
            if (typeof input[field] !== 'boolean')
                throw new http_utils_1.HttpError(400, `Invalid ${field}`);
            result[field] = input[field];
        }
    }
    if (input.browserBrands !== undefined) {
        if (!Array.isArray(input.browserBrands) ||
            input.browserBrands.length > 8 ||
            input.browserBrands.some((item) => !item ||
                typeof item.brand !== 'string' ||
                item.brand.length > 100 ||
                typeof item.version !== 'string' ||
                item.version.length > 40))
            throw new http_utils_1.HttpError(400, 'Invalid browser brands');
        result.browserBrands = input.browserBrands.map((item) => ({
            brand: item.brand,
            version: item.version,
        }));
    }
    if (input.location !== undefined) {
        const location = input.location;
        if (!location ||
            typeof location !== 'object' ||
            input.locationStatus !== 'granted' ||
            location.permissionGranted !== true ||
            typeof location.latitude !== 'number' ||
            !Number.isFinite(location.latitude) ||
            Math.abs(location.latitude) > 90 ||
            typeof location.longitude !== 'number' ||
            !Number.isFinite(location.longitude) ||
            Math.abs(location.longitude) > 180 ||
            typeof location.accuracyMeters !== 'number' ||
            !Number.isFinite(location.accuracyMeters) ||
            location.accuracyMeters < 0 ||
            location.accuracyMeters > 1e7)
            throw new http_utils_1.HttpError(400, 'Invalid permitted location');
        result.location = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracyMeters: location.accuracyMeters,
            permissionGranted: true,
        };
    }
    return result;
}
function browserScanPage(token) {
    const url = `/scan/${token}/continue`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="3;url=${url}"><noscript><meta http-equiv="refresh" content="0;url=${url}"></noscript><title></title><script src="/scan/collect.js" defer data-token="${token}"></script><style>html,body{margin:0;background:#fff}</style></head><body></body></html>`;
}
