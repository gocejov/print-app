// import { identifyUser } from '../controllers/userController';
import { DeviceFingerprint } from '../utils/device.fingerprint.utils';
import { Request, Response, NextFunction } from 'express';


export const userIdentificationMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  // Generate device fingerprint (browser characteristics + device info)
  const { fingerprint, data } = DeviceFingerprint.get(req);

  // Attach to request
  res.locals.fingerprint = fingerprint;
  res.locals.fingerprintData = data;


  //TODO  // // // await identifyUser(ip, fingerprint, geo, req.session);

  next();
};
