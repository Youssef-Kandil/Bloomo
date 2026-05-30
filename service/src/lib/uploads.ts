import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import multer, { type Multer } from 'multer';

/**
 * Centralized upload setup. Files live on disk under UPLOAD_DIR so DB rows
 * stay small and we can serve them through `express.static` with long
 * cache headers. The DB only stores the relative URL.
 */
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
);

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(UPLOAD_DIR);
ensureDir(path.join(UPLOAD_DIR, 'voice-notes'));

function randomFilename(len = 16): string {
  return crypto.randomBytes(Math.ceil(len * 0.75)).toString('base64url').slice(0, len);
}

/**
 * Voice-note uploader: hardcoded to common browser-recorder MIME types,
 * 1 MB cap (≈ 60s of 128 kbps Opus with safety margin), stored under
 * uploads/voice-notes/<randomId>.<ext>.
 */
const VOICE_MIMES: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-m4a': '.m4a',
};

export const voiceNoteUploader: Multer = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, 'voice-notes')),
    filename: (_req, file, cb) => {
      const ext = VOICE_MIMES[file.mimetype] ?? path.extname(file.originalname) ?? '.bin';
      cb(null, `${randomFilename()}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  fileFilter: (_req, file, cb) => {
    if (VOICE_MIMES[file.mimetype]) cb(null, true);
    else cb(new Error(`Unsupported voice note format: ${file.mimetype}`));
  },
});

export function publicUrlForUpload(absolutePath: string): string {
  const rel = path.relative(UPLOAD_DIR, absolutePath).replace(/\\/g, '/');
  return `/uploads/${rel}`;
}

export function deleteUploadByUrl(url: string | null | undefined): void {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, url.slice('/uploads/'.length));
  // Best-effort — never throw, files may have been removed already.
  fs.promises.unlink(file).catch(() => undefined);
}
