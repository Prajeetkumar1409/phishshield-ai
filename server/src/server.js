import config from './config/index.js';
import { createApp } from './app.js';
import { scanRepository } from './repositories/scan.repository.js';
import { modelInfo } from './services/analysis.service.js';

await scanRepository.init();
const app = createApp();

const server = app.listen(config.port, () => {
  const info = modelInfo();
  console.log(`🛡️  PhishShield AI API running on http://localhost:${config.port} (${config.env})`);
  const nlp = info.textClassifier;
  const nlpScore = nlp.testMetrics ? `test F1 ${nlp.testMetrics.f1}` : `train acc ${nlp.trainAccuracy}`;
  console.log(`   NLP model (${nlp.source}): ${nlp.vocabulary} terms, ${nlpScore}`);
  console.log(`   URL model: ${info.urlClassifier.samples} samples, train acc ${info.urlClassifier.trainAccuracy}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
