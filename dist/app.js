"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initApp = void 0;
require("dotenv/config");
const browser_scan_service_1 = require("./services/browser-scan.service");
const http_utils_1 = require("./utils/http.utils");
const collection_routes_1 = require("./routes/collection.routes");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const management_middleware_1 = require("./middlewares/management.middleware");
const http_utils_2 = require("./utils/http.utils");
const express_1 = __importDefault(require("express"));
const db_config_1 = __importDefault(require("./config/db.config"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
const qrcode_routes_1 = __importDefault(require("./routes/qrcode.routes"));
const statistic_routes_1 = __importDefault(require("./routes/statistic.routes"));
const sesion_config_1 = __importDefault(require("./config/sesion.config"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_config_1 = __importDefault(require("./config/swagger.config"));
const error_handler_1 = require("./middlewares/error.handler");
const cors_1 = __importDefault(require("cors"));
const upload_error_middlewares_1 = require("./middlewares/upload.error.middlewares");
const qrcode_controller_1 = require("./controllers/qrcode.controller");
const userIdentification_middleware_1 = require("./middlewares/userIdentification.middleware");
const path_1 = __importDefault(require("path"));
// import { DeviceFingerprint } from 'device-fingerprint';
const app = (0, express_1.default)();
const reservedAliases = new Set(['api', 'api-docs', 'l', 'admin', 'crud']);
const initApp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_config_1.default)();
        // Needed before session middleware when running behind a proxy.
        app.set('trust proxy', true);
        //session configuration
        app.use(sesion_config_1.default);
        // Middleware for user identification
        app.use(express_1.default.json());
        app.use(userIdentification_middleware_1.userIdentificationMiddleware);
        // swagger configuration
        app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_config_1.default));
        app.use(express_1.default.static(path_1.default.resolve('public')));
        const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
            .split(',')
            .map(origin => origin.trim());
        app.use((0, cors_1.default)({
            origin: corsOrigins,
            methods: 'GET,POST,PUT,PATCH,DELETE',
            credentials: true,
        }));
        app.get('/health', (_req, res) => {
            res.status(200).json({ status: 'ok' });
        });
        app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            res.json(res.locals.fingerprintData);
        }));
        // React client assets are built into public/admin; keep deep links under its prefix.
        app.get('/admin/*', (req, res, next) => {
            if (path_1.default.extname(req.path)) {
                next();
                return;
            }
            res.sendFile(path_1.default.resolve('public/admin/index.html'));
        });
        //Main Routes
        app.use('/api', auth_middleware_1.protectWrites);
        app.use('/api/users', user_routes_1.default);
        app.use('/api/categories', auth_middleware_1.requireAuth, (0, collection_routes_1.collectionRoutes)('category'));
        app.use('/api/campaigns', auth_middleware_1.requireAuth, (0, collection_routes_1.collectionRoutes)('campaign'));
        app.use('/api/products', auth_middleware_1.requireAuth, (0, management_middleware_1.managementAccess)('products'), product_routes_1.default);
        app.use('/api/upload', auth_middleware_1.requireAuth, (0, management_middleware_1.managementAccess)('upload'), upload_routes_1.default);
        app.use('/api/files', auth_middleware_1.requireAuth, (0, management_middleware_1.managementAccess)('files'), file_routes_1.default);
        app.use('/api/qrcodes', auth_middleware_1.requireAuth, (0, management_middleware_1.managementAccess)('qrcodes'), qrcode_routes_1.default);
        app.use('/api/statistics', auth_middleware_1.requireAuth, (0, management_middleware_1.managementAccess)('statistics'), statistic_routes_1.default);
        const qrCodeController = new qrcode_controller_1.QrCodeController();
        app.post('/scan/:token/metrics', (0, http_utils_2.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const origin = req.get('origin');
            if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`))
                throw new http_utils_1.HttpError(403, 'Cross-origin scan update rejected');
            if (!req.is('application/json'))
                throw new http_utils_1.HttpError(415, 'Use application/json');
            res.set('Cache-Control', 'no-store');
            yield new browser_scan_service_1.BrowserScanService().collect(req.params.token, req.body, req, res);
            res.sendStatus(204);
        })));
        app.get('/scan/:token/continue', (0, http_utils_2.asyncHandler)((req, res) => qrCodeController.continueScan(req, res)));
        app.get('/l/:alias/:type/:qid', (0, http_utils_2.asyncHandler)((req, res) => qrCodeController.getVideo(req, res)));
        app.get('/:alias/:qid', (0, http_utils_2.asyncHandler)((req, res, next) => {
            if (reservedAliases.has(req.params.alias)) {
                next();
                return;
            }
            return qrCodeController.playVideo(req, res);
        }));
        // Error handling middleware
        app.use(upload_error_middlewares_1.uploadErrorHandler);
        //handling any unhandled internal errors
        app.use(error_handler_1.internalErrorHandler);
        return app;
    }
    catch (error) {
        console.error('Problem while initiating the app:', error);
        process.exit(1);
    }
});
exports.initApp = initApp;
