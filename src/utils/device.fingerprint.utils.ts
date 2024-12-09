const  hash = require('crypto');
import { Request } from 'express';

export const DeviceFingerprint = {
  get: (userAgent:any, req:Request) => {
    const screenWidth = req.headers['screen-width'] || 'unknown';
    const screenHeight = req.headers['screen-height'] || 'unknown';
    const language = req.headers['accept-language'] || 'unknown';
    const timezone = req.headers['timezone'] || 'unknown';

    // Concatenate the properties to generate a unique fingerprint
    const fingerprintString = `${userAgent}-${screenWidth}-${screenHeight}-${language}-${timezone}`;

    // Hash the fingerprint to get a unique identifier
    return hash('sha256').update(fingerprintString).digest('hex');
  }
};
