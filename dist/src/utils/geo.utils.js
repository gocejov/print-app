"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIPClose = void 0;
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const isIPClose = (previousIP, currentIP) => {
    const prevGeo = geoip_lite_1.default.lookup(previousIP);
    const currGeo = geoip_lite_1.default.lookup(currentIP);
    if (prevGeo && currGeo) {
        // Check if IPs are from the same region or country
        return prevGeo.country === currGeo.country;
    }
    return false;
};
exports.isIPClose = isIPClose;
