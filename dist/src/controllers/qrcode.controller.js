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
const base_controller_1 = require("./base.controller");
const qrcode_model_1 = require("../models/qrcode.model");
const qrcode_service_1 = require("../services/qrcode.service");
const product_service_1 = require("../services/product.service");
const file_service_1 = require("../services/file.service");
const alias_constant_1 = require("../constants/alias.constant");
const file_model_1 = require("../models/file.model");
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
class QrCodeController extends base_controller_1.BaseController {
    constructor() {
        super(new qrcode_service_1.QrCodeService());
        this.productService = new product_service_1.ProductService();
        this.fileService = new file_service_1.FileService();
        this.qrCodeService = this.service;
    }
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { productId, userId } = req.body;
            try {
                const queryOptions = { populate: [{ path: 'file' }, { path: 'owner' }] };
                const product = yield this.productService.findById(productId, queryOptions);
                const file = product === null || product === void 0 ? void 0 : product.file;
                const user = product === null || product === void 0 ? void 0 : product.owner;
                if (!(0, file_model_1.isIFile)(file) || !product || !user) {
                    res.status(406).json({ error: "Incorrect input file" });
                    return;
                }
                const qrCodeData = {
                    file: file.id,
                    owner: userId,
                    product: productId,
                    createdBy: userId
                };
                const qrCode = yield this.service.add(new qrcode_model_1.QrCodeModel(qrCodeData));
                const alias = user.useAlias ? user.alias : 'q';
                const url = `${req.protocol}://${req.get('host')}/${alias}/${qrCode.id}`;
                const qrCodeBase64Url = yield this.qrCodeService.generateQrCodeBase64Url(url);
                if (!qrCodeBase64Url) {
                    res.status(404).json({ error: "Can't generate qr code" });
                    return;
                }
                const updateCodeData = {
                    qrCode: qrCodeBase64Url,
                    url: url
                };
                const qrUpdateCode = yield this.service.update(qrCode.id, updateCodeData);
                res.status(201).json(qrUpdateCode);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
    getAllWithOptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = '6753972793a2442b1fa32';
                const $or = [
                    { alias: 'qr-goce-code' },
                    { _id: id }
                ];
                const pagination = {
                    limit: 1,
                    skip: 0
                };
                const options = {
                    populate: ['owner', 'createdBy', 'file', 'product'],
                    pagination
                };
                const alias = 'c';
                const queryOptions = mongoose_1.default.Types.ObjectId.isValid(id) ? Object.assign({ $or }, options) : Object.assign({ alias }, options);
                const qrcodes = yield this.service.getAll(queryOptions);
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
                const $or = [
                    { alias: 'qr-goce-code' },
                    { _id: id }
                ];
                const pagination = {
                    limit: 1,
                    skip: 0
                };
                const options = {
                    populate: ['owner', 'createdBy', 'file', 'product'],
                    pagination
                };
                const alias = id;
                const queryOptions = mongoose_1.default.Types.ObjectId.isValid(id) ? Object.assign({ $or }, options) : Object.assign({ alias }, options);
                const qrCodes = yield this.service.getAll(queryOptions);
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
            const { type, qid } = req.params;
            // Define the video file path
            ///:alias/:type/:pid
            const $or = [
                { alias: 'qr-goce-code' },
                { _id: qid }
            ];
            const pagination = {
                limit: 1,
                skip: 0
            };
            const options = {
                populate: ['owner', 'createdBy', 'file', 'product'],
                pagination
            };
            const alias = qid;
            const queryOptions = mongoose_1.default.Types.ObjectId.isValid(qid) ? Object.assign({ $or }, options) : Object.assign({ alias }, options);
            const qrCodes = yield this.service.getAll(queryOptions);
            const qrCode = qrCodes[0];
            const product = qrCode === null || qrCode === void 0 ? void 0 : qrCode.product;
            if (!product) {
                res.status(406).json({ error: "Incorrect url" });
                return;
            }
            const f = product === null || product === void 0 ? void 0 : product.file;
            const file = yield this.fileService.findById(f);
            if (!file) {
                res.status(406).json({ error: "Incorrect url" });
                return;
            }
            const typeKey = alias_constant_1.TypeAlias[file.type];
            if (!type || type !== typeKey) {
                res.status(406).json({ error: "Incorrect url" });
                return;
            }
            const videoPath = product.url;
            const fullVideoPath = path_1.default.resolve(videoPath);
            // Check if the video file exists (optional)
            res.sendFile(fullVideoPath, (err) => {
                if (err) {
                    console.error('Error sending video:', err);
                    res.status(404).send('Video not found');
                }
            });
        });
    }
    playVideo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { qid } = req.params;
            const $or = [
                { alias: 'qr-goce-code' },
                { _id: qid }
            ];
            const pagination = {
                limit: 1,
                skip: 0
            };
            const options = {
                populate: ['owner', 'createdBy', 'file', 'product'],
                pagination
            };
            const alias = qid;
            const queryOptions = mongoose_1.default.Types.ObjectId.isValid(qid) ? Object.assign({ $or }, options) : Object.assign({ alias }, options);
            const qrCodes = yield this.service.getAll(queryOptions);
            const qrCode = qrCodes[0];
            const product = qrCode === null || qrCode === void 0 ? void 0 : qrCode.product;
            if (!product) {
                res.status(406).json({ error: "Incorrect url" });
                return;
            }
            const f = product === null || product === void 0 ? void 0 : product.file;
            const file = yield this.fileService.findById(f);
            if (!file) {
                res.status(406).json({ error: "Incorrect url" });
                return;
            }
            const type = alias_constant_1.TypeAlias[file.type];
            const videoPath = `${req.protocol}://${req.get('host')}/l/${alias}/${type}/${qid}`;
            // Check if the video file exists (optional)
            res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Stream</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0; /* Light background for better visibility */
          }

          video {
            height: 100vh; /* Full height of the viewport */
            width: auto;    /* Adjust width to maintain aspect ratio */
            border: none;   /* Optional: Remove border */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional shadow for aesthetics */
          }
        </style>
      </head>
      <body>
        <video controls>
          <source src="${videoPath}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </body>
      </html>

      `);
        });
    }
}
exports.QrCodeController = QrCodeController;
