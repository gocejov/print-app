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
exports.summarizeVisitorProfile = summarizeVisitorProfile;
exports.getVisitorProfile = getVisitorProfile;
const statistic_model_1 = require("../models/statistic.model");
const http_utils_1 = require("../utils/http.utils");
/** Derived evidence only. Does not assert personal identity, interests or rule eligibility. */
function summarizeVisitorProfile(scans, basis, id, now = new Date()) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const sorted = [...scans].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const latest = sorted[sorted.length - 1];
    const counters = (field) => {
        const counts = new Map();
        for (const scan of sorted) {
            const value = scan[field];
            if (!value)
                continue;
            const key = String(value);
            const previous = counts.get(key);
            counts.set(key, {
                id: key,
                scans: ((previous === null || previous === void 0 ? void 0 : previous.scans) || 0) + 1,
                lastSeen: new Date(scan.created_at).toISOString(),
            });
        }
        return [...counts.values()]
            .sort((a, b) => b.scans - a.scans || a.id.localeCompare(b.id))
            .slice(0, 50);
    };
    const fingerprints = [
        ...new Set(sorted.map((scan) => { var _a, _b; return (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.browserFingerprint) === null || _b === void 0 ? void 0 : _b.hash; }).filter(Boolean)),
    ];
    const visitorIds = [
        ...new Set(sorted
            .filter((scan) => { var _a, _b; return (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.confirmed; })
            .map((scan) => { var _a, _b; return (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.id; })
            .filter(Boolean)),
    ];
    const day = now.toISOString().slice(0, 10);
    const days = new Set(sorted.map((scan) => new Date(scan.created_at).toISOString().slice(0, 10)));
    const sources = new Map();
    for (const scan of sorted) {
        const source = (_d = (_c = (_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.request) === null || _b === void 0 ? void 0 : _b.query) === null || _c === void 0 ? void 0 : _c.find(([key]) => key === 'utm_source')) === null || _d === void 0 ? void 0 : _d[1];
        if (source)
            sources.set(source, (sources.get(source) || 0) + 1);
    }
    return {
        id,
        basis,
        confidence: basis === 'visitor' ? 'recognized-browser' : 'estimated-similarity',
        firstSeen: ((_e = sorted[0]) === null || _e === void 0 ? void 0 : _e.created_at) || null,
        lastSeen: (latest === null || latest === void 0 ? void 0 : latest.created_at) || null,
        counters: {
            totalScans: sorted.length,
            repeatScans: Math.max(0, sorted.length - 1),
            activeDaysUTC: days.size,
            scansTodayUTC: sorted.filter((scan) => new Date(scan.created_at).toISOString().slice(0, 10) === day).length,
            scansLast7Days: sorted.filter((scan) => +new Date(scan.created_at) >= +now - 7 * 86400000 && +new Date(scan.created_at) <= +now).length,
        },
        activity: {
            qrCodes: counters('qrCode'),
            products: counters('product'),
            campaigns: counters('campaign'),
            sources: [...sources]
                .map(([source, scans]) => ({ source, scans }))
                .sort((a, b) => b.scans - a.scans)
                .slice(0, 50),
        },
        identityEvidence: {
            matchedVisitorCount: visitorIds.length,
            visitorIds: visitorIds.slice(0, 50),
            fingerprintCount: fingerprints.length,
            fingerprints: fingerprints.slice(0, 50),
        },
        latestSignals: {
            browser: ((_f = latest === null || latest === void 0 ? void 0 : latest.data) === null || _f === void 0 ? void 0 : _f.browser) || null,
            server: ((_g = latest === null || latest === void 0 ? void 0 : latest.data) === null || _g === void 0 ? void 0 : _g.fingerprintData) || null,
            request: ((_h = latest === null || latest === void 0 ? void 0 : latest.data) === null || _h === void 0 ? void 0 : _h.request) || null,
        },
        limitations: 'Browser observations and scan frequencies, not verified personal identity or interests. Fingerprint groups may include different people. Counters do not authorize access or issue rewards.',
        generatedAt: now.toISOString(),
    };
}
function getVisitorProfile(scope, id, basis) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!/^[a-f0-9]{64}$/.test(id))
            throw new http_utils_1.HttpError(400, 'Invalid visitor or fingerprint ID');
        const match = basis === 'visitor'
            ? { 'data.visitor.id': id, 'data.visitor.confirmed': true }
            : { 'data.browserFingerprint.hash': id };
        const scans = yield statistic_model_1.StatisticModel.find({ $and: [scope, match] })
            .select('qrCode product campaign created_at data')
            .lean();
        if (!scans.length)
            throw new http_utils_1.HttpError(404, 'Visitor profile not found');
        return summarizeVisitorProfile(scans, basis, id);
    });
}
