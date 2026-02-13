"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_URL = 'http://localhost:3000/api';
const service = axios_1.default.create({
    baseURL: API_URL,
    timeout: 120000
});
service.interceptors.request.use((config) => {
    if (config.headers) {
        // const token = localStorage.getItem('token')
        config.headers['Access-Control-Allow-Origin'] = '*';
        config.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, HEAD, OPTIONS';
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
service.defaults.withCredentials = true;
exports.default = service;
