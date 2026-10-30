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
exports.QrCodeController = void 0;
const embed_service_1 = require("../services/embed.service");
const visitor_service_1 = require("../services/visitor.service");
const browser_scan_service_1 = require("../services/browser-scan.service");
const file_model_1 = require("../models/file.model");
const http_utils_1 = require("../utils/http.utils");
const product_page_service_1 = require("../services/product-page.service");
const qr_playback_service_1 = require("../services/qr-playback.service");
const base_controller_1 = require("./base.controller");
const qrcode_service_1 = require("../services/qrcode.service");
const alias_constant_1 = require("../constants/alias.constant");
const mongoose_1 = __importDefault(require("mongoose"));
const statistic_service_1 = require("../services/statistic.service");
const dynamic_qrcode_service_1 = require("../services/dynamic-qrcode.service");
const media_service_1 = require("../services/media.service");
class QrCodeController extends base_controller_1.BaseController {
    constructor() {
        super(new qrcode_service_1.QrCodeService());
        this.statisticService = new statistic_service_1.StatisticService();
    }
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = new dynamic_qrcode_service_1.DynamicQrCodeService();
            res
                .status(201)
                .json(yield (req.body.campaignId
                ? service.createForCampaign.bind(service)
                : service.createForProduct.bind(service))(String(res.locals.user._id), req.body.campaignId || req.body.productId, req.body.name, `${req.protocol}://${req.get('host')}`));
        });
    }
    getAllWithOptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const qrcodes = yield this.service.getAll(Object.assign(Object.assign({}, res.locals.scope), { populate: [
                        'owner',
                        'createdBy',
                        'campaign',
                        { path: 'product', populate: { path: 'file' } },
                    ] }));
                res.json(qrcodes);
            }
            catch (err) {
                res.status(500).json({ error: err });
            }
        });
    }
    // Route to generate the QR code
    getQrCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                if (!id) {
                    return res.status(400).send('URL query parameter is required');
                }
                const $or = [{ _id: id }];
                const pagination = {
                    limit: 1,
                    skip: 0,
                };
                const options = {
                    populate: [
                        'owner',
                        'createdBy',
                        'campaign',
                        { path: 'product', populate: { path: 'file' } },
                    ],
                    pagination,
                };
                const alias = id;
                const queryOptions = mongoose_1.default.Types.ObjectId.isValid(id)
                    ? Object.assign({ $or }, options) : Object.assign({ alias }, options);
                const qrCodes = yield this.service.getAll(Object.assign(Object.assign({}, queryOptions), res.locals.scope));
                const qrCode = qrCodes[0];
                if (!(qrCode === null || qrCode === void 0 ? void 0 : qrCode.qrCode)) {
                    return res.status(400).send('QrCode not found');
                }
                const qrBase64Url = qrCode === null || qrCode === void 0 ? void 0 : qrCode.qrCode;
                // Generate the QR code as a data URL (image)
                return res.send(`
            <html>
              <head>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: #f0f0f0; /* Light background for better visibility */
                }
                .qr-code {
                  max-width: 100%;  /* Scale to fit horizontally with some margin */
                  max-height: 100%; /* Scale to fit vertically with some margin */
                  //border: 2px solid #333; /* Optional border for better visibility */
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional shadow for aesthetics */
                }
              </style>
              </head>
              <body>
                <img class="qr-code" src="${qrBase64Url}" alt="QR Code" style="max-width: 100%; height: auto;" />
              </body>
            </html>
          `);
            }
            catch (err) {
                console.error('Error generating QR code:', err);
                return res.status(500).json({ mesage: 'Error generating QR code', err });
            }
        });
    }
    getVideo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.set('Cache-Control', 'no-store');
            const playback = new qr_playback_service_1.QrPlaybackService();
            const code = yield playback.load(req.params.qid);
            const target = yield playback.mediaTarget(code, req.query.selection);
            let file = target.file;
            if (req.query.media !== undefined) {
                if (target.product.displayMode !== 'page' ||
                    typeof req.query.media !== 'string' ||
                    !((_a = target.product.mediaIds) === null || _a === void 0 ? void 0 : _a.some((id) => String(id) === req.query.media)))
                    throw new http_utils_1.HttpError(404, 'Media not found');
                const attachment = yield file_model_1.FileModel.findOne({
                    _id: req.query.media,
                    createdBy: code.createdBy,
                    type: { $in: ['image', 'video'] },
                });
                if (!attachment)
                    throw new http_utils_1.HttpError(404, 'Media not found');
                file = attachment;
            }
            if (req.params.type !== alias_constant_1.TypeAlias[String(file.type)]) {
                res.status(406).json({ error: 'Incorrect URL' });
                return;
            }
            if (file.type === 'web-url') {
                res.redirect(code.campaign ? String(file.url) : code.destinationUrl || String(file.url));
                return;
            }
            res.set('X-Content-Type-Options', 'nosniff').type(String(file.mimetype));
            res.sendFile((0, media_service_1.mediaPath)(file.path), (error) => {
                if (error && !res.headersSent)
                    res.status(404).send('Media not found');
            });
        });
    }
    playVideo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            res.set('Cache-Control', 'no-store');
            const playback = new qr_playback_service_1.QrPlaybackService();
            const code = yield playback.load(req.params.qid);
            const target = yield playback.draw(code);
            const file = target.file;
            const { fingerprint, fingerprintData } = res.locals;
            const visitor = ((_a = req.get('accept')) === null || _a === void 0 ? void 0 : _a.includes('text/html'))
                ? yield (0, visitor_service_1.identifyVisitor)(req, res, String(code.createdBy))
                : undefined;
            const statistic = Object.assign(Object.assign({ qrCode: code._id, product: target.product._id }, (target.campaignId ? { campaign: new mongoose_1.default.Types.ObjectId(target.campaignId) } : {})), { data: Object.assign(Object.assign({}, (visitor ? { visitor } : {})), { fingerprintData,
                    fingerprint, request: {
                        method: req.method,
                        path: req.path.slice(0, 2048),
                        query: [
                            ...new URLSearchParams((req.originalUrl.includes('?')
                                ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1)
                                : '').slice(0, 8192)),
                        ],
                        referrer: (_b = req.get('referer')) === null || _b === void 0 ? void 0 : _b.slice(0, 2048),
                    } }) });
            const saved = yield this.statisticService.add(statistic).catch((error) => {
                console.error('Error saving statistic:', error);
                return undefined;
            });
            if (saved && ((_c = req.get('accept')) === null || _c === void 0 ? void 0 : _c.includes('text/html'))) {
                try {
                    const token = yield new browser_scan_service_1.BrowserScanService().create(Object.assign({ ownerId: String(code.createdBy), qrId: String(code._id), productId: String(target.product._id), fileId: String(file._id), statisticId: String(saved._id) }, (code.campaign ? { selection: yield playback.ticket(code, target) } : {})));
                    res.set('Referrer-Policy', 'no-referrer').type('html').send((0, browser_scan_service_1.browserScanPage)(token));
                    return;
                }
                catch (error) {
                    console.error('Browser scan collection unavailable:', error);
                }
            }
            return this.deliver(req, res, code, target);
        });
    }
    continueScan(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer');
            const context = yield new browser_scan_service_1.BrowserScanService().load(req.params.token);
            const playback = new qr_playback_service_1.QrPlaybackService();
            const code = yield playback.load(context.qrId);
            const target = yield playback.mediaTarget(code, context.selection);
            if (String(target.product._id) !== context.productId ||
                String(target.file._id) !== context.fileId)
                throw new http_utils_1.HttpError(410, 'Content changed; scan the QR code again');
            yield new browser_scan_service_1.BrowserScanService().confirm(context, req);
            return this.deliver(req, res, code, target);
        });
    }
    deliver(req, res, code, target) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const playback = new qr_playback_service_1.QrPlaybackService();
            const file = target.file;
            if (target.product.displayMode === 'page') {
                const token = code.campaign ? yield playback.ticket(code, target) : undefined;
                const media = yield file_model_1.FileModel.find({
                    _id: { $in: target.product.mediaIds || [] },
                    createdBy: code.createdBy,
                    type: { $in: ['image', 'video'] },
                });
                res.type('html').send((0, product_page_service_1.productPage)(target.product, file, media, String(code._id), token));
                return;
            }
            if (file.type === 'web-url') {
                const destination = code.campaign ? String(file.url) : code.destinationUrl || String(file.url);
                if (((_a = req.get('accept')) === null || _a === void 0 ? void 0 : _a.includes('text/html')) &&
                    (yield (0, embed_service_1.canEmbed)(destination, `${req.protocol}://${req.get('host')}`))) {
                    res.type('html').send((0, embed_service_1.embeddedPage)(destination, target.product.name || 'Shared content'));
                }
                else
                    res.redirect(destination);
                return;
            }
            const ticket = code.campaign ? `?selection=${yield playback.ticket(code, target)}` : '';
            const mediaUrl = `/l/q/${alias_constant_1.TypeAlias[String(file.type)]}/${code._id}${ticket}`;
            const content = file.type === 'image'
                ? `<img src="${(0, media_service_1.escapeHtml)(mediaUrl)}" alt="${(0, media_service_1.escapeHtml)(String(file.name || file.originalname || 'Shared image'))}" />`
                : `<video controls playsinline><source src="${(0, media_service_1.escapeHtml)(mediaUrl)}" type="${(0, media_service_1.escapeHtml)(String(file.mimetype || 'video/mp4'))}">Your browser does not support this video.</video>`;
            res
                .type('html')
                .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shared ${file.type === 'image' ? 'image' : 'video'} — QR2Share</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#101915}img,video{display:block;max-width:100%;max-height:100dvh;object-fit:contain}</style></head><body>${content}</body></html>`);
        });
    }
}
exports.QrCodeController = QrCodeController;
