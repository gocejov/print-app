"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFingerprint = void 0;
const crypto_1 = __importDefault(require("crypto"));
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const UAParser = __importStar(require("ua-parser-js"));
exports.DeviceFingerprint = {
    get: (req) => {
        var _a, _b, _c, _d;
        // 1. Correct IP extraction
        const forwarded = req.headers["x-forwarded-for"];
        const ip = typeof forwarded === "string"
            ? forwarded.split(",")[0].trim()
            : (req.ip || "");
        // 2. Parse user-agent properly
        const uaRaw = req.headers["user-agent"] || "unknown";
        const ua = new UAParser.UAParser(uaRaw).getResult();
        // 3. Language normalization
        const language = ((_a = req.headers["accept-language"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) || "unknown";
        // 4. Optional client-provided values (only if sent)
        const screenWidth = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.screenWidth) || "unknown";
        const screenHeight = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.screenHeight) || "unknown";
        const timezone = ((_d = req.body) === null || _d === void 0 ? void 0 : _d.timezone) || "unknown";
        // 5. Geo lookup (analytics only)
        const geo = ip ? geoip_lite_1.default.lookup(ip) : null;
        // 6. Stable fingerprint string (NO GEO inside)
        const fingerprintSource = [
            ua.browser.name,
            ua.os.name,
            language,
            screenWidth,
            screenHeight,
            timezone,
        ].join("|");
        // 7. Hash fingerprint
        const fingerprint = crypto_1.default
            .createHash("sha256")
            .update(fingerprintSource)
            .digest("hex");
        return {
            fingerprint,
            data: {
                ip,
                ipHash: crypto_1.default.createHash("sha256").update(ip).digest("hex"),
                ua,
                language,
                screenWidth,
                screenHeight,
                timezone,
                geo,
            },
        };
    },
};
