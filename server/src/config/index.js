import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  storageFile: process.env.STORAGE_FILE || path.join(root, 'storage', 'scans.json'),
  maxHistory: Number(process.env.MAX_HISTORY) || 500,
  maxContentLength: 20000,
  rateLimit: {
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 60,
  },
  // Built frontend served by the API in production (single-service deploy)
  clientDist: process.env.CLIENT_DIST || path.resolve(root, '..', 'client', 'dist'),
  thresholds: {
    suspicious: 35,
    phishing: 65,
  },
  // Attachments arrive base64-encoded in JSON; Vercel caps request bodies at 4.5 MB
  maxAttachmentBytes: 3 * 1024 * 1024,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || '', // empty: use defaultModel, falling back to the newest stable Flash
    defaultModel: 'gemini-2.5-flash',
  },
  virustotal: {
    apiKey: process.env.VIRUSTOTAL_API_KEY || '',
    perMinute: Number(process.env.VIRUSTOTAL_PER_MINUTE) || 4, // free-tier quota
  },
};

export default config;
