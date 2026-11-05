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
exports.spaceId = spaceId;
exports.spaceView = spaceView;
exports.loadSpace = loadSpace;
exports.createSpace = createSpace;
exports.listSpaces = listSpaces;
exports.editSpace = editSpace;
const mongoose_1 = __importDefault(require("mongoose"));
const space_model_1 = require("./space.model");
const qrcode_model_1 = require("../../models/qrcode.model");
const qrcode_service_1 = require("../../services/qrcode.service");
const user_model_1 = require("../../models/user.model");
const http_utils_1 = require("../../utils/http.utils");
const plugin_registry_1 = require("../plugins/plugin.registry");
function spaceId(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
        throw new http_utils_1.HttpError(400, 'Invalid space ID');
    return value;
}
function spaceView(space) {
    const plugin = (0, plugin_registry_1.spaceDefinition)(space);
    return Object.assign(Object.assign({}, space), { pluginId: plugin.id, pluginVersion: space.pluginVersion || 1, configuration: (0, plugin_registry_1.spaceConfiguration)(space) });
}
function loadSpace(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield space_model_1.SpaceModel.findById(spaceId(id));
        if (!space)
            throw new http_utils_1.HttpError(404, 'Space not found');
        const code = yield qrcode_model_1.QrCodeModel.findOne({
            _id: space.qrCode,
            createdBy: space.createdBy,
            $or: [{ space: space._id }, { game: space._id }],
        });
        if (!code)
            throw new http_utils_1.HttpError(410, 'This space is no longer available');
        if (code.status === 'paused')
            throw new http_utils_1.HttpError(410, 'This space is paused');
        const plugin = (0, plugin_registry_1.spaceDefinition)(space);
        (0, plugin_registry_1.spaceConfiguration)(space);
        return { space, code, plugin };
    });
}
function createSpace(owner_1, input_1, origin_1) {
    return __awaiter(this, arguments, void 0, function* (owner, input, origin, legacyTarget = false) {
        const plugin = (0, plugin_registry_1.pluginDefinition)(input.pluginId);
        const name = (0, http_utils_1.text)(input.name, 'space name', 1, 120);
        const configuration = plugin.validateConfiguration(input.configuration);
        const user = yield user_model_1.UserModel.findById(owner);
        if (!user)
            throw new http_utils_1.HttpError(401, 'Login required');
        const id = new mongoose_1.default.Types.ObjectId(), qrId = new mongoose_1.default.Types.ObjectId();
        const url = `${(process.env.PUBLIC_URL || origin).replace(/\/$/, '')}/${user.useAlias ? user.alias : 'q'}/${qrId}`;
        const image = yield new qrcode_service_1.QrCodeService().generateQrCodeBase64Url(url);
        try {
            const space = yield space_model_1.SpaceModel.create({
                _id: id,
                name,
                pluginId: plugin.id,
                pluginVersion: plugin.version,
                configuration,
                kind: plugin.id,
                welcome: configuration.welcome,
                createdBy: owner,
                qrCode: qrId,
            });
            const code = yield qrcode_model_1.QrCodeModel.create(Object.assign(Object.assign({ _id: qrId, name }, (legacyTarget ? { game: id } : { space: id })), { createdBy: owner, owner,
                url, qrCode: image, status: 'active' }));
            return Object.assign(Object.assign({}, spaceView(space.toObject())), { code, participants: 0 });
        }
        catch (error) {
            yield Promise.allSettled([
                space_model_1.SpaceModel.deleteOne({ _id: id, createdBy: owner }),
                qrcode_model_1.QrCodeModel.deleteOne({ _id: qrId, createdBy: owner }),
            ]);
            throw error;
        }
    });
}
function listSpaces(owner, pluginId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (pluginId !== undefined)
            (0, plugin_registry_1.pluginDefinition)(pluginId);
        const spaces = yield space_model_1.SpaceModel.find({ createdBy: owner }).sort({ _id: -1 }).lean();
        const views = spaces.map(spaceView).filter((space) => !pluginId || space.pluginId === pluginId);
        const codes = yield qrcode_model_1.QrCodeModel.find({
            createdBy: owner,
            _id: { $in: views.map((space) => space.qrCode) },
        }).lean();
        const counts = new Map();
        for (const id of new Set(views.map((space) => space.pluginId))) {
            const pluginCounts = yield (0, plugin_registry_1.pluginDefinition)(id).participantCounts(views.filter((space) => space.pluginId === id).map((space) => space._id));
            for (const [space, count] of pluginCounts)
                counts.set(space, count);
        }
        return views.map((space) => (Object.assign(Object.assign({}, space), { code: codes.find((code) => String(code._id) === String(space.qrCode) &&
                String(code.space || code.game) === String(space._id)), participants: counts.get(String(space._id)) || 0 })));
    });
}
function editSpace(owner, id, changes) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield space_model_1.SpaceModel.findOne({ _id: spaceId(id), createdBy: owner });
        if (!space)
            throw new http_utils_1.HttpError(404, 'Space not found');
        const plugin = (0, plugin_registry_1.spaceDefinition)(space);
        if (changes.name !== undefined)
            space.name = (0, http_utils_1.text)(changes.name, 'space name', 1, 120);
        const configuration = changes.configuration === undefined
            ? (0, plugin_registry_1.spaceConfiguration)(space)
            : plugin.validateConfiguration(changes.configuration);
        space.pluginId = plugin.id;
        space.pluginVersion = plugin.version;
        space.configuration = configuration;
        if (plugin.id === 'message-circle')
            space.welcome = configuration.welcome;
        yield space.save();
        yield qrcode_model_1.QrCodeModel.updateOne({ _id: space.qrCode, createdBy: owner, $or: [{ space: space._id }, { game: space._id }] }, { $set: { name: space.name } });
        return spaceView(space.toObject());
    });
}
