"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const material_1 = require("@mui/material");
const colors_1 = require("@mui/material/colors");
const ArrowIcon_1 = __importDefault(require("./ArrowIcon"));
const react_1 = __importDefault(require("react"));
const getResultColor = (correct) => {
    return correct ? colors_1.green[500] : colors_1.red[500];
};
const ResultCard = ({ result }) => {
    return (react_1.default.createElement("div", null,
        react_1.default.createElement(material_1.Typography, { variant: "button", gutterBottom: true, sx: { display: 'block' } }, result.name),
        react_1.default.createElement("div", null),
        react_1.default.createElement("div", { className: 'result-info' },
            react_1.default.createElement("div", { className: "result-circle-holder" },
                react_1.default.createElement(material_1.Avatar, { src: result.nationality.nationalityImagePath, sx: { width: 50, height: 50, bgcolor: getResultColor(result.result.nationalityIsCorrect), padding: '10px' } }),
                react_1.default.createElement("span", { className: "result-text" }, "NAT")),
            react_1.default.createElement("div", { className: "result-circle-holder" },
                react_1.default.createElement(material_1.Avatar, { src: result.team.imagePath, sx: { width: 50, height: 50, bgcolor: getResultColor(result.result.isTeamCorrect), padding: '10px' } }),
                react_1.default.createElement("span", { className: "result-text" }, "TEAM")),
            react_1.default.createElement("div", { className: "result-circle-holder" },
                react_1.default.createElement(material_1.Avatar, { sx: { width: 50, height: 50, bgcolor: getResultColor(result.result.isPositionCorrect), padding: '10px' } }, result.position),
                react_1.default.createElement("span", { className: "result-text" }, "POS")),
            react_1.default.createElement("div", { className: "result-circle-holder" },
                react_1.default.createElement(material_1.Avatar, { sx: { width: 50, height: 50, bgcolor: getResultColor(result.result.yearIsCorrect === 0), padding: '10px' } },
                    result.age,
                    result.result.yearIsCorrect !== 0 ? (react_1.default.createElement(ArrowIcon_1.default, { isUp: result.result.yearIsCorrect > 0 })) : (react_1.default.createElement("div", null))),
                react_1.default.createElement("span", { className: "result-text" }, "AGE")))));
};
exports.default = ResultCard;
