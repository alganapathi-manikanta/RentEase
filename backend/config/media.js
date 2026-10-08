import path from 'path';
import { fileURLToPath } from 'url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const getUploadDirectory = () =>
  path.resolve(process.env.UPLOAD_DIR || path.join(backendDirectory, 'uploads'));
