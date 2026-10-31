import { historyService } from '../services/history.service.js';

export function listScans(req, res) {
  res.json(historyService.list(req.validated));
}

export function getScan(req, res) {
  const scan = historyService.get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'NotFound', message: 'Scan not found' });
  res.json(scan);
}

export async function deleteScan(req, res) {
  const ok = await historyService.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'NotFound', message: 'Scan not found' });
  res.status(204).end();
}

export async function clearScans(req, res) {
  await historyService.clear();
  res.status(204).end();
}

export function getStats(req, res) {
  res.json(historyService.stats());
}
