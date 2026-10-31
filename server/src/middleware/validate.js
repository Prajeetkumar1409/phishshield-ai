import { z } from 'zod';
import config from '../config/index.js';

export const analyzeSchema = z.object({
  type: z.enum(['email', 'sms', 'url', 'message']),
  content: z.string().trim().min(1, 'Content is required').max(config.maxContentLength, `Content must be under ${config.maxContentLength} characters`),
  sender: z.string().trim().max(320).optional().or(z.literal('')),
  replyTo: z.string().trim().max(320).optional().or(z.literal('')),
  subject: z.string().trim().max(500).optional().or(z.literal('')),
  save: z.boolean().optional().default(true),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  verdict: z.enum(['safe', 'suspicious', 'phishing']).optional(),
  type: z.enum(['email', 'sms', 'url', 'message']).optional(),
});

/** Validate req[source] against a zod schema and replace it with the parsed value. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'ValidationError',
      message: result.error.issues[0].message,
      details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  req.validated = result.data;
  next();
};
