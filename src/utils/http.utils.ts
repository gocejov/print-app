import { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
}

export function objectBody(body: unknown, allowed: string[]): Record<string, any> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'A JSON object is required');
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) throw new HttpError(400, `Unexpected field: ${key}`);
  }
  return body as Record<string, any>;
}

export function text(value: unknown, field: string, min = 1, max = 200): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new HttpError(400, `Invalid ${field}`);
  return value.trim();
}

export function passwordInput(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new HttpError(400, 'Password must contain 12–128 characters');
  return value;
}

export function emailInput(value: unknown): string {
  const email = text(value, 'email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email');
  return email;
}
