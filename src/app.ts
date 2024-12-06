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

const app: Application = express();

export const initApp = async (): Promise<Application> => {
    try {
        await connectDB();

        //session configuration
        app.use(sesionConfig);

        // swagger configuration
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

        app.use(express.json());

        // Allow requests from a specific origin
        app.use(cors({
            origin: 'http://localhost:3001',
            methods: 'GET,POST,PUT,DELETE',
            credentials: true,
        }));


        //Main Routes
        app.use('/api/users', userRoutes);
        app.use('/api/products', productsRoutes);
        app.use('/api/upload', uploadRoutes);
        app.use('/api/files', fileRoutes);
        app.use('/api/qrcodes', qrCodeRoutes);

        const productController: IProductController = new ProductController()
        app.get('/:alias/:type/:pid', (req, res) => productController.playVideo(req, res));
        app.get('/l/:alias/:type/:pid', (req, res) => productController.getVideo(req, res));

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

