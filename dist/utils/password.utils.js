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
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = require("crypto");
const util_1 = require("util");
const scrypt = (0, util_1.promisify)(crypto_1.scrypt);
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = (0, crypto_1.randomBytes)(16).toString('hex');
        const key = yield scrypt(password, salt, 64);
        return `scrypt$${salt}$${key.toString('hex')}`;
    });
}
function verifyPassword(password, encoded) {
    return __awaiter(this, void 0, void 0, function* () {
        if (/^\$2[aby]\$/.test(encoded)) {
            // Keep existing bcrypt accounts usable; new passwords use scrypt.
            return new Promise(resolve => {
                require('bcrypt-nodejs').compare(password, encoded, (err, match) => resolve(!err && match));
            });
        }
        const parts = encoded.split('$');
        if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2]))
            return false;
        const actual = yield scrypt(password, parts[1], 64);
        return (0, crypto_1.timingSafeEqual)(actual, Buffer.from(parts[2], 'hex'));
    });
}
