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
require("express-serve-static-core");
const userIdentificationMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Generate device fingerprint (browser characteristics + device info)
    const { fingerprint, data } = device_fingerprint_utils_1.DeviceFingerprint.get(req);
    // Attach to request
    res.locals.fingerprint = fingerprint;
    res.locals.fingerprintData = data;
    //TODO  // // // await identifyUser(ip, fingerprint, geo, req.session);
    next();
});
exports.userIdentificationMiddleware = userIdentificationMiddleware;
