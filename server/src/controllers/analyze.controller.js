import { analyze, modelInfo } from '../services/analysis.service.js';
import { historyService } from '../services/history.service.js';

export async function analyzeContent(req, res) {
  const { save, ...input } = req.validated;
  const result = analyze(input);
  if (save) await historyService.save(result);
  res.status(201).json(result);
}

export function getModels(req, res) {
  res.json(modelInfo());
}
