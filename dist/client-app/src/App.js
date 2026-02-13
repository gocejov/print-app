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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const React = __importStar(require("react"));
const Container_1 = __importDefault(require("@mui/material/Container"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
const Box_1 = __importDefault(require("@mui/material/Box"));
const Link_1 = __importDefault(require("@mui/material/Link"));
const ProTip_1 = __importDefault(require("./components/ProTip"));
function Copyright() {
    return (React.createElement(Typography_1.default, { variant: "body2", align: "center", sx: {
            color: 'text.secondary',
        } },
        'Copyright © ',
        React.createElement(Link_1.default, { color: "inherit", href: "https://mui.com/" }, "Your Website"),
        ' ',
        new Date().getFullYear(),
        "."));
}
function App() {
    return (React.createElement(Container_1.default, { maxWidth: "sm" },
        React.createElement(Box_1.default, { sx: { my: 4 } },
            React.createElement(Typography_1.default, { variant: "h4", component: "h1", sx: { mb: 2 } }, "Material UI Create React App example in TypeScript"),
            React.createElement(ProTip_1.default, null),
            React.createElement(Copyright, null))));
}
