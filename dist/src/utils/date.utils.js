"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateKey = void 0;
const getDateKey = (date = null) => {
    const day = date ? date : new Date();
    day.setHours(0);
    day.setMinutes(0);
    day.setSeconds(0);
    return `player-of-the-day-${day.toISOString().split('T')[0]}`;
};
exports.getDateKey = getDateKey;
const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
};
const getPreviusDays = (day, date) => {
    const selected = date;
    selected.setDate(selected.getDate() - day);
    return selected;
};
const getNextDays = (day, date) => {
    const selected = date;
    selected.setDate(selected.getDate() + day);
    return selected;
};
