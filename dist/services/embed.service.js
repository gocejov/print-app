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
exports.publicAddress = publicAddress;
exports.embeddingHeadersAllow = embeddingHeadersAllow;
exports.canEmbed = canEmbed;
exports.embeddedPage = embeddedPage;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const promises_1 = require("dns/promises");
const ipaddr_js_1 = __importDefault(require("ipaddr.js"));
const media_service_1 = require("./media.service");
function publicAddress(address) {
    try {
        let parsed = ipaddr_js_1.default.parse(address);
        if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress())
            parsed = parsed.toIPv4Address();
        return parsed.range() === 'unicast';
    }
    catch (_a) {
        return false;
    }
}
/** Conservative: unsupported embedding policies fall back to top-level navigation. */
function embeddingHeadersAllow(headers, destination, parent) {
    const csp = String(headers['content-security-policy'] || '');
    let hasAncestors = false;
    for (const policy of csp.split(',')) {
        const directive = policy
            .split(';')
            .map((value) => value.trim())
            .find((value) => /^frame-ancestors(?:\s|$)/i.test(value));
        if (!directive)
            continue;
        hasAncestors = true;
        const sources = directive.split(/\s+/).slice(1);
        if (!sources.some((source) => {
            if (source === '*')
                return true;
            if (source === "'self'")
                return parent.origin === destination.origin;
            if (source === 'https:' || source === 'http:')
                return parent.protocol === source;
            try {
                const allowed = new URL(source);
                return (allowed.origin === parent.origin &&
                    allowed.pathname === '/' &&
                    !allowed.search &&
                    !allowed.hash &&
                    !allowed.username &&
                    !allowed.password);
            }
            catch (_a) {
                return false;
            }
        }))
            return false;
    }
    if (hasAncestors)
        return true;
    const xfo = String(headers['x-frame-options'] || '')
        .toUpperCase()
        .trim();
    if (!xfo)
        return true;
    return xfo === 'SAMEORIGIN' && destination.origin === parent.origin;
}
function headersFor(url, signal) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')))
            throw new Error('Unsupported probe target');
        const hostname = url.hostname.replace(/^\[|\]$/g, '');
        const addresses = yield Promise.race([
            (0, promises_1.lookup)(hostname, { all: true, verbatim: true }),
            new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Probe timed out')), { once: true })),
        ]);
        if (signal.aborted || !addresses.length || addresses.some((item) => !publicAddress(item.address)))
            throw new Error('Non-public target');
        const address = addresses[0];
        return new Promise((resolve, reject) => {
            const request = (url.protocol === 'https:' ? https_1.default : http_1.default).request(url, {
                method: 'HEAD',
                agent: false,
                signal,
                family: address.family,
                maxHeaderSize: 16384,
                // Pin the already validated DNS address; never resolve again at connection time.
                lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
                headers: { 'User-Agent': 'QR2Share-EmbedCheck/1.0', Accept: 'text/html' },
            }, (response) => {
                resolve({ status: response.statusCode || 0, headers: response.headers });
                response.destroy();
            });
            request.on('error', reject);
            request.end();
        });
    });
}
const cache = new Map();
function canEmbed(destination, parentOrigin) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = `${parentOrigin}|${destination}`;
        const cached = cache.get(key);
        if (cached && cached.expires > Date.now())
            return cached.allowed;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        let allowed = false;
        try {
            let target = new URL(destination);
            const parent = new URL(parentOrigin);
            for (let hop = 0; hop < 4; hop++) {
                if (target.hostname.replace(/^www\./, '') === parent.hostname.replace(/^www\./, ''))
                    break;
                if (/^\/[^/]+\/[a-f0-9]{24}\/?$/i.test(target.pathname))
                    break;
                if (parent.protocol === 'https:' && target.protocol !== 'https:')
                    break;
                const result = yield headersFor(target, controller.signal);
                if ([301, 302, 303, 307, 308].includes(result.status) && result.headers.location) {
                    target = new URL(result.headers.location, target);
                    continue;
                }
                const contentType = String(result.headers['content-type'] || '')
                    .split(';')[0]
                    .trim()
                    .toLowerCase();
                allowed =
                    result.status >= 200 &&
                        result.status < 300 &&
                        ['text/html', 'application/xhtml+xml'].includes(contentType) &&
                        embeddingHeadersAllow(result.headers, target, parent);
                break;
            }
        }
        catch (_a) {
            /* Unknown/unreachable/private destinations use ordinary browser navigation. */
        }
        finally {
            clearTimeout(timer);
            controller.abort();
        }
        if (cache.size >= 500)
            cache.delete(cache.keys().next().value);
        cache.set(key, { allowed, expires: Date.now() + 60000 });
        return allowed;
    });
}
function embeddedPage(destination, name) {
    const url = (0, media_service_1.escapeHtml)(destination);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${(0, media_service_1.escapeHtml)(name || 'Shared content')}</title><noscript><meta http-equiv="refresh" content="0;url=${url}"></noscript><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}iframe{display:block;border:0;width:100%;height:100dvh}</style><script src="/scan/embed.js" defer></script></head><body><iframe id="qr-content" title="${(0, media_service_1.escapeHtml)(name || 'Shared content')}" data-destination="${url}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe><script>setTimeout(function(){var frame=document.getElementById('qr-content');if(frame&&!frame.hasAttribute('src'))window.location.replace(frame.dataset.destination)},1500)</script></body></html>`;
}
