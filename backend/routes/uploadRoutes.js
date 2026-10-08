import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getUploadDirectory } from '../config/media.js';

import fs from 'fs';

const router = express.Router();

const allowedTypes = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  floorPlan: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'],
  floorplan: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'],
};

const allowedExtensions = {
  image: ['.jpg', '.jpeg', '.png', '.webp'],
  video: ['.mp4', '.webm', '.mov'],
  floorPlan: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg'],
  floorplan: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg'],
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const directory = getUploadDirectory();
    fs.mkdir(directory, { recursive: true }, (error) => callback(error, directory));
  },
  filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const kind = req.params.kind;
    if (!allowedTypes[kind]) {
      return callback(new Error(`Unsupported upload category: ${kind}`), false);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = allowedTypes[kind].includes(file.mimetype);
    const isExtValid = allowedExtensions[kind]?.includes(ext);

    if (!isMimeValid || !isExtValid) {
      return callback(new Error(`Invalid file type for ${kind}. Supported formats: ${allowedExtensions[kind]?.join(', ')}`), false);
    }

    callback(null, true);
  },
});

// Helper to sanitize SVG content against XSS / script execution
const isSafeSvg = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    if (lower.includes('<script') || lower.includes('javascript:') || /on\w+\s*=/i.test(content)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

router.post('/:kind', protect, authorize('landlord'), (req, res, next) => {
  if (!allowedTypes[req.params.kind]) return res.status(400).json({ success: false, message: 'Unsupported upload type.' });

  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message || 'File upload failed.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'A valid file is required.' });

    // Validate size specifically for floorPlan (max 20MB)
    const isFloorPlanKind = req.params.kind === 'floorPlan' || req.params.kind === 'floorplan';
    if (isFloorPlanKind && req.file.size > 20 * 1024 * 1024) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ success: false, message: 'Floor plan file exceeds maximum allowed size (20MB).' });
    }

    // SVG security check
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.svg' || req.file.mimetype === 'image/svg+xml') {
      if (!isSafeSvg(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ success: false, message: 'Uploaded SVG contains unsafe scripts or event handlers and cannot be accepted.' });
      }
    }

    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      data: {
        url,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      },
    });
  });
});

export default router;
