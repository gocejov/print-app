"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const material_1 = require("@mui/material");
const ResultCard_1 = __importDefault(require("./ResultCard"));
const GameContext_1 = require("../contexts/GameContext");
const ResultList = ({ resultData }) => {
    const { hint, setHint } = (0, GameContext_1.useGameContext)();
    const displayPlayers = () => {
        setHint(!hint);
    };
    return (React.createElement("div", { className: "result-list" },
        !!resultData.length &&
            React.createElement("div", null,
                React.createElement(material_1.Typography, { gutterBottom: true, variant: "h6", component: "div" },
                    resultData.length,
                    " Result",
                    resultData.length > 1 && 's'),
                React.createElement(material_1.Fab, { onClick: displayPlayers, sx: { width: 50, height: 50 }, color: "primary" }, !hint ? 'Help' : 'Close')),
        !!resultData.length && resultData.map((result, index) => React.createElement(ResultCard_1.default, { key: index, result: result }))));
};
exports.default = ResultList;
