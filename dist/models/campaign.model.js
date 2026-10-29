"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const entrySchema = new mongoose_1.Schema({
    kind: { type: String, enum: ['product', 'category'], required: true },
    target: { type: mongoose_1.Schema.Types.ObjectId, required: true },
}, { _id: false });
const weightSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'products', required: true },
    weight: { type: Number, required: true, min: 1, max: 1000, validate: Number.isInteger },
}, { _id: false });
const schema = new mongoose_1.Schema({
    name: { type: String, required: true, maxlength: 120, trim: true },
    description: { type: String, maxlength: 1000, default: '' },
    rule: { type: String, enum: ['random'], default: 'random' },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    entries: { type: [entrySchema], default: [] },
    productWeights: { type: [weightSchema], default: [] },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});
exports.CampaignModel = mongoose_1.default.model('campaigns', schema);
