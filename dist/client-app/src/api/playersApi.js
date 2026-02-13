"use strict";
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
exports.getFilteredPlayerList = exports.getPlayerResults = exports.getPlayerResultOnGues = exports.resetTheSession = exports.getPlayerOfTheDay = exports.getPlayers = void 0;
const axiosService_1 = __importDefault(require("./axiosService"));
const getPlayers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axiosService_1.default.get(`/players`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching players:', error);
        throw new Error('Could not fetch players');
    }
});
exports.getPlayers = getPlayers;
const getPlayerOfTheDay = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axiosService_1.default.get(`/game`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching player of the day:', error);
        throw new Error('Could not fetch player of the day');
    }
});
exports.getPlayerOfTheDay = getPlayerOfTheDay;
const resetTheSession = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axiosService_1.default.get(`/game/clear`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching player of the day:', error);
        throw new Error('Could not fetch player of the day');
    }
});
exports.resetTheSession = resetTheSession;
const getPlayerResultOnGues = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("path", `/game/make-gues/${id}`);
        const response = yield axiosService_1.default.get(`/game/make-gues/${id}`);
        console.log("getPlayerResultOnGues before ", response.data);
        return response.data;
    }
    catch (error) {
        console.error('Error getPlayerResultOnGues:', error);
        throw new Error('Could not fetch player of the day');
    }
});
exports.getPlayerResultOnGues = getPlayerResultOnGues;
const getPlayerResults = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("path", `/game/results/`);
        const response = yield axiosService_1.default.get(`/game/results`);
        console.log("getPlayerResults before ", response.data);
        return response.data;
    }
    catch (error) {
        console.error('Error getPlayerResults:', error);
        throw new Error('Could not fetch results');
    }
});
exports.getPlayerResults = getPlayerResults;
const getFilteredPlayerList = (search) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("path", `/players/find/${search}`);
        const response = yield axiosService_1.default.get(`/players/find/${search}`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching player of the day:', error);
        throw new Error('Could not fetch player of the day');
    }
});
exports.getFilteredPlayerList = getFilteredPlayerList;
