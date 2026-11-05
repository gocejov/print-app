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
exports.spaceEntryRoutes = exports.spaceRoutes = exports.pluginRoutes = void 0;
const express_1 = require("express");
const http_utils_1 = require("../../utils/http.utils");
const space_service_1 = require("./space.service");
const plugin_registry_1 = require("../plugins/plugin.registry");
exports.pluginRoutes = (0, express_1.Router)();
exports.pluginRoutes.get('/', (_req, res) => res.json((0, plugin_registry_1.pluginCatalog)()));
exports.spaceRoutes = (0, express_1.Router)();
exports.spaceRoutes.get('/', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res
        .set('Cache-Control', 'no-store')
        .json(yield (0, space_service_1.listSpaces)(String(res.locals.user._id), req.query.pluginId));
})));
exports.spaceRoutes.post('/', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const input = (0, http_utils_1.objectBody)(req.body, ['pluginId', 'name', 'configuration']);
    res
        .status(201)
        .json(yield (0, space_service_1.createSpace)(String(res.locals.user._id), { pluginId: input.pluginId, name: input.name, configuration: input.configuration }, `${req.protocol}://${req.get('host')}`));
})));
exports.spaceRoutes.patch('/:id', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const input = (0, http_utils_1.objectBody)(req.body, ['name', 'configuration']);
    if (!Object.keys(input).length)
        throw new http_utils_1.HttpError(400, 'No changes supplied');
    res.json(yield (0, space_service_1.editSpace)(String(res.locals.user._id), req.params.id, input));
})));
exports.spaceEntryRoutes = (0, express_1.Router)();
exports.spaceEntryRoutes.get('/:id/open', (0, http_utils_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { space, plugin } = yield (0, space_service_1.loadSpace)(req.params.id);
    res
        .set('Cache-Control', 'no-store')
        .vary('Cookie')
        .redirect(plugin.entryPath(String(space._id)));
})));
