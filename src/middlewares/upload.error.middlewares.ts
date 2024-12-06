import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Error handling middleware
const uploadErrorHandler = ((err: Error, req: Request, res: Response, next: NextFunction): any => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

export { uploadErrorHandler }
