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
exports.UserController = void 0;
const base_controller_1 = require("./base.controller");
const user_model_1 = require("../models/user.model");
const user_service_1 = require("../services/user.service");
const http_utils_1 = require("../utils/http.utils");
const password_utils_1 = require("../utils/password.utils");
class UserController extends base_controller_1.BaseController {
    constructor() { super(new user_service_1.UserService()); }
    establishSession(req, user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
            req.session.userId = String(user._id);
            req.session.authVersion = user.authVersion || 0;
            yield new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        });
    }
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = (0, http_utils_1.objectBody)(req.body, ['name', 'lastName', 'email', 'password']);
            const user = yield user_model_1.UserModel.create({
                name: (0, http_utils_1.text)(body.name, 'name'), lastName: (0, http_utils_1.text)(body.lastName, 'lastName'),
                email: (0, http_utils_1.emailInput)(body.email), password: (0, http_utils_1.passwordInput)(body.password)
            });
            yield this.establishSession(req, user);
            res.status(201).json(user);
        });
    }
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = (0, http_utils_1.objectBody)(req.body, ['email', 'password']);
            const email = (0, http_utils_1.emailInput)(body.email);
            if (typeof body.password !== 'string' || !body.password.length || body.password.length > 128)
                throw new http_utils_1.HttpError(400, 'Invalid password');
            const user = yield user_model_1.UserModel.findOne({ email }).select('+password');
            if (!user || !(yield (0, password_utils_1.verifyPassword)(body.password, user.password)))
                throw new http_utils_1.HttpError(401, 'Invalid email or password');
            yield this.establishSession(req, user);
            res.json(user);
        });
    }
    logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
            res.clearCookie('connect.sid', { path: '/' });
            res.status(204).end();
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = (0, http_utils_1.objectBody)(req.body, ['name', 'lastName', 'email', 'password', 'currentPassword', 'alias', 'useAlias']);
            const user = yield user_model_1.UserModel.findById(res.locals.user._id).select('+password');
            if (!user)
                throw new http_utils_1.HttpError(404, 'User not found');
            if (body.email !== undefined || body.password !== undefined) {
                if (typeof body.currentPassword !== 'string' || !(yield (0, password_utils_1.verifyPassword)(body.currentPassword, user.password)))
                    throw new http_utils_1.HttpError(403, 'Current password is required');
            }
            for (const field of ['name', 'lastName'])
                if (body[field] !== undefined)
                    user[field] = (0, http_utils_1.text)(body[field], field);
            if (body.email !== undefined)
                user.email = (0, http_utils_1.emailInput)(body.email);
            if (body.alias !== undefined) {
                const alias = (0, http_utils_1.text)(body.alias, 'alias', 1, 40);
                if (!/^[a-zA-Z0-9_-]+$/.test(alias) || ['api', 'api-docs', 'l', 'crud', 'admin'].includes(alias))
                    throw new http_utils_1.HttpError(400, 'Invalid alias');
                user.alias = alias;
            }
            if (body.useAlias !== undefined) {
                if (typeof body.useAlias !== 'boolean')
                    throw new http_utils_1.HttpError(400, 'Invalid useAlias');
                user.useAlias = body.useAlias;
            }
            if (body.password !== undefined) {
                user.password = (0, http_utils_1.passwordInput)(body.password);
                user.authVersion = (user.authVersion || 0) + 1;
            }
            yield user.save();
            if (body.password !== undefined)
                yield this.establishSession(req, user);
            res.json(user);
        });
    }
}
exports.UserController = UserController;
