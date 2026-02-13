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
const react_1 = __importStar(require("react"));
const playersApi_1 = require("../api/playersApi");
const Button_1 = __importDefault(require("@mui/material/Button"));
const PlayerContext_1 = require("../contexts/PlayerContext");
const AutocompletePlayer_1 = __importDefault(require("./AutocompletePlayer"));
const GameContext_1 = require("../contexts/GameContext");
const material_1 = require("@mui/material");
const PlayerOfTheDay = () => {
    const { player, setPlayer } = (0, PlayerContext_1.usePlayerContext)();
    const { setGame } = (0, GameContext_1.useGameContext)();
    const resetTheGame = () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("I'm about to rest the game");
        yield (0, playersApi_1.resetTheSession)();
        setGame(true);
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const data = yield (0, playersApi_1.getPlayerOfTheDay)();
                setPlayer(data);
                console.log('Session reset successfully.');
            }
            catch (error) {
                console.error('Error resetting session:', error);
            }
        }), 1000); // 1000ms = 1 second delay
    });
    react_1.default.useEffect(() => {
        if (player) {
            if (player.isFinished === true) {
                console.log("Player is Correctly guesed");
            }
        }
    }, [player]);
    (0, react_1.useEffect)(() => {
        const fetchPlayerOfTheDay = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const data = yield (0, playersApi_1.getPlayerOfTheDay)();
                setPlayer(data);
            }
            catch (error) {
                console.error('Failed to fetch teams:', error);
            }
        });
        fetchPlayerOfTheDay();
    }, [setPlayer]);
    const getImage = (player) => {
        return !player.isFinished ? player.imagePathBase64 : player.imagePath;
    };
    return (react_1.default.createElement("div", { className: "player-of-the-day" },
        react_1.default.createElement(material_1.Typography, { variant: "h5", component: "div" }, "Player of The day"),
        player ? (react_1.default.createElement("img", { alt: 'Player of the day', width: "300", src: getImage(player) })) : (react_1.default.createElement("div", null)),
        react_1.default.createElement("br", null),
        react_1.default.createElement("div", null,
            react_1.default.createElement(AutocompletePlayer_1.default, null),
            (player === null || player === void 0 ? void 0 : player.isFinished) ? (react_1.default.createElement("div", null,
                react_1.default.createElement("div", { className: 'result-text' },
                    "Yes, Thats correct",
                    react_1.default.createElement("br", null), player === null || player === void 0 ? void 0 :
                    player.name),
                react_1.default.createElement(Button_1.default, { variant: "contained", onClick: resetTheGame }, "Start again"))) : (react_1.default.createElement("div", null)))));
};
exports.default = PlayerOfTheDay;
