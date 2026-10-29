"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.asyncHandler = asyncHandler;
exports.objectBody = objectBody;
exports.text = text;
exports.passwordInput = passwordInput;
exports.emailInput = emailInput;
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
function asyncHandler(handler) {
    return (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
}
function objectBody(body, allowed) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new HttpError(400, 'A JSON object is required');
    for (const key of Object.keys(body)) {
        if (!allowed.includes(key))
            throw new HttpError(400, `Unexpected field: ${key}`);
    }
    return body;
}
function text(value, field, min = 1, max = 200) {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max)
        throw new HttpError(400, `Invalid ${field}`);
    return value.trim();
}
function passwordInput(value) {
    if (typeof value !== 'string' || value.length < 12 || value.length > 128)
        throw new HttpError(400, 'Password must contain 12–128 characters');
    return value;
}
function emailInput(value) {
    const email = text(value, 'email', 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, 'Invalid email');
    return email;
}
