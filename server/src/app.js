import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(compression());
  // Attachments are base64 in JSON (up to ~4 MB); parse them before the small global limit applies
  app.use('/api/v1/attachments', express.json({ limit: '4.4mb' }));
  app.use(express.json({ limit: '100kb' }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  app.use('/api/v1', apiRoutes);
  app.use('/api', notFound);

  // Single-service deployment: the site is TRACE-X; the old React pages redirect to it.
  const traceX = path.join(config.clientDist, 'trace-x.html');
  if (fs.existsSync(traceX)) {
    app.get(['/analyze', '/dashboard', '/learn', '/scan/:id'], (req, res) => res.redirect('/'));
    // Hashed assets are immutable; HTML pages must revalidate so a deploy shows up on the next load.
    app.use(express.static(config.clientDist, {
      index: false,
      setHeaders: (res, file) => res.setHeader('Cache-Control', file.endsWith('.html')
        ? 'no-cache'
        : file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'),
    }));
    app.get('*', (req, res) => res.sendFile(traceX, { headers: { 'Cache-Control': 'no-cache' } }));
  } else {
    app.get('/', (req, res) => res.json({ name: 'PhishShield AI API', docs: '/api/v1/health' }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
