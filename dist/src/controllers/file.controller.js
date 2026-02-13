"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const base_controller_1 = require("./base.controller");
const file_service_1 = require("../services/file.service");
class FileController extends base_controller_1.BaseController {
    constructor() {
        super(new file_service_1.FileService());
    }
}
exports.FileController = FileController;
