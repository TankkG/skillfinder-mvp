import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';

export const publicDir = path.join(env.uploadDir, 'public');
export const privateDir = path.join(env.uploadDir, 'private');

export const ensureUploadDirs = (): void => {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });
};

ensureUploadDirs();

const extensionFor = (mimetype: string): string => {
  switch (mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
};

const buildStorage = (destination: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = extensionFor(file.mimetype);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(
      ApiError.badRequest(
        'Formato no permitido. Utiliza imagenes JPEG o PNG.',
      ),
    );
    return;
  }
  cb(null, true);
};

const documentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (
    ![
      'image/jpeg',
      'image/png',
      'application/pdf',
    ].includes(file.mimetype)
  ) {
    cb(
      ApiError.badRequest(
        'Formato no permitido. Utiliza JPEG, PNG o PDF para documentos.',
      ),
    );
    return;
  }
  cb(null, true);
};

export const uploadPublicImage = multer({
  storage: buildStorage(publicDir),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadPrivateDocument = multer({
  storage: buildStorage(privateDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFilter,
});

export const publicUrlFor = (filename: string): string =>
  `/uploads/public/${filename}`;

export const resolvePrivateFile = (storageReference: string): string => {
  const resolved = path.resolve(privateDir, storageReference);
  if (!resolved.startsWith(path.resolve(privateDir))) {
    throw ApiError.forbidden('Referencia de archivo invalida.');
  }
  if (!fs.existsSync(resolved)) {
    throw ApiError.notFound('El archivo no existe.');
  }
  return resolved;
};

export const clientIp = (req: Request): string | undefined => req.ip;
