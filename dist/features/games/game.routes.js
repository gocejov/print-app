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
exports.gamePublicRoutes = exports.gameManagementRoutes = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const http_utils_1 = require("../../utils/http.utils");
const qrcode_model_1 = require("../../models/qrcode.model");
const redis_config_1 = require("../../config/redis.config");
const visitor_service_1 = require("../../services/visitor.service");
const game_models_1 = require("./game.models");
const game_service_1 = require("./game.service");
const game_page_1 = require("./game.page");
exports.gameManagementRoutes = (0, express_1.Router)();
exports.gameManagementRoutes.get('/', (0, http_utils_1.asyncHandler)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const games = yield game_models_1.GameModel.find({ createdBy: res.locals.user._id }).sort({ _id: -1 }).lean();
    const codes = yield qrcode_model_1.QrCodeModel.find({
        createdBy: res.locals.user._id,
        game: { $in: games.map((g) => g._id) },
    }).lean();
    const totals = yield game_models_1.ParticipantModel.aggregate([
        { $match: { game: { $in: games.map((g) => g._id) } } },
        { $group: { _id: '$game', count: { $sum: 1 } } },
    ]);
    res.set('Cache-Control', 'no-store').json(games.map((g) => {
        var _a;
        return (Object.assign(Object.assign({}, g), { code: codes.find((c) => String(c._id) === String(g.qrCode)), participants: ((_a = totals.find((t) => String(t._id) === String(g._id))) === null || _a === void 0 ? void 0 : _a.count) || 0 }));
    }));
})));
exports.gameManagementRoutes.post('/', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = (0, http_utils_1.objectBody)(req.body, ['name', 'welcome']);
    res
        .status(201)
        .json(yield (0, game_service_1.createGame)(String(res.locals.user._id), (0, game_service_1.plainText)(body.name, 'name', 120), (0, game_service_1.plainText)(body.welcome, 'welcome message', 1000), `${req.protocol}://${req.get('host')}`));
})));
function rateLimit(key, max, seconds) {
    return __awaiter(this, void 0, void 0, function* () {
        const full = `${process.env.SESSION_KEY_PREFIX || 'sess:'}game-limit:${key}`;
        const count = (yield redis_config_1.redisClient.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, full, seconds));
        if (count > max)
            throw new http_utils_1.HttpError(429, 'Too many attempts. Please try again later.');
    });
}
exports.gamePublicRoutes = (0, express_1.Router)();
exports.gamePublicRoutes.use((_req, res, next) => {
    res
        .set('Cache-Control', 'no-store')
        .vary('Cookie')
        .set('Referrer-Policy', 'no-referrer')
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY');
    res.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
});
exports.gamePublicRoutes.use((0, http_utils_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.get('origin');
        if (req.get('sec-fetch-site') === 'cross-site' ||
            (origin && origin !== `${req.protocol}://${req.get('host')}`))
            throw new http_utils_1.HttpError(403, 'Cross-origin game update rejected');
        if (!req.is('application/json'))
            throw new http_utils_1.HttpError(415, 'Use application/json');
    }
    next();
})));
exports.gamePublicRoutes.get('/:gameId', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    (0, game_service_1.gameSession)(req, res, String(game._id), true);
    res.type('html').send((0, game_page_1.gamePage)(String(game._id), game.name, game.welcome));
})));
exports.gamePublicRoutes.get('/:gameId/state', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const tokenHash = (0, game_service_1.gameSession)(req, res, String(game._id));
    const player = yield game_models_1.ParticipantModel.findOne({ game: game._id, tokenHash })
        .select('_id name')
        .lean();
    res.json({
        game: { id: game._id, name: game.name, welcome: game.welcome, kind: game.kind },
        participant: player,
    });
})));
exports.gamePublicRoutes.post('/:gameId/join', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const tokenHash = (0, game_service_1.gameSession)(req, res, String(game._id));
    const body = (0, http_utils_1.objectBody)(req.body, ['name']);
    const name = (0, game_service_1.plainText)(body.name, 'display name', 60).replace(/\s+/g, ' ');
    const existing = yield game_models_1.ParticipantModel.findOne({ game: game._id, tokenHash }).select('_id name');
    if (existing) {
        res.json(existing);
        return;
    }
    yield rateLimit(`join:${game._id}:${(0, crypto_1.createHash)('sha256')
        .update(req.ip || 'unknown')
        .digest('hex')}`, 30, 600);
    const raw = (0, visitor_service_1.readVisitor)(req);
    try {
        const player = yield game_models_1.ParticipantModel.findOneAndUpdate({ game: game._id, tokenHash }, {
            $setOnInsert: Object.assign({ name, nameKey: name.normalize('NFKC').toLowerCase() }, (raw && !(0, visitor_service_1.privacyPreference)(req)
                ? { visitorId: (0, visitor_service_1.visitorId)(String(game.createdBy), raw) }
                : {})),
        }, { upsert: true, new: true, runValidators: true }).select('_id name');
        res.status(201).json(player);
    }
    catch (error) {
        if (error.code === 11000)
            throw new http_utils_1.HttpError(409, 'That name is already used in this game. Choose another.');
        throw error;
    }
})));
exports.gamePublicRoutes.get('/:gameId/participants', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const player = yield (0, game_service_1.participant)(req, res, String(game._id));
    const after = req.query.after === undefined ? undefined : (0, game_service_1.gameId)(req.query.after);
    const search = req.query.search === undefined ? '' : (0, game_service_1.plainText)(req.query.search, 'search', 60);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rows = yield game_models_1.ParticipantModel.find(Object.assign({ game: game._id, _id: Object.assign({ $ne: player._id }, (after ? { $gt: after } : {})) }, (search ? { name: { $regex: escaped, $options: 'i' } } : {})))
        .sort({ _id: 1 })
        .limit(101)
        .select('_id name')
        .lean();
    res.json({
        participants: rows.slice(0, 100),
        next: rows.length > 100 ? String(rows[99]._id) : null,
    });
})));
exports.gamePublicRoutes.post('/:gameId/messages', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const sender = yield (0, game_service_1.participant)(req, res, String(game._id));
    const body = (0, http_utils_1.objectBody)(req.body, ['recipientId', 'text', 'requestId']);
    const recipient = (0, game_service_1.gameId)(body.recipientId);
    const message = (0, game_service_1.plainText)(body.text, 'message', 2000);
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId))
        throw new http_utils_1.HttpError(400, 'Invalid request ID');
    if (recipient === String(sender._id))
        throw new http_utils_1.HttpError(400, 'Choose another participant');
    if (!(yield game_models_1.ParticipantModel.exists({ _id: recipient, game: game._id })))
        throw new http_utils_1.HttpError(404, 'Participant not found in this game');
    const key = { game: game._id, sender: sender._id, requestId: body.requestId };
    const existing = yield game_models_1.GameMessageModel.findOne(key).select('_id recipient text');
    if (existing) {
        if (String(existing.recipient) !== recipient || existing.text !== message)
            throw new http_utils_1.HttpError(409, 'This request was already used for a different message');
        res.json({ id: existing._id });
        return;
    }
    yield rateLimit(`send:${game._id}:${sender._id}`, 20, 60);
    // Atomic upsert makes retries safe, including simultaneous requests.
    let saved;
    try {
        saved = yield game_models_1.GameMessageModel.findOneAndUpdate(key, { $setOnInsert: { recipient, text: message } }, { upsert: true, new: true, runValidators: true });
    }
    catch (error) {
        if (error.code !== 11000)
            throw error;
        saved = yield game_models_1.GameMessageModel.findOne(key);
        if (!saved)
            throw error;
    }
    if (String(saved.recipient) !== recipient || saved.text !== message)
        throw new http_utils_1.HttpError(409, 'This request was already used for a different message');
    res.status(201).json({ id: saved._id });
})));
exports.gamePublicRoutes.get('/:gameId/messages', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const player = yield (0, game_service_1.participant)(req, res, String(game._id));
    const status = req.query.status || 'unread';
    if (status !== 'unread' && status !== 'read')
        throw new http_utils_1.HttpError(400, 'Invalid inbox status');
    const after = req.query.after === undefined ? undefined : (0, game_service_1.gameId)(req.query.after);
    const scope = { game: game._id, recipient: player._id };
    const rows = yield game_models_1.GameMessageModel.find(Object.assign(Object.assign(Object.assign({}, scope), { readAt: status === 'read' ? { $ne: null } : null }), (after ? { _id: { $gt: after } } : {})))
        .sort({ _id: 1 })
        .limit(2)
        .populate('sender', 'name')
        .lean();
    const item = rows[0];
    res.json({
        message: item
            ? {
                id: item._id,
                text: item.text,
                senderName: ((_a = item.sender) === null || _a === void 0 ? void 0 : _a.name) || 'Participant',
                createdAt: item.createdAt,
                readAt: item.readAt,
            }
            : null,
        hasMore: rows.length > 1,
        unreadCount: yield game_models_1.GameMessageModel.countDocuments(Object.assign(Object.assign({}, scope), { readAt: null })),
        readCount: yield game_models_1.GameMessageModel.countDocuments(Object.assign(Object.assign({}, scope), { readAt: { $ne: null } })),
    });
})));
exports.gamePublicRoutes.post('/:gameId/messages/:messageId/read', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { game } = yield (0, game_service_1.loadGame)(req.params.gameId);
    const player = yield (0, game_service_1.participant)(req, res, String(game._id));
    (0, http_utils_1.objectBody)(req.body, []);
    const scope = { _id: (0, game_service_1.gameId)(req.params.messageId), game: game._id, recipient: player._id };
    if (!(yield game_models_1.GameMessageModel.exists(scope)))
        throw new http_utils_1.HttpError(404, 'Message not found');
    yield game_models_1.GameMessageModel.updateOne(Object.assign(Object.assign({}, scope), { readAt: null }), { $set: { readAt: new Date() } });
    res.sendStatus(204);
})));
