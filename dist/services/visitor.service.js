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
exports.VISITOR_COOKIE = void 0;
exports.visitorId = visitorId;
exports.readVisitor = readVisitor;
exports.privacyPreference = privacyPreference;
exports.identifyVisitor = identifyVisitor;
exports.browserFingerprint = browserFingerprint;
const crypto_1 = require("crypto");
const qrcode_model_1 = require("../models/qrcode.model");
const statistic_model_1 = require("../models/statistic.model");
exports.VISITOR_COOKIE = 'qr2share_visitor';
const secret = () => process.env.VISITOR_SECRET || process.env.SESSION_SECRET || 'local-development-only-secret';
const hash = (value) => (0, crypto_1.createHmac)('sha256', secret()).update(value).digest('hex');
function visitorId(owner, raw) {
    return hash(`visitor:v1:${owner}:${raw}`);
}
function readVisitor(req) {
    var _a, _b;
    const value = (_b = (_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${exports.VISITOR_COOKIE}=`))) === null || _b === void 0 ? void 0 : _b.slice(exports.VISITOR_COOKIE.length + 1);
    if (!value || !/^[a-f0-9]{48}\.[a-f0-9]{64}$/.test(value))
        return;
    const [raw, signature] = value.split('.');
    if ((0, crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(hash(`cookie:v1:${raw}`))))
        return raw;
}
function privacyPreference(req) {
    return req.get('sec-gpc') === '1';
}
function identifyVisitor(req, res, owner) {
    return __awaiter(this, void 0, void 0, function* () {
        if (privacyPreference(req)) {
            res.clearCookie(exports.VISITOR_COOKIE, { path: '/' });
            return { method: 'unrecognized', reason: 'privacy-preference' };
        }
        const previous = readVisitor(req);
        const raw = previous || (0, crypto_1.randomBytes)(24).toString('hex');
        if (!previous)
            res.cookie(exports.VISITOR_COOKIE, `${raw}.${hash(`cookie:v1:${raw}`)}`, {
                httpOnly: true,
                secure: req.secure || process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 180 * 86400000,
                path: '/',
            });
        const id = visitorId(owner, raw);
        const codes = yield qrcode_model_1.QrCodeModel.find({ createdBy: owner }).select('_id');
        const returning = Boolean(yield statistic_model_1.StatisticModel.exists({
            qrCode: { $in: codes.map((code) => code._id) },
            'data.visitor.id': id,
            'data.visitor.confirmed': true,
        }));
        return {
            id,
            method: 'first-party-cookie',
            confirmed: Boolean(previous),
            audience: returning ? 'returning' : 'new',
        };
    });
}
/** Diagnostic similarity only: never restore a cleared cookie or merge cookie identities. */
function browserFingerprint(owner, browser, ua) {
    var _a, _b;
    const fields = [
        browser.language,
        browser.timezone,
        browser.platform,
        browser.screenWidth,
        browser.screenHeight,
        browser.pixelRatio,
        browser.maxTouchPoints,
        (_a = ua === null || ua === void 0 ? void 0 : ua.browser) === null || _a === void 0 ? void 0 : _a.name,
        (_b = ua === null || ua === void 0 ? void 0 : ua.os) === null || _b === void 0 ? void 0 : _b.name,
    ];
    if (fields.slice(0, 7).filter((value) => value !== undefined && value !== '').length < 6)
        return;
    return hash(`fingerprint:v1:${owner}:${JSON.stringify(fields)}`);
}
