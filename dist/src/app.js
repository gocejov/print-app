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
const express_1 = __importDefault(require("express"));
const db_config_1 = __importDefault(require("./config/db.config"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
const qrcode_routes_1 = __importDefault(require("./routes/qrcode.routes"));
const sesion_config_1 = __importDefault(require("./config/sesion.config"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_config_1 = __importDefault(require("./config/swagger.config"));
const error_handler_1 = require("./middlewares/error.handler");
const cors_1 = __importDefault(require("cors"));
const upload_error_middlewares_1 = require("./middlewares/upload.error.middlewares");
const qrcode_controller_1 = require("./controllers/qrcode.controller");
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const userIdentification_middleware_1 = require("./middlewares/userIdentification.middleware");
// import { DeviceFingerprint } from 'device-fingerprint';
const app = (0, express_1.default)();
const reservedAliases = new Set(['api', 'api-docs', 'l']);
const initApp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_config_1.default)();
        // Needed before session middleware when running behind a proxy.
        app.set('trust proxy', true);
        //session configuration
        app.use(sesion_config_1.default);
        // Middleware for user identification
        app.use(userIdentification_middleware_1.userIdentificationMiddleware);
        // swagger configuration
        app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_config_1.default));
        app.use(express_1.default.json());
        // Allow requests from a specific origin
        app.use((0, cors_1.default)({
            origin: 'http://localhost:3001',
            methods: 'GET,POST,PUT,DELETE',
            credentials: true,
        }));
        app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            // Check for the IP in 'X-Forwarded-For' header, fall back to 'req.ip'
            const userIp = req.headers['x-forwarded-for'] || req.ip;
            const userAgent = req.headers['user-agent']; // User-Agent for fingerprinting
            // const screenResolution = req.query.screenResolution || 'unknown';
            let geo = null;
            if (userIp) {
                geo = geoip_lite_1.default.lookup(userIp.toString()); // Geolocation info based on IP
                // const fingerprint = DeviceFingerprint.get(userAgent);
            }
            const screenResolution = `${req.headers['x-screen-width']}x${req.headers['x-screen-height']}`;
            // Generate fingerprint (browser characteristics + device info)
            res.json({ userIp, screenResolution, userAgent, geo });
        }));
        //Main Routes
        app.use('/api/users', user_routes_1.default);
        app.use('/api/products', product_routes_1.default);
        app.use('/api/upload', upload_routes_1.default);
        app.use('/api/files', file_routes_1.default);
        app.use('/api/qrcodes', qrcode_routes_1.default);
        const qrCodeController = new qrcode_controller_1.QrCodeController();
        app.get('/l/:alias/:type/:qid', (req, res) => qrCodeController.getVideo(req, res));
        app.get('/:alias/:qid', (req, res, next) => {
            if (reservedAliases.has(req.params.alias)) {
                next();
                return;
            }
            qrCodeController.playVideo(req, res);
        });
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
