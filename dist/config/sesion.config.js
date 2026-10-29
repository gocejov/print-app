"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = require("connect-redis");
const redis_config_1 = require("../config/redis.config");
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET)
    throw new Error('SESSION_SECRET is required in production');
exports.default = (0, express_session_1.default)({
    store: new connect_redis_1.RedisStore({ client: redis_config_1.redisClient, prefix: process.env.SESSION_KEY_PREFIX || 'sess:' }),
    secret: process.env.SESSION_SECRET || 'local-development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // One day
    },
});
