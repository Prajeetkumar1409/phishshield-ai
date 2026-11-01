// Vercel serverless entry: the whole Express API runs as one function (routes under /api/v1).
// Scan history lives in memory/tmp here; TRACE-X does not depend on it.
process.env.STORAGE_FILE ||= '/tmp/phishshield-scans.json';
const { createApp } = await import('../server/src/app.js');
export default createApp();
