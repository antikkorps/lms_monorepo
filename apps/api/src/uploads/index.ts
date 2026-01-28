/**
 * Uploads Routes
 * File upload endpoints with multer middleware
 */

import Router from '@koa/router';
import multer from '@koa/multer';
import { authenticate } from '../auth/middleware.js';
import {
  uploadImage,
  uploadVideo,
  uploadDocument,
  getSignedUploadUrl,
  deleteFile,
  getFileInfo,
} from './controller.js';

// Configure multer for memory storage (files stay in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max (for videos)
  },
});

export const uploadsRouter = new Router({ prefix: '/uploads' });

// All upload routes require authentication
uploadsRouter.use(authenticate);

// Upload endpoints (multipart form-data)
uploadsRouter.post('/image', upload.single('file'), uploadImage);
uploadsRouter.post('/video', upload.single('file'), uploadVideo);
uploadsRouter.post('/document', upload.single('file'), uploadDocument);

// Direct upload (get signed URL for client-side upload)
uploadsRouter.post('/signed-url', getSignedUploadUrl);

// File management - use wildcard syntax for path-to-regexp v8+
// *key captures the full path including slashes (e.g., "images/abc123.jpg")
uploadsRouter.get('/*key', getFileInfo);
uploadsRouter.delete('/*key', deleteFile);
