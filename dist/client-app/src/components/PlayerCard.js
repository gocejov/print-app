"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const PlayerCard = ({ player }) => {
    return (react_1.default.createElement("div", { className: "player-card" },
        react_1.default.createElement(material_1.Card, { sx: { maxWidth: 345 } },
            react_1.default.createElement(material_1.CardActionArea, null,
                react_1.default.createElement(material_1.CardMedia, { component: "img", height: "140", image: player.imagePath, alt: "green iguana" }),
                react_1.default.createElement(material_1.CardContent, null,
                    react_1.default.createElement(material_1.Typography, { gutterBottom: true, variant: "h5", component: "div" }, player.name),
                    react_1.default.createElement(material_1.Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                        "Team: ",
                        player.team.name),
                    react_1.default.createElement(material_1.Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                        "Nationality: ",
                        player.nationality.name),
                    react_1.default.createElement(material_1.Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                        "Position: ",
                        player.position))))));
};
exports.default = PlayerCard;
