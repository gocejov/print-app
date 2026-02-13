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
    getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const items = yield this.service.getAll();
                res.json(items);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
    findById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const item = yield this.service.findById(req.params.id);
                if (!item) {
                    res.status(404).json({ error: 'Item not found' });
                    return;
                }
                res.json(item);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newItem = yield this.service.add(req.body);
                res.status(201).json(newItem);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedItem = yield this.service.update(req.params.id, req.body);
                if (!updatedItem) {
                    res.status(404).json({ error: 'Item not found' });
                    return;
                }
                res.json(updatedItem);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedItem = yield this.service.remove(req.params.id);
                if (!deletedItem) {
                    res.status(404).json({ error: 'Item not found' });
                    return;
                }
                res.json(deletedItem);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.BaseController = BaseController;
