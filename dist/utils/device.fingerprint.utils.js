"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFingerprint = void 0;
exports.DeviceFingerprint = {
    get: (userAgent, req) => {
        const screenWidth = req.headers['screen-width'] || 'unknown';
        const screenHeight = req.headers['screen-height'] || 'unknown';
        const language = req.headers['accept-language'] || 'unknown';
        const timezone = req.headers['timezone'] || 'unknown';
        // Concatenate the properties to generate a unique fingerprint
        const fingerprintString = `${userAgent}-${screenWidth}-${screenHeight}-${language}-${timezone}`;
        // Hash the fingerprint to get a unique identifier
        // return hash('sha256').update(fingerprintString).digest('hex');
        return ""; // crypto.createHash('sha256').update(fingerprintString).digest('hex');
    }
};
