import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, analyzeSchema, historyQuerySchema } from '../middleware/validate.js';
import { analyzeContent, getModels } from '../controllers/analyze.controller.js';
import { listScans, getScan, deleteScan, clearScans, getStats } from '../controllers/history.controller.js';

const router = Router();

const analyzeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many scans, please slow down.' },
});

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() }));
router.get('/models', getModels);

router.post('/analyze', analyzeLimiter, validate(analyzeSchema), asyncHandler(analyzeContent));

router.get('/history', validate(historyQuerySchema, 'query'), listScans);
router.delete('/history', asyncHandler(clearScans));
router.get('/history/:id', getScan);
router.delete('/history/:id', asyncHandler(deleteScan));

router.get('/stats', getStats);

export default router;
