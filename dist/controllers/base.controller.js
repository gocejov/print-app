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
exports.BaseController = void 0;
class BaseController {
    constructor(service) {
        this.service = service;
    }
    getAll(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.json(yield this.service.getAll(res.locals.scope));
        });
    }
    findById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.service.findById(req.params.id, res.locals.scope);
            if (!item) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            res.json(item);
        });
    }
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(201).json(yield this.service.add(req.body));
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.service.update(req.params.id, req.body, res.locals.scope);
            if (!item) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            res.json(item);
        });
    }
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.service.remove(req.params.id, res.locals.scope);
            if (!item) {
                res.status(404).json({ error: 'Item not found' });
                return;
            }
            res.json(item);
        });
    }
}
exports.BaseController = BaseController;
