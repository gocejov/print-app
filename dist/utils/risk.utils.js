"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskScore = void 0;
const getRiskScore = (ip, fingerprint) => {
    // Example risk scoring based on IP change, you can modify this logic
    let riskScore = 0;
    if (ip !== fingerprint) {
        riskScore += 5; // Increase risk score for different IP/fingerprint
    }
    return riskScore;
};
exports.getRiskScore = getRiskScore;
