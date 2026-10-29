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
exports.limitAuthAttempts = exports.protectWrites = exports.requireAuth = void 0;
const user_model_1 = require("../models/user.model");
const redis_config_1 = require("../config/redis.config");
const crypto_1 = require("crypto");
const http_utils_1 = require("../utils/http.utils");
exports.requireAuth = (0, http_utils_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.session.userId)
        throw new http_utils_1.HttpError(401, 'Login required');
    const user = yield user_model_1.UserModel.findById(req.session.userId);
    if (!user || (user.authVersion || 0) !== req.session.authVersion)
        throw new http_utils_1.HttpError(401, 'Login required');
    res.locals.user = user;
    next();
}));
// CORS alone does not stop cross-site writes when production cookies use SameSite=None.
const protectWrites = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }
    const origin = req.get('origin');
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3001').split(',').map(value => value.trim());
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if ((origin && origin !== ownOrigin && !allowed.includes(origin)) || (!origin && req.get('sec-fetch-site') === 'cross-site')) {
        next(new http_utils_1.HttpError(403, 'Origin not allowed'));
        return;
    }
    if (!req.is('application/json') && !req.is('multipart/form-data')) {
        next(new http_utils_1.HttpError(415, 'Use application/json or multipart/form-data'));
        return;
    }
    next();
};
exports.protectWrites = protectWrites;
exports.limitAuthAttempts = (0, http_utils_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const key = `${process.env.SESSION_KEY_PREFIX || 'sess:'}auth-attempts:${(0, crypto_1.createHash)('sha256').update(req.socket.remoteAddress || 'unknown').digest('hex')}`;
    const count = yield redis_config_1.redisClient.eval("local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n", 1, key);
    if (count > 30) {
        res.setHeader('Retry-After', '900');
        throw new http_utils_1.HttpError(429, 'Too many authentication attempts; try again later');
    }
    next();
}));
