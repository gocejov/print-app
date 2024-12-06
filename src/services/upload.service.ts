import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';



// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set upload directory
    const uploadDir = 'uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save file with a timestamp to avoid conflicts
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File type filter to allow only video files
const videoFileFilter: any = (req: Request, file: any, cb: any) => {
  console.log("file.mimetype", file.mimetype)
  const allowedTypes = ['video/mp4', 'video/avi', 'video/mkv', 'video/mov', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});


export { upload }
