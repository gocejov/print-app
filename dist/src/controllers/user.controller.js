"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const base_controller_1 = require("./base.controller");
const user_service_1 = require("../services/user.service");
class UserController extends base_controller_1.BaseController {
    constructor() {
        super(new user_service_1.UserService());
    }
    login() {
        throw new Error('Method not implemented.');
    }
}
exports.UserController = UserController;
