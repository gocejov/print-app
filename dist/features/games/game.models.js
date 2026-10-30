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
exports.GameMessageModel = exports.ParticipantModel = exports.GameModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// The kind selects an experience; participant identity and messages remain scoped to one game.
const gameSchema = new mongoose_1.Schema({
    kind: { type: String, enum: ['message-circle'], default: 'message-circle', required: true },
    name: { type: String, required: true, maxlength: 120 },
    welcome: { type: String, required: true, maxlength: 1000 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    qrCode: { type: mongoose_1.Schema.Types.ObjectId, ref: 'qrcodes', required: true, unique: true },
}, { timestamps: true });
const participantSchema = new mongoose_1.Schema({
    game: { type: mongoose_1.Schema.Types.ObjectId, ref: 'games', required: true },
    tokenHash: { type: String, required: true, select: false },
    name: { type: String, required: true, maxlength: 60 },
    nameKey: { type: String, required: true, select: false },
    visitorId: { type: String, select: false },
}, { timestamps: true });
participantSchema.index({ game: 1, tokenHash: 1 }, { unique: true });
participantSchema.index({ game: 1, nameKey: 1 }, { unique: true });
const messageSchema = new mongoose_1.Schema({
    game: { type: mongoose_1.Schema.Types.ObjectId, ref: 'games', required: true },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'game-participants', required: true },
    recipient: { type: mongoose_1.Schema.Types.ObjectId, ref: 'game-participants', required: true },
    kind: { type: String, enum: ['text'], default: 'text' },
    text: { type: String, required: true, maxlength: 2000 },
    requestId: { type: String, required: true },
    readAt: { type: Date, default: null },
}, { timestamps: true });
messageSchema.index({ game: 1, recipient: 1, readAt: 1, _id: 1 });
messageSchema.index({ game: 1, sender: 1, requestId: 1 }, { unique: true });
exports.GameModel = mongoose_1.default.model('games', gameSchema);
exports.ParticipantModel = mongoose_1.default.model('game-participants', participantSchema);
exports.GameMessageModel = mongoose_1.default.model('game-messages', messageSchema);
