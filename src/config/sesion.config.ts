import session from 'express-session';
import connectRedis, { RedisStore } from 'connect-redis';
import { redisClient as redis } from '../config/redis.config';

export default session({
    store: new RedisStore({ client: redis }),
    secret: 'qr2share-sesion-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true
        //httpOnly: true,
        //maxAge: 1000 * 60 * 60 * 24, // Session duration 1 day
    },
})

declare module 'express-session' {
    interface SessionData {
        userGueses?: string[];
    }
}
