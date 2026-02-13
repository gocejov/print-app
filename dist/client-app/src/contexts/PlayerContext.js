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
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePlayerContext = exports.PlayerProvider = void 0;
const react_1 = __importStar(require("react"));
const playersApi_1 = require("../api/playersApi");
const PlayerContext = (0, react_1.createContext)({
    player: undefined,
    setPlayer: () => { },
    players: [],
    loadPlayers: () => { },
});
const PlayerProvider = ({ children }) => {
    const [player, setPlayer] = (0, react_1.useState)();
    const [players, setPlayers] = (0, react_1.useState)([]);
    const loadPlayers = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        const players = yield (0, playersApi_1.getPlayers)();
        setPlayers(players); // Replace with actual logic
    }), []);
    const value = (0, react_1.useMemo)(() => ({
        player,
        setPlayer,
        players,
        loadPlayers,
    }), [player, players, loadPlayers]);
    return (react_1.default.createElement(PlayerContext.Provider, { value: value }, children));
};
exports.PlayerProvider = PlayerProvider;
const usePlayerContext = () => (0, react_1.useContext)(PlayerContext);
exports.usePlayerContext = usePlayerContext;
