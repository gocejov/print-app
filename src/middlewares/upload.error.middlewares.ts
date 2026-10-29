import { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const uploadErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) { res.status(400).json({ error: err.message }); return; }
  next(err);
};
