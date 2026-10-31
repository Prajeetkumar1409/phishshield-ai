import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';

/**
 * File-backed scan store. Keeps data in memory and persists asynchronously,
 * so it runs anywhere without a database server. Swap this module for a
 * Mongo/Postgres implementation without touching services or controllers.
 */
class ScanRepository {
  constructor(file, max) {
    this.file = file;
    this.max = max;
    this.scans = [];
    this.writing = Promise.resolve();
  }

  async init() {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.scans = JSON.parse(raw);
    } catch {
      this.scans = [];
    }
  }

  #persist() {
    const snapshot = JSON.stringify(this.scans);
    this.writing = this.writing
      .then(async () => {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(this.file, snapshot);
      })
      .catch((err) => console.error('[repo] persist failed:', err.message));
    return this.writing;
  }

  async create(scan) {
    this.scans.unshift(scan);
    if (this.scans.length > this.max) this.scans.length = this.max;
    await this.#persist();
    return scan;
  }

  findAll({ limit = 50, offset = 0, verdict, type } = {}) {
    const filtered = this.scans.filter((s) => (!verdict || s.verdict === verdict) && (!type || s.type === type));
    return { total: filtered.length, items: filtered.slice(offset, offset + limit) };
  }

  findById(id) {
    return this.scans.find((s) => s.id === id) || null;
  }

  all() {
    return this.scans;
  }

  async remove(id) {
    const before = this.scans.length;
    this.scans = this.scans.filter((s) => s.id !== id);
    if (this.scans.length !== before) await this.#persist();
    return this.scans.length !== before;
  }

  async clear() {
    this.scans = [];
    await this.#persist();
  }
}

export const scanRepository = new ScanRepository(config.storageFile, config.maxHistory);
