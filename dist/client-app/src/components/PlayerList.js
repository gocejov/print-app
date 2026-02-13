"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const PlayerContext_1 = require("../contexts/PlayerContext");
const PlayerCard_1 = __importDefault(require("./PlayerCard"));
const GameContext_1 = require("../contexts/GameContext");
const PlayerList = () => {
    const { players, loadPlayers } = (0, PlayerContext_1.usePlayerContext)();
    const [loaded, setLoaded] = react_1.default.useState(false);
    const { hint } = (0, GameContext_1.useGameContext)();
    react_1.default.useEffect(() => {
        if (!loaded) {
            loadPlayers();
            setLoaded(true);
        }
    }, [loadPlayers, players, loaded, setLoaded]);
    return (react_1.default.createElement("div", { className: "player-list" }, hint && react_1.default.createElement("div", null,
        react_1.default.createElement("h1", null, "Players"),
        players.length === 0 ? (react_1.default.createElement("p", null, "Loading players...")) : (players.map((player) => react_1.default.createElement(PlayerCard_1.default, { key: player.id, player: player }))))));
};
exports.default = PlayerList;
