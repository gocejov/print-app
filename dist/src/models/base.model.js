"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSchema = void 0;
const mongoose_1 = require("mongoose");
exports.BaseSchema = new mongoose_1.Schema({
    updated_at: { type: Date, required: true },
    created_at: { type: Date, required: true },
});
