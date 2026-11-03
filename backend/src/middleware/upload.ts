import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 5 MB ceiling per image constraint from requirements
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const MAX_IMAGE_COUNT = 5;
export const MIN_IMAGE_COUNT = 1;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and HEIC are supported.`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_IMAGE_COUNT,
  },
  fileFilter,
}).array('images', MAX_IMAGE_COUNT);

// Wrapper middleware to handle Multer errors with appropriate HTTP status codes
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Image exceeds 5 MB ceiling limit. The app must compress images before uploading.',
          code: 'PAYLOAD_TOO_LARGE',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: `Too many images. Maximum allowed is ${MAX_IMAGE_COUNT}.`,
          code: 'TOO_MANY_FILES',
        });
      }
      return res.status(400).json({ error: err.message, code: err.code });
    } else if (err) {
      return res.status(400).json({ error: err.message, code: 'INVALID_FILE' });
    }
    next();
  });
};
