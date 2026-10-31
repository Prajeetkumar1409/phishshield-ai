import config from './config/index.js';
import { createApp } from './app.js';
import { scanRepository } from './repositories/scan.repository.js';
import { modelInfo } from './services/analysis.service.js';

await scanRepository.init();
const app = createApp();

const server = app.listen(config.port, () => {
  const info = modelInfo();
  console.log(`🛡️  PhishShield AI API running on http://localhost:${config.port} (${config.env})`);
  console.log(`   NLP model: ${info.textClassifier.vocabulary} terms, train acc ${info.textClassifier.trainAccuracy}`);
  console.log(`   URL model: ${info.urlClassifier.samples} samples, train acc ${info.urlClassifier.trainAccuracy}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
