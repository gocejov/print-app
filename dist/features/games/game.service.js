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
exports.gameId = gameId;
exports.plainText = plainText;
exports.loadGame = loadGame;
exports.gameSession = gameSession;
exports.participant = participant;
exports.createGame = createGame;
const space_service_1 = require("../spaces/space.service");
const plugin_registry_1 = require("../plugins/plugin.registry");
const crypto_1 = require("crypto");
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
        const { space, code, plugin } = yield (0, space_service_1.loadSpace)(id);
        if (plugin.id !== 'message-circle')
            throw new http_utils_1.HttpError(404, 'This space does not use Message Circle');
        space.welcome = (0, plugin_registry_1.spaceConfiguration)(space).welcome;
        return { game: space, code };
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
        return (0, space_service_1.createSpace)(owner, { pluginId: 'message-circle', name, configuration: { welcome } }, origin, true);
    });
}
