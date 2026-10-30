import { gameManagementRoutes, gamePublicRoutes } from './features/games/game.routes';
import 'dotenv/config';
import { BrowserScanService } from './services/browser-scan.service';
import { HttpError } from './utils/http.utils';
import { collectionRoutes } from './routes/collection.routes';
import { requireAuth, protectWrites } from './middlewares/auth.middleware';
import { managementAccess } from './middlewares/management.middleware';
import { asyncHandler } from './utils/http.utils';
import express, { Application } from 'express';
import connectDB from './config/db.config';
import userRoutes from './routes/user.routes';
import productsRoutes from './routes/product.routes';
import uploadRoutes from './routes/upload.routes';
import fileRoutes from './routes/file.routes';
import qrCodeRoutes from './routes/qrcode.routes';
import statisticRoutes from './routes/statistic.routes';
import sesionConfig from './config/sesion.config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { internalErrorHandler } from './middlewares/error.handler';
import cors from 'cors'
import { uploadErrorHandler } from './middlewares/upload.error.middlewares';
import { QrCodeController } from './controllers/qrcode.controller';
import geoip from 'geoip-lite';
import { userIdentificationMiddleware } from './middlewares/userIdentification.middleware';
import path from 'path';
// import { DeviceFingerprint } from 'device-fingerprint';


const app: Application = express();
const reservedAliases = new Set(['api', 'api-docs', 'l', 'admin', 'crud', 'games']);

export const initApp = async (): Promise<Application> => {
    try {
        await connectDB();

        // Needed before session middleware when running behind a proxy.
        app.set('trust proxy', true);

        //session configuration
        app.use(sesionConfig);

        // Middleware for user identification
        app.use(express.json());
        app.use(userIdentificationMiddleware);

        // swagger configuration
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        app.use(express.static(path.resolve('public')));

        const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
            .split(',')
            .map(origin => origin.trim());

        app.use(cors({
            origin: corsOrigins,
            methods: 'GET,POST,PUT,PATCH,DELETE',
            credentials: true,
        }));

        app.get('/health', (_req, res) => {
            res.status(200).json({ status: 'ok' });
        });

        app.get('/', async (req: any, res) => {
            res.json(res.locals.fingerprintData);
        });

        // React client assets are built into public/admin; keep deep links under its prefix.
        app.get('/admin/*', (req, res, next) => {
            if (path.extname(req.path)) { next(); return; }
            res.sendFile(path.resolve('public/admin/index.html'));
        });

        //Main Routes
        app.use('/api', protectWrites);
        app.use('/api/users', userRoutes);
        app.use('/api/games', requireAuth, gameManagementRoutes);
        app.use('/games', gamePublicRoutes);
        app.use('/api/categories', requireAuth, collectionRoutes('category'));
        app.use('/api/campaigns', requireAuth, collectionRoutes('campaign'));
        app.use('/api/products', requireAuth, managementAccess('products'), productsRoutes);
        app.use('/api/upload', requireAuth, managementAccess('upload'), uploadRoutes);
        app.use('/api/files', requireAuth, managementAccess('files'), fileRoutes);
        app.use('/api/qrcodes', requireAuth, managementAccess('qrcodes'), qrCodeRoutes);
        app.use('/api/statistics', requireAuth, managementAccess('statistics'), statisticRoutes);

        const qrCodeController = new QrCodeController()
        app.post('/scan/:token/metrics', asyncHandler(async (req, res) => {
            const origin = req.get('origin');
            if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`))
                throw new HttpError(403, 'Cross-origin scan update rejected');
            if (!req.is('application/json')) throw new HttpError(415, 'Use application/json');
            res.set('Cache-Control', 'no-store');
            await new BrowserScanService().collect(req.params.token, req.body, req, res);
            res.sendStatus(204);
        }));
        app.get('/scan/:token/continue', asyncHandler((req, res) => qrCodeController.continueScan(req, res)));
        app.get('/l/:alias/:type/:qid', asyncHandler((req, res) => qrCodeController.getVideo(req, res)));
        app.get('/:alias/:qid', asyncHandler((req, res, next) => {
            if (reservedAliases.has(req.params.alias)) {
                next();
                return;
            }
            return qrCodeController.playVideo(req, res);
        }));

        // Error handling middleware
        app.use(uploadErrorHandler);

        //handling any unhandled internal errors
        app.use(internalErrorHandler)

        return app
    } catch (error) {
        console.error('Problem while initiating the app:', error);
        process.exit(1);
    }
}
