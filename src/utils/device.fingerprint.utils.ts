import crypto from "crypto";
import geoip from "geoip-lite";
import { Request } from "express";

import * as UAParser from "ua-parser-js";



export const DeviceFingerprint = {
  get: (req: Request) => {

    // 1. Correct IP extraction
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : (req.ip || "");

    // 2. Parse user-agent properly
    const uaRaw = req.headers["user-agent"] || "unknown";
    const ua = new UAParser.UAParser(uaRaw).getResult();

    // 3. Language normalization
    const language =
      req.headers["accept-language"]?.split(",")[0] || "unknown";

    // 4. Optional client-provided values (only if sent)
    const screenWidth = req.body?.screenWidth || "unknown";
    const screenHeight = req.body?.screenHeight || "unknown";
    const timezone = req.body?.timezone || "unknown";

    // 5. Geo lookup (analytics only)
    const geo = ip ? geoip.lookup(ip) : null;

    // 6. Stable fingerprint string (NO GEO inside)
    const fingerprintSource = [
      ua.browser.name,
      ua.os.name,
      language,
      screenWidth,
      screenHeight,
      timezone,
    ].join("|");

    // 7. Hash fingerprint
    const fingerprint = crypto
      .createHash("sha256")
      .update(fingerprintSource)
      .digest("hex");

    return {
      fingerprint,
      data: {
        ip,
        ipHash: crypto.createHash("sha256").update(ip).digest("hex"),
        ua,
        language,
        screenWidth,
        screenHeight,
        timezone,
        geo,
      },
    };
  },
};
