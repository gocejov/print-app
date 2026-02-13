"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const base_service_1 = require("./base.service");
const user_model_1 = require("../models/user.model");
class UserService extends base_service_1.BaseService {
    constructor() {
        super(user_model_1.UserModel);
    }
}
exports.UserService = UserService;
