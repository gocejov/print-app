// import { identifyUser } from '../controllers/userController';
import { DeviceFingerprint } from '../utils/device.fingerprint.utils';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
  interface Request {
    geo?: any;
  }
}

export const userIdentificationMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const ip = req.ip; // Client's IP address
  const userAgent = req.headers['user-agent']; // User-Agent for fingerprinting
  const geo = req.geo || {}; // Geolocation info based on IP (using geoip)

  // Generate device fingerprint (browser characteristics + device info)
  const fingerprint = DeviceFingerprint.get(userAgent, req);

  // Identify user or create a new user session



  //TODO  // // // await identifyUser(ip, fingerprint, geo, req.session);

  next();
};
