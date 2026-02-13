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
exports.userIdentificationMiddleware = void 0;
// import { identifyUser } from '../controllers/userController';
const device_fingerprint_utils_1 = require("../utils/device.fingerprint.utils");
const userIdentificationMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = req.ip; // Client's IP address
    const userAgent = req.headers['user-agent']; // User-Agent for fingerprinting
    const geo = req.geo || {}; // Geolocation info based on IP (using geoip)
    // Generate device fingerprint (browser characteristics + device info)
    const fingerprint = device_fingerprint_utils_1.DeviceFingerprint.get(userAgent, req);
    // Identify user or create a new user session
    //TODO  // // // await identifyUser(ip, fingerprint, geo, req.session);
    next();
});
exports.userIdentificationMiddleware = userIdentificationMiddleware;
