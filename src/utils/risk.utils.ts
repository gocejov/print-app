export const getRiskScore = (ip: any, fingerprint: any) => {
  // Example risk scoring based on IP change, you can modify this logic
  let riskScore = 0;
  if (ip !== fingerprint) {
    riskScore += 5; // Increase risk score for different IP/fingerprint
  }
  return riskScore;
};
