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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGameContext = exports.GameProvider = void 0;
const react_1 = __importStar(require("react"));
const GameContext = (0, react_1.createContext)({
    game: false,
    setGame: () => { },
    hint: false,
    setHint: () => { },
});
const GameProvider = ({ children }) => {
    const [game, setGame] = (0, react_1.useState)();
    const [hint, setHint] = (0, react_1.useState)();
    react_1.default.useEffect(() => { }, [hint]);
    return (react_1.default.createElement(GameContext.Provider, { value: { game, setGame, hint, setHint } }, children));
};
exports.GameProvider = GameProvider;
const useGameContext = () => (0, react_1.useContext)(GameContext);
exports.useGameContext = useGameContext;
