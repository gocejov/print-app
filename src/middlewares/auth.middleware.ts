import { RequestHandler } from 'express';
import { UserModel } from '../models/user.model';
import { redisClient } from '../config/redis.config';
import { createHash } from 'crypto';
import { asyncHandler, HttpError } from '../utils/http.utils';

export const requireAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.userId) throw new HttpError(401, 'Login required');
  const user = await UserModel.findById(req.session.userId);
  if (!user || (user.authVersion || 0) !== req.session.authVersion) throw new HttpError(401, 'Login required');
  res.locals.user = user;
  next();
});

// CORS alone does not stop cross-site writes when production cookies use SameSite=None.
export const protectWrites: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const origin = req.get('origin');
  const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3001').split(',').map(value => value.trim());
  const ownOrigin = `${req.protocol}://${req.get('host')}`;
  if ((origin && origin !== ownOrigin && !allowed.includes(origin)) || (!origin && req.get('sec-fetch-site') === 'cross-site')) {
    next(new HttpError(403, 'Origin not allowed')); return;
  }
  if (!req.is('application/json') && !req.is('multipart/form-data')) {
    next(new HttpError(415, 'Use application/json or multipart/form-data')); return;
  }
  next();
};

export const limitAuthAttempts = asyncHandler(async (req, res, next) => {
  const key = `${process.env.SESSION_KEY_PREFIX || 'sess:'}auth-attempts:${createHash('sha256').update(req.socket.remoteAddress || 'unknown').digest('hex')}`;
  const count = await redisClient.eval(
    "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 900) end; return n",
    1, key
  ) as number;
  if (count > 30) { res.setHeader('Retry-After', '900'); throw new HttpError(429, 'Too many authentication attempts; try again later'); }
  next();
});
