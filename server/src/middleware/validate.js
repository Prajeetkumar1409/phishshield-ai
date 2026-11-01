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

const base64Max = Math.ceil((config.maxAttachmentBytes * 4) / 3) + 4;

export const attachmentSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    data: z.string().max(base64Max, `Attachment is larger than ${config.maxAttachmentBytes / 1024 / 1024} MB; send its sha256 instead`).regex(/^[A-Za-z0-9+/=\s]*$/, 'data must be base64').optional(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha256 must be 64 hex characters').optional(),
  })
  .refine((v) => v.data || v.sha256, 'Provide the file as base64 data or its sha256');

export const intelSchema = z.object({
  ip: z.string().trim().max(45).optional(),
  domains: z.array(z.string().trim().min(1).max(253)).max(6).default([]),
  urls: z.array(z.string().trim().url().max(2048)).max(5).default([]),
});

export const assistantSchema = z
  .object({
    evidence: z.record(z.any()).refine((e) => JSON.stringify(e).length <= 40000, 'Case evidence is too large'),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(4000) })).max(20).default([]),
    question: z.string().trim().max(1000).optional(),
    mode: z.enum(['chat', 'summary']).default('chat'),
  })
  .refine((v) => v.mode === 'summary' || (v.question && v.question.length), 'Ask a question');
