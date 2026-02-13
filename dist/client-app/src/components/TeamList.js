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
const react_1 = __importStar(require("react"));
const teamsApi_1 = require("../api/teamsApi");
const TeamList = () => {
    const [teams, setTeams] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const fetchTeams = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const data = yield (0, teamsApi_1.getTeams)();
                setTeams(data);
            }
            catch (error) {
                console.error('Failed to fetch teams:', error);
            }
        });
        fetchTeams();
    }, []);
    const handleClick = (event) => {
        event.preventDefault();
        alert('Link click prevented!');
    };
    return (react_1.default.createElement("div", { className: "team-list" },
        react_1.default.createElement("h1", null, "Teams"),
        teams.length === 0 ? (react_1.default.createElement("p", null, "Loading teams...")) :
            (react_1.default.createElement("ul", null, teams.map((team, index) => (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("li", { key: index }, team.name),
                react_1.default.createElement("a", { href: "https://example.com", onClick: handleClick }, "Click Me"))))))));
};
exports.default = TeamList;
