"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rematchingEvidence = rematchingEvidence;
/** Analytics evidence only. This never restores a cookie, merges IDs or grants content access. */
const extraSignals = [
    ['CPU threads', ['data', 'browser', 'hardwareConcurrency']],
    ['Device memory', ['data', 'browser', 'deviceMemory']],
    ['Color depth', ['data', 'browser', 'colorDepth']],
    ['Browser version', ['data', 'fingerprintData', 'ua', 'browser', 'major']],
    ['OS version', ['data', 'fingerprintData', 'ua', 'os', 'version']],
];
const read = (scan, path) => path.reduce((value, key) => value === null || value === void 0 ? void 0 : value[key], scan);
function rematchingEvidence(current, related, truncated = false) {
    var _a, _b, _c;
    const firstSeen = Math.min(...current.map((scan) => +new Date(scan.created_at)));
    const seed = [...current]
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
        .find((scan) => {
        var _a, _b, _c, _d;
        return ((_b = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor) === null || _b === void 0 ? void 0 : _b.confirmed) &&
            ((_d = (_c = scan.data) === null || _c === void 0 ? void 0 : _c.browserFingerprint) === null || _d === void 0 ? void 0 : _d.version) === 1 &&
            /^[a-f0-9]{64}$/.test(scan.data.browserFingerprint.hash) &&
            +new Date(scan.created_at) <= firstSeen + 86400000;
    });
    const base = {
        windowDays: 7,
        truncated,
        fingerprint: seed === null || seed === void 0 ? void 0 : seed.data.browserFingerprint.hash,
    };
    if (!seed)
        return Object.assign(Object.assign({}, base), { status: 'insufficient-evidence', candidates: [] });
    const id = seed.data.visitor.id;
    const groups = new Map();
    for (const scan of related) {
        const visitor = (_a = scan.data) === null || _a === void 0 ? void 0 : _a.visitor;
        const time = +new Date(scan.created_at);
        if (!(visitor === null || visitor === void 0 ? void 0 : visitor.confirmed) ||
            !visitor.id ||
            visitor.id === id ||
            ((_c = (_b = scan.data) === null || _b === void 0 ? void 0 : _b.browserFingerprint) === null || _c === void 0 ? void 0 : _c.version) !== 1 ||
            scan.data.browserFingerprint.hash !== base.fingerprint ||
            time < firstSeen - 7 * 86400000 ||
            time > firstSeen + 7 * 86400000)
            continue;
        const group = groups.get(visitor.id) || [];
        group.push(scan);
        groups.set(visitor.id, group);
    }
    const candidates = [...groups]
        .flatMap(([visitorId, scans]) => {
        const before = scans
            .filter((scan) => +new Date(scan.created_at) < firstSeen)
            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        if (!before.length)
            return [];
        const evidence = before[0];
        const matchingSignals = [], conflictingSignals = [];
        for (const [label, path] of extraSignals) {
            const a = read(seed, path), b = read(evidence, path);
            if (a === undefined || a === null || a === '' || b === undefined || b === null || b === '')
                continue;
            (String(a) === String(b) ? matchingSignals : conflictingSignals).push(label);
        }
        return [
            {
                visitorId,
                matchingScans: before.length,
                lastSeen: new Date(evidence.created_at).toISOString(),
                matchingSignals,
                conflictingSignals,
                overlappingActivity: scans.some((scan) => +new Date(scan.created_at) >= firstSeen),
            },
        ];
    })
        .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    return Object.assign(Object.assign({}, base), { status: truncated ||
            candidates.length > 1 ||
            candidates.some((candidate) => candidate.overlappingActivity || candidate.conflictingSignals.length)
            ? 'ambiguous'
            : candidates.length
                ? 'single-candidate'
                : 'none', candidates: candidates.slice(0, 10) });
}
