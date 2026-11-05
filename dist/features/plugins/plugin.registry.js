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
exports.pluginCatalog = void 0;
exports.pluginDefinition = pluginDefinition;
exports.spaceDefinition = spaceDefinition;
exports.spaceConfiguration = spaceConfiguration;
const http_utils_1 = require("../../utils/http.utils");
const game_models_1 = require("../games/game.models");
const definitions = [
    {
        id: 'message-circle',
        version: 1,
        name: 'Message Circle',
        category: 'Social game',
        description: 'Bring people together with named players, targeted text notes, and private inboxes.',
        participantLabel: 'players',
        configurationFields: [
            {
                key: 'welcome',
                label: 'Welcome message',
                type: 'textarea',
                required: true,
                maxLength: 1000,
                defaultValue: 'Welcome to our circle! Enter your name, send a note to another player, and scan this QR again to discover your messages.',
            },
        ],
        validateConfiguration(value) {
            const input = (0, http_utils_1.objectBody)(value, ['welcome']);
            const welcome = (0, http_utils_1.text)(input.welcome, 'welcome message', 1, 1000);
            if ([...welcome].some((c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'))
                throw new http_utils_1.HttpError(400, 'Invalid welcome message');
            return { welcome };
        },
        // Preserve the functional cookie's existing path and all shared public links.
        entryPath: (spaceId) => `/games/${spaceId}`,
        participantCounts(spaceIds) {
            return __awaiter(this, void 0, void 0, function* () {
                const counts = yield game_models_1.ParticipantModel.aggregate([
                    { $match: { game: { $in: spaceIds } } },
                    { $group: { _id: '$game', count: { $sum: 1 } } },
                ]);
                return new Map(counts.map((row) => [String(row._id), row.count]));
            });
        },
    },
];
function pluginDefinition(id, version) {
    const plugin = definitions.find((definition) => definition.id === id);
    if (!plugin || (version !== undefined && plugin.version !== version))
        throw new http_utils_1.HttpError(400, 'Unsupported plugin or plugin version');
    return plugin;
}
const pluginCatalog = () => definitions.map(({ id, version, name, description, category, participantLabel, configurationFields }) => ({
    id,
    version,
    name,
    description,
    category,
    participantLabel,
    configurationFields,
}));
exports.pluginCatalog = pluginCatalog;
function spaceDefinition(space) {
    return pluginDefinition(space.pluginId || space.kind || 'message-circle', space.pluginVersion || 1);
}
function spaceConfiguration(space) {
    var _a;
    const plugin = spaceDefinition(space);
    return plugin.validateConfiguration((_a = space.configuration) !== null && _a !== void 0 ? _a : (plugin.id === 'message-circle' ? { welcome: space.welcome } : {}));
}
