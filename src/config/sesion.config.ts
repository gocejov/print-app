import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redisClient as redis } from '../config/redis.config';

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');

export default session({
    store: new RedisStore({ client: redis, prefix: process.env.SESSION_KEY_PREFIX || 'sess:' }),
    secret: process.env.SESSION_SECRET || 'local-development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // One day
    },
})

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        authVersion?: number;
        userGueses?: string[];
    }
}
