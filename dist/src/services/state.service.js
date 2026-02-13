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
exports.cleaAllStates = exports.getAllStates = void 0;
const redis_config_1 = require("../config/redis.config");
const setState = (key_1, value_1, ...args_1) => __awaiter(void 0, [key_1, value_1, ...args_1], void 0, function* (key, value, time = null) {
    if (!time) {
        yield redis_config_1.redisClient.set(key, JSON.stringify(value));
    }
    else {
        yield redis_config_1.redisClient.setex(key, time, JSON.stringify(value));
    }
});
const getState = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield redis_config_1.redisClient.get(key);
    if (data)
        return JSON.parse(data);
    return null;
});
const getAllStates = () => __awaiter(void 0, void 0, void 0, function* () {
    const keys = yield redis_config_1.redisClient.keys('*');
    const state = {};
    for (const key of keys) {
        const value = yield redis_config_1.redisClient.get(key);
        if (value !== null) {
            state[key] = value;
        }
    }
    return state;
});
exports.getAllStates = getAllStates;
const cleaAllStates = () => __awaiter(void 0, void 0, void 0, function* () {
    return redis_config_1.redisClient.flushall();
});
exports.cleaAllStates = cleaAllStates;
exports.default = { setState, getState, getAllStates: exports.getAllStates, cleaAllStates: exports.cleaAllStates, redis: redis_config_1.redisClient };
