"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/Routes.tsx
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const PlayerList_1 = __importDefault(require("./components/PlayerList"));
const TeamList_1 = __importDefault(require("./components/TeamList"));
const Layout_1 = __importDefault(require("./components/Layout"));
const AppRoutes = () => {
    return (react_1.default.createElement(react_router_dom_1.BrowserRouter, null,
        react_1.default.createElement(react_router_dom_1.Routes, null,
            react_1.default.createElement(react_router_dom_1.Route, { path: "/", element: react_1.default.createElement(Layout_1.default, null) },
                react_1.default.createElement(react_router_dom_1.Route, { path: "/players", element: react_1.default.createElement(PlayerList_1.default, null) }),
                react_1.default.createElement(react_router_dom_1.Route, { path: "/teams", element: react_1.default.createElement(TeamList_1.default, null) })))));
};
exports.default = AppRoutes;
