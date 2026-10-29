"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalErrorHandler = void 0;
const http_utils_1 = require("../utils/http.utils");
const internalErrorHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error instanceof http_utils_1.HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    if (error.code === 11000) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Invalid request data' });
        return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
};
exports.internalErrorHandler = internalErrorHandler;
