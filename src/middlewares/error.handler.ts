import { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/http.utils';

export const internalErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  if (error.code === 11000) { res.status(409).json({ error: 'Email already registered' }); return; }
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid request data' }); return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
};
