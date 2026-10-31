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
  app.use(express.json({ limit: '100kb' }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  app.use('/api/v1', apiRoutes);
  app.use('/api', notFound);

  // Single-service deployment: serve the built React app when it exists.
  if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
    app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  } else {
    app.get('/', (req, res) => res.json({ name: 'PhishShield AI API', docs: '/api/v1/health' }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
