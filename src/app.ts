import express, { Application } from 'express';
import connectDB from './config/db.config';
import userRoutes from './routes/user.routes';
import productsRoutes from './routes/product.routes';
import uploadRoutes from './routes/upload.routes';
import fileRoutes from './routes/file.routes';
import qrCodeRoutes from './routes/qrcode.routes';
import sesionConfig from './config/sesion.config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { internalErrorHandler } from './middlewares/error.handler';
import cors from 'cors'
import { uploadErrorHandler } from './middlewares/upload.error.middlewares';
import { IQrCodeController, QrCodeController } from './controllers/qrcode.controller';
import { IProductController, ProductController } from './controllers/product.controller';
import axios from 'axios';
import geoip from 'geoip-lite';
import { userIdentificationMiddleware } from './middlewares/userIdentification.middleware';
// import { DeviceFingerprint } from 'device-fingerprint';


const app: Application = express();

export const initApp = async (): Promise<Application> => {
    try {
        await connectDB();

        //session configuration
        app.use(sesionConfig);

        // Middleware for user identification
        app.use(userIdentificationMiddleware);

        app.set('trust proxy', true);

        // swagger configuration
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        app.use(express.json());

        // Allow requests from a specific origin
        app.use(cors({
            origin: 'http://localhost:3001',
            methods: 'GET,POST,PUT,DELETE',
            credentials: true,
        }));

        app.get('/', async (req, res) => {
            // Check for the IP in 'X-Forwarded-For' header, fall back to 'req.ip'
            const userIp: string | undefined | string[] = req.headers['x-forwarded-for'] || req.ip
            const userAgent = req.headers['user-agent']; // User-Agent for fingerprinting
            // const screenResolution = req.query.screenResolution || 'unknown';
            let geo = null
            if (userIp) {
                geo = geoip.lookup(userIp.toString()); // Geolocation info based on IP
                // const fingerprint = DeviceFingerprint.get(userAgent);
            }
            const screenResolution = `${req.headers['x-screen-width']}x${req.headers['x-screen-height']}`;


            // Generate fingerprint (browser characteristics + device info)

            res.json({ userIp, screenResolution, userAgent, geo });
        });

        //Main Routes
        app.use('/api/users', userRoutes);
        app.use('/api/products', productsRoutes);
        app.use('/api/upload', uploadRoutes);
        app.use('/api/files', fileRoutes);
        app.use('/api/qrcodes', qrCodeRoutes);

        const qrCodeController: IQrCodeController = new QrCodeController()
        app.get('/:alias/:qid', (req, res) => qrCodeController.playVideo(req, res));
        app.get('/l/:alias/:type/:qid', (req, res) => qrCodeController.getVideo(req, res));

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

