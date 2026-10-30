import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { Request, Response } from 'express'
import { QrCodeModel } from '../models/qrcode.model'
import { StatisticModel } from '../models/statistic.model'

export const VISITOR_COOKIE = 'qr2share_visitor'
const secret = () =>
  process.env.VISITOR_SECRET || process.env.SESSION_SECRET || 'local-development-only-secret'
const hash = (value: string) => createHmac('sha256', secret()).update(value).digest('hex')
export function visitorId(owner: string, raw: string) {
  return hash(`visitor:v1:${owner}:${raw}`)
}
export function readVisitor(req: Request): string | undefined {
  const value = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1)
  if (!value || !/^[a-f0-9]{48}\.[a-f0-9]{64}$/.test(value)) return
  const [raw, signature] = value.split('.')
  if (timingSafeEqual(Buffer.from(signature), Buffer.from(hash(`cookie:v1:${raw}`)))) return raw
}
export function privacyPreference(req: Request) {
  return req.get('sec-gpc') === '1'
}
export async function identifyVisitor(req: Request, res: Response, owner: string) {
  if (privacyPreference(req)) {
    res.clearCookie(VISITOR_COOKIE, { path: '/' })
    return { method: 'unrecognized', reason: 'privacy-preference' }
  }
  const previous = readVisitor(req)
  const raw = previous || randomBytes(24).toString('hex')
  if (!previous)
    res.cookie(VISITOR_COOKIE, `${raw}.${hash(`cookie:v1:${raw}`)}`, {
      httpOnly: true,
      secure: req.secure || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 180 * 86400000,
      path: '/',
    })
  const id = visitorId(owner, raw)
  const codes = await QrCodeModel.find({ createdBy: owner }).select('_id')
  const returning = Boolean(
    await StatisticModel.exists({
      qrCode: { $in: codes.map((code) => code._id) },
      'data.visitor.id': id,
      'data.visitor.confirmed': true,
    }),
  )
  return {
    id,
    method: 'first-party-cookie',
    confirmed: Boolean(previous),
    audience: returning ? 'returning' : 'new',
  }
}
/** Diagnostic similarity only: never restore a cleared cookie or merge cookie identities. */
export function browserFingerprint(
  owner: string,
  browser: Record<string, unknown>,
  ua: any,
): string | undefined {
  const fields = [
    browser.language,
    browser.timezone,
    browser.platform,
    browser.screenWidth,
    browser.screenHeight,
    browser.pixelRatio,
    browser.maxTouchPoints,
    ua?.browser?.name,
    ua?.os?.name,
  ]
  if (fields.slice(0, 7).filter((value) => value !== undefined && value !== '').length < 6) return
  return hash(`fingerprint:v1:${owner}:${JSON.stringify(fields)}`)
}
