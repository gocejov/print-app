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
exports.SpaceModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Keep the original collection/model identity so existing games, QRs and memberships survive.
const schema = new mongoose_1.Schema({
    pluginId: { type: String, maxlength: 80 },
    pluginVersion: { type: Number, min: 1 },
    configuration: { type: mongoose_1.Schema.Types.Mixed },
    kind: { type: String, default: 'message-circle' }, // Legacy plugin key.
    name: { type: String, required: true, maxlength: 120 },
    welcome: { type: String, maxlength: 1000 }, // Legacy Message Circle configuration.
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    qrCode: { type: mongoose_1.Schema.Types.ObjectId, ref: 'qrcodes', required: true, unique: true },
}, { timestamps: true });
schema.index({ createdBy: 1, pluginId: 1 });
exports.SpaceModel = mongoose_1.default.model('games', schema);
