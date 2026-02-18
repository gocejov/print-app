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
import { IQrCodeController, QrCodeController } from './controllers/qrcode.controller';
import geoip from 'geoip-lite';
import { userIdentificationMiddleware } from './middlewares/userIdentification.middleware';
import path from 'path';
// import { DeviceFingerprint } from 'device-fingerprint';


const app: Application = express();
const reservedAliases = new Set(['api', 'api-docs', 'l']);

export const initApp = async (): Promise<Application> => {
    try {
        await connectDB();

        // Needed before session middleware when running behind a proxy.
        app.set('trust proxy', true);

        //session configuration
        app.use(sesionConfig);

        // Middleware for user identification
        app.use(userIdentificationMiddleware);

        // swagger configuration
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        app.use(express.json());
        app.use(express.static(path.resolve('public')));

        // Allow requests from a specific origin
        app.use(cors({
            origin: 'http://localhost:3001',
            methods: 'GET,POST,PUT,DELETE',
            credentials: true,
        }));

        app.get('/', async (req: any, res) => {
            res.json(req.fingerprintData);
        });

        //Main Routes
        app.use('/api/users', userRoutes);
        app.use('/api/products', productsRoutes);
        app.use('/api/upload', uploadRoutes);
        app.use('/api/files', fileRoutes);
        app.use('/api/qrcodes', qrCodeRoutes);
        app.use('/api/statistics', statisticRoutes);

        const qrCodeController: IQrCodeController = new QrCodeController()
        app.get('/l/:alias/:type/:qid', (req, res) => qrCodeController.getVideo(req, res));
        app.get('/:alias/:qid', (req, res, next) => {
            if (reservedAliases.has(req.params.alias)) {
                next();
                return;
            }
            qrCodeController.playVideo(req, res);
        });

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
