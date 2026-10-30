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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameId = gameId;
exports.plainText = plainText;
exports.loadGame = loadGame;
exports.gameSession = gameSession;
exports.participant = participant;
exports.createGame = createGame;
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = require("crypto");
const qrcode_model_1 = require("../../models/qrcode.model");
const qrcode_service_1 = require("../../services/qrcode.service");
const user_model_1 = require("../../models/user.model");
const http_utils_1 = require("../../utils/http.utils");
const game_models_1 = require("./game.models");
function gameId(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
        throw new http_utils_1.HttpError(400, 'Invalid game ID');
    return value;
}
function plainText(value, field, max) {
    const result = (0, http_utils_1.text)(value, field, 1, max);
    if ([...result].some((c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'))
        throw new http_utils_1.HttpError(400, `Invalid ${field}`);
    return result;
}
function loadGame(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const game = yield game_models_1.GameModel.findById(gameId(id));
        if (!game)
            throw new http_utils_1.HttpError(404, 'Game not found');
        const code = yield qrcode_model_1.QrCodeModel.findOne({
            _id: game.qrCode,
            game: game._id,
            createdBy: game.createdBy,
        });
        if (!code)
            throw new http_utils_1.HttpError(410, 'This game is no longer available');
        if (code.status === 'paused')
            throw new http_utils_1.HttpError(410, 'This game is paused');
        return { game, code };
    });
}
function gameSession(req, res, id, issue = false) {
    var _a, _b;
    const key = `qr2share_play_${id}`;
    let raw = (_b = (_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${key}=`))) === null || _b === void 0 ? void 0 : _b.slice(key.length + 1);
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) {
        if (!issue)
            throw new http_utils_1.HttpError(401, 'Enable cookies and open the game again to join');
        raw = (0, crypto_1.randomBytes)(32).toString('hex');
        res.cookie(key, raw, {
            httpOnly: true,
            sameSite: 'lax',
            secure: req.secure || process.env.NODE_ENV === 'production',
            path: `/games/${id}`,
            maxAge: 180 * 86400000,
        });
    }
    return (0, crypto_1.createHash)('sha256').update(`game:${id}:${raw}`).digest('hex');
}
function participant(req, res, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenHash = gameSession(req, res, id);
        const player = yield game_models_1.ParticipantModel.findOne({ game: id, tokenHash });
        if (!player)
            throw new http_utils_1.HttpError(401, 'Join this game first');
        return player;
    });
}
function createGame(owner, name, welcome, origin) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_model_1.UserModel.findById(owner);
        if (!user)
            throw new http_utils_1.HttpError(401, 'Login required');
        const id = new mongoose_1.default.Types.ObjectId(), qrId = new mongoose_1.default.Types.ObjectId();
        const base = (process.env.PUBLIC_URL || origin).replace(/\/$/, '');
        const url = `${base}/${user.useAlias ? user.alias : 'q'}/${qrId}`;
        const image = yield new qrcode_service_1.QrCodeService().generateQrCodeBase64Url(url);
        try {
            const game = yield game_models_1.GameModel.create({ _id: id, name, welcome, createdBy: owner, qrCode: qrId });
            const code = yield qrcode_model_1.QrCodeModel.create({
                _id: qrId,
                name,
                game: id,
                createdBy: owner,
                owner,
                url,
                qrCode: image,
                status: 'active',
            });
            return Object.assign(Object.assign({}, game.toObject()), { code });
        }
        catch (error) {
            yield Promise.allSettled([
                game_models_1.GameModel.deleteOne({ _id: id }),
                qrcode_model_1.QrCodeModel.deleteOne({ _id: qrId }),
            ]);
            throw error;
        }
    });
}
