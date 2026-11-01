import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, analyzeSchema, historyQuerySchema, attachmentSchema, intelSchema, assistantSchema } from '../middleware/validate.js';
import { analyzeContent, getModels } from '../controllers/analyze.controller.js';
import { listScans, getScan, deleteScan, clearScans, getStats } from '../controllers/history.controller.js';
import { scanAttachment, lookupIntel, askAssistant, capabilities } from '../controllers/forensics.controller.js';

const router = Router();

const analyzeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many scans, please slow down.' },
});

const limiter = (limit, message) =>
  rateLimit({ windowMs: 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'TooManyRequests', message } });
const forensicsLimiter = limiter(40, 'Too many lookups, please slow down.');
// Each assistant call costs model quota, so it gets the tightest limit
const assistantLimiter = limiter(15, 'Too many assistant questions, please wait a minute.');

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() }));
router.get('/models', getModels);

router.post('/analyze', analyzeLimiter, validate(analyzeSchema), asyncHandler(analyzeContent));

router.get('/history', validate(historyQuerySchema, 'query'), listScans);
router.delete('/history', asyncHandler(clearScans));
router.get('/history/:id', getScan);
router.delete('/history/:id', asyncHandler(deleteScan));

router.get('/stats', getStats);

// TRACE-X forensics: real attachment analysis, registry intel and the AI assistant
router.get('/capabilities', capabilities);
router.post('/attachments/scan', forensicsLimiter, validate(attachmentSchema), asyncHandler(scanAttachment));
router.post('/intel', forensicsLimiter, validate(intelSchema), asyncHandler(lookupIntel));
router.post('/assistant', assistantLimiter, validate(assistantSchema), asyncHandler(askAssistant));

export default router;
