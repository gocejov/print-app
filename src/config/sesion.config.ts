import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redisClient as redis } from '../config/redis.config';

const isProduction = process.env.NODE_ENV === 'production';

export default session({
    store: new RedisStore({ client: redis }),
    secret: 'qr2share-sesion-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        //maxAge: 1000 * 60 * 60 * 24, // Session duration 1 day
    },
})

declare module 'express-session' {
    interface SessionData {
        userGueses?: string[];
    }
}
