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
const React = __importStar(require("react"));
const TextField_1 = __importDefault(require("@mui/material/TextField"));
const Autocomplete_1 = __importDefault(require("@mui/material/Autocomplete"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
const utils_1 = require("@mui/material/utils");
const material_1 = require("@mui/material");
const playersApi_1 = require("../api/playersApi");
const utils_2 = require("../utils/utils");
const PlayerContext_1 = require("../contexts/PlayerContext");
const ResultList_1 = __importDefault(require("./ResultList"));
const GameContext_1 = require("../contexts/GameContext");
const AutocompletePlayer = () => {
    const [value, setValue] = React.useState(null);
    const [inputValue, setInputValue] = React.useState('');
    const [options, setOptions] = React.useState([]);
    const [results, setResults] = React.useState([]);
    const [loaded, setLoaded] = React.useState(false);
    const { player, setPlayer } = (0, PlayerContext_1.usePlayerContext)();
    const { game, setGame } = (0, GameContext_1.useGameContext)();
    const getPlayersByFilter = React.useMemo(() => (0, utils_1.debounce)((input) => __awaiter(void 0, void 0, void 0, function* () {
        const players = yield (0, playersApi_1.getFilteredPlayerList)(input);
        setOptions(players);
    }), 400), []);
    const fetchPlayerResults = React.useMemo(() => (0, utils_1.debounce)((playerId) => __awaiter(void 0, void 0, void 0, function* () {
        if (!playerId)
            return;
        const resultsData = yield (0, playersApi_1.getPlayerResultOnGues)(playerId);
        setResults(resultsData.reverse());
        if (resultsData.length && resultsData[0].result.status === true) {
            console.log("I Found the match, now i have to update the data");
            const selectedPlayer = resultsData[0];
            console.log(" selected player is ", selectedPlayer);
            selectedPlayer.isFinished = true;
            setPlayer(selectedPlayer);
        }
    }), 400), [setPlayer]);
    // Fetch filtered players based on input value
    React.useEffect(() => {
        if (inputValue === '') {
            setOptions([]);
            return;
        }
        getPlayersByFilter(inputValue);
    }, [inputValue, getPlayersByFilter]);
    React.useEffect(() => {
        if (game) {
            console.log("Game is over");
            setResults([]);
            setOptions([]);
            setInputValue('');
            setValue(null);
            setGame(false);
        }
    }, [game, setOptions, setResults, setInputValue, setValue, setGame]);
    // Fetch results based on selected player
    React.useEffect(() => {
        if (value) {
            fetchPlayerResults(value === null || value === void 0 ? void 0 : value.id);
        }
    }, [value, fetchPlayerResults]);
    React.useEffect(() => {
        if (!loaded) {
            (() => __awaiter(void 0, void 0, void 0, function* () {
                const resultsData = yield (0, playersApi_1.getPlayerResults)();
                setResults(resultsData.reverse());
                setLoaded(true);
            }))();
        }
    }, [value, fetchPlayerResults, playersApi_1.getPlayerResults, setResults, results, loaded, setLoaded]);
    // Fetch results based on selected player
    React.useEffect(() => {
        if (player) {
            console.log("playe is returned", player);
        }
    }, [player]);
    return (React.createElement("div", null,
        React.createElement(Autocomplete_1.default, { sx: { width: 300 }, getOptionLabel: (option) => typeof option === 'string' ? option : option.name, filterOptions: (x) => x, options: options, autoComplete: true, includeInputInList: true, filterSelectedOptions: true, value: value, noOptionsText: "No Player", onChange: (event, newValue) => setValue(newValue), onInputChange: (event, newInputValue) => setInputValue(newInputValue), renderInput: (params) => (React.createElement(TextField_1.default, Object.assign({}, params, { label: "Guess the player", fullWidth: true }))), renderOption: (props, option) => (React.createElement("li", Object.assign({}, props, { key: option.id }),
                React.createElement("div", { className: "parent result-info" },
                    React.createElement(material_1.Avatar, { sx: { width: 30, height: 30 }, src: option.team.imagePath }),
                    React.createElement(Typography_1.default, { variant: "body2", sx: { color: 'text.secondary', wordWrap: 'break-word', width: 'calc(80% - 44px)' } }, option.name),
                    React.createElement(material_1.Avatar, { sx: { bgcolor: (0, utils_2.stringToColor)(option.position), width: 30, height: 30 } }, option.position)))) }),
        React.createElement("div", null,
            React.createElement(ResultList_1.default, { resultData: results }))));
};
exports.default = AutocompletePlayer;
