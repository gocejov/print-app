import { Request, Response } from 'express'
import {
  browserFingerprint,
  readVisitor,
  visitorId,
  privacyPreference,
  VISITOR_COOKIE,
} from './visitor.service'
import { randomBytes } from 'crypto'
import { redisClient } from '../config/redis.config'
import { StatisticModel } from '../models/statistic.model'
import { HttpError } from '../utils/http.utils'

const key = (token: string) => `${process.env.SESSION_KEY_PREFIX || 'sess:'}browser-scan:${token}`
export interface ScanContinuation {
  ownerId: string
  qrId: string
  productId: string
  fileId: string
  statisticId: string
  selection?: string
}

/** A short-lived capability can enrich only the scan that created it. No account required. */
export class BrowserScanService {
  async create(context: ScanContinuation) {
    const token = randomBytes(24).toString('hex')
    await redisClient.setex(key(token), 600, JSON.stringify(context))
    return token
  }
  async load(token: string): Promise<ScanContinuation> {
    if (!/^[a-f\d]{48}$/.test(token)) throw new HttpError(404, 'Scan not found')
    const raw = await redisClient.get(key(token))
    if (!raw) throw new HttpError(410, 'Scan expired; scan the QR code again')
    return JSON.parse(raw)
  }
  async confirm(context: ScanContinuation, req: Request) {
    const raw = readVisitor(req)
    if (!raw || !context.ownerId || privacyPreference(req)) return
    await StatisticModel.updateOne(
      {
        _id: context.statisticId,
        qrCode: context.qrId,
        'data.visitor.id': visitorId(context.ownerId, raw),
      },
      { $set: { 'data.visitor.confirmed': true } },
    )
  }
  async collect(token: string, body: unknown, req: Request, res: Response) {
    const context = await this.load(token)
    const browser = validateBrowserMetrics(body)
    const scan = await StatisticModel.findOne({ _id: context.statisticId, qrCode: context.qrId })
    const changes: Record<string, unknown> = {}
    if (privacyPreference(req) || browser.globalPrivacyControl === true) {
      changes['data.visitor'] = { method: 'unrecognized', reason: 'privacy-preference' }
      res.clearCookie(VISITOR_COOKIE, { path: '/' })
    } else if (scan && context.ownerId) {
      const raw = readVisitor(req)
      if (raw && scan.data?.visitor?.id === visitorId(context.ownerId, raw))
        changes['data.visitor.confirmed'] = true
      const fingerprint = browserFingerprint(
        context.ownerId,
        browser,
        scan.data?.fingerprintData?.ua,
      )
      if (fingerprint)
        changes['data.browserFingerprint'] = {
          hash: fingerprint,
          version: 1,
          confidence: 'estimated',
        }
    }
    await StatisticModel.updateOne(
      { _id: context.statisticId, qrCode: context.qrId, 'data.browser': { $exists: false } },
      {
        $set: {
          ...changes,
          'data.browser': {
            ...browser,
            receivedAt: new Date().toISOString(),
            source: 'browser-self-reported',
          },
        },
      },
    )
  }
}

export function validateBrowserMetrics(body: unknown): Record<string, unknown> {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    JSON.stringify(body).length > 8192
  )
    throw new HttpError(400, 'Invalid browser metrics')
  const input = body as Record<string, any>
  const result: Record<string, unknown> = {}
  const strings: Record<string, number> = {
    pointer: 20,
    connectionType: 30,
    language: 64,
    timezone: 100,
    platform: 100,
    colorScheme: 20,
    orientation: 30,
    effectiveType: 20,
    locationStatus: 40,
    referrerOrigin: 256,
  }
  for (const [field, max] of Object.entries(strings)) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'string' || input[field].length > max)
        throw new HttpError(400, `Invalid ${field}`)
      result[field] = input[field]
    }
  }
  if (input.languages !== undefined) {
    if (
      !Array.isArray(input.languages) ||
      input.languages.length > 10 ||
      input.languages.some((value: unknown) => typeof value !== 'string' || value.length > 64)
    )
      throw new HttpError(400, 'Invalid languages')
    result.languages = input.languages
  }
  const numbers: Record<string, [number, number]> = {
    hardwareConcurrency: [0, 4096],
    deviceMemoryGB: [0, 65536],
    availableScreenWidth: [0, 32768],
    availableScreenHeight: [0, 32768],
    colorDepth: [0, 128],
    downlinkMbps: [0, 1000000],
    networkRttMs: [0, 1000000],
    screenWidth: [0, 32768],
    screenHeight: [0, 32768],
    viewportWidth: [0, 32768],
    viewportHeight: [0, 32768],
    pixelRatio: [0, 20],
    maxTouchPoints: [0, 100],
    timezoneOffsetMinutes: [-1440, 1440],
    localHour: [0, 23],
    collectionMs: [0, 60000],
  }
  for (const [field, [min, max]] of Object.entries(numbers)) {
    if (input[field] !== undefined) {
      if (
        typeof input[field] !== 'number' ||
        !Number.isFinite(input[field]) ||
        input[field] < min ||
        input[field] > max
      )
        throw new HttpError(400, `Invalid ${field}`)
      result[field] = input[field]
    }
  }
  for (const field of [
    'online',
    'hover',
    'pdfViewerEnabled',
    'mobileHint',
    'reducedMotion',
    'saveData',
    'cookiesEnabled',
    'webdriver',
    'globalPrivacyControl',
  ]) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'boolean') throw new HttpError(400, `Invalid ${field}`)
      result[field] = input[field]
    }
  }
  if (input.browserBrands !== undefined) {
    if (
      !Array.isArray(input.browserBrands) ||
      input.browserBrands.length > 8 ||
      input.browserBrands.some(
        (item: any) =>
          !item ||
          typeof item.brand !== 'string' ||
          item.brand.length > 100 ||
          typeof item.version !== 'string' ||
          item.version.length > 40,
      )
    )
      throw new HttpError(400, 'Invalid browser brands')
    result.browserBrands = input.browserBrands.map((item: any) => ({
      brand: item.brand,
      version: item.version,
    }))
  }
  if (input.location !== undefined) {
    const location = input.location
    if (
      !location ||
      typeof location !== 'object' ||
      input.locationStatus !== 'granted' ||
      location.permissionGranted !== true ||
      typeof location.latitude !== 'number' ||
      !Number.isFinite(location.latitude) ||
      Math.abs(location.latitude) > 90 ||
      typeof location.longitude !== 'number' ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.longitude) > 180 ||
      typeof location.accuracyMeters !== 'number' ||
      !Number.isFinite(location.accuracyMeters) ||
      location.accuracyMeters < 0 ||
      location.accuracyMeters > 1e7
    )
      throw new HttpError(400, 'Invalid permitted location')
    result.location = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracyMeters,
      permissionGranted: true,
    }
  }
  return result
}

export function browserScanPage(token: string) {
  const url = `/scan/${token}/continue`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="3;url=${url}"><title>Opening your content — QR2Share</title><script src="/scan/collect.js" defer data-token="${token}"></script><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f3f5ef;color:#173e2c;font:16px system-ui}main{max-width:420px;padding:28px}a{color:inherit}p{line-height:1.6}</style></head><body><main><h1>Opening your content…</h1><p>QR2Share uses a first-party browser identifier and browser information for scan analytics. Location is used only if you have already allowed it.</p><a id="continue" href="${url}">Continue now</a><noscript><meta http-equiv="refresh" content="0;url=${url}"><p>JavaScript is unavailable. Continue to your content.</p></noscript></main></body></html>`
}
