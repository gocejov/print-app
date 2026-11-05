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
exports.textPosterCss = exports.posterBackgrounds = exports.posterFonts = void 0;
exports.validateTextPage = validateTextPage;
exports.textPoster = textPoster;
exports.textPage = textPage;
const sharp_1 = __importDefault(require("sharp"));
const http_utils_1 = require("../utils/http.utils");
const media_service_1 = require("./media.service");
exports.posterFonts = {
    handwritten: 'Poster Hand, cursive',
    classic: 'Georgia, serif',
    modern: 'Arial, sans-serif',
    typewriter: 'monospace',
};
exports.posterBackgrounds = {
    black: ['#080808', '#ffffff'],
    cream: ['#f5eddb', '#30271c'],
    forest: ['#163b30', '#ffffff'],
    rose: ['#f4dce1', '#432431'],
    white: ['#ffffff', '#161616'],
};
function validateTextPage(value) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = (0, http_utils_1.objectBody)(value, ['text', 'font', 'background', 'logo']);
        if (!Object.prototype.hasOwnProperty.call(exports.posterFonts, body.font) ||
            !Object.prototype.hasOwnProperty.call(exports.posterBackgrounds, body.background))
            throw new http_utils_1.HttpError(400, 'Choose a supported font and background');
        let logo = '';
        if (body.logo) {
            if (typeof body.logo !== 'string' ||
                body.logo.length > 1400000 ||
                !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.logo))
                throw new http_utils_1.HttpError(400, 'Logo must be a PNG, JPEG or WebP under 1 MB');
            try {
                const data = Buffer.from(body.logo.split(',')[1], 'base64');
                if (data.length > 1024 * 1024)
                    throw new Error('size');
                const normalized = yield (0, sharp_1.default)(data, { limitInputPixels: 16000000 })
                    .rotate()
                    .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
                    .png()
                    .toBuffer();
                logo = `data:image/png;base64,${normalized.toString('base64')}`;
            }
            catch (_a) {
                throw new http_utils_1.HttpError(400, 'Choose a valid logo image up to 1 MB and 16 megapixels');
            }
        }
        return {
            text: (0, http_utils_1.text)(body.text, 'text', 1, 5000),
            font: body.font,
            background: body.background,
            logo,
        };
    });
}
function textPoster(file) {
    const settings = file.textPage;
    const [background, color] = exports.posterBackgrounds[settings.background] || exports.posterBackgrounds.black;
    return `<section class="text-poster" style="background:${background};color:${color};font-family:${exports.posterFonts[settings.font] || exports.posterFonts.handwritten}"><p>${(0, media_service_1.escapeHtml)(settings.text)}</p>${settings.logo ? `<img class="poster-logo" src="${(0, media_service_1.escapeHtml)(settings.logo)}" alt="Logo">` : ''}</section>`;
}
exports.textPosterCss = `@font-face{font-family:'Poster Hand';src:url('/fonts/Pangolin-Regular.ttf') format('truetype');font-display:swap}.text-poster{box-sizing:border-box;min-height:70dvh;width:100%;padding:clamp(28px,7vw,80px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:32px}.text-poster p{margin:0;max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(28px,6vw,64px);line-height:1.3}.text-poster .poster-logo{width:auto;height:auto;max-width:min(200px,80%);max-height:100px;object-fit:contain}`;
function textPage(file) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${(0, media_service_1.escapeHtml)(file.name || 'Text poster')}</title><style>body{margin:0;background:${(exports.posterBackgrounds[file.textPage.background] || exports.posterBackgrounds.black)[0]}}${exports.textPosterCss}.text-poster{min-height:100dvh}</style></head><body>${textPoster(file)}</body></html>`;
}
