import { createRng } from '../../utils/random.js';

const EULER = 0.5772156649;

/** Average path length of an unsuccessful BST search — normalisation term c(n). */
function avgPathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER) - (2 * (n - 1)) / n;
}

/**
 * Isolation Forest (Liu, Ting & Zhou, 2008) for unsupervised anomaly detection.
 * Points that are isolated in few random splits receive scores close to 1.
 */
export class IsolationForest {
  constructor({ trees = 100, sampleSize = 64, seed = 7 } = {}) {
    this.numTrees = trees;
    this.sampleSize = sampleSize;
    this.rng = createRng(seed);
    this.trees = [];
  }

  fit(data) {
    const psi = Math.min(this.sampleSize, data.length);
    const heightLimit = Math.ceil(Math.log2(psi));
    this.psi = psi;
    this.trees = [];
    for (let t = 0; t < this.numTrees; t++) {
      const sample = [];
      for (let i = 0; i < psi; i++) sample.push(data[Math.floor(this.rng() * data.length)]);
      this.trees.push(this.#build(sample, 0, heightLimit));
    }
    return this;
  }

  #build(rows, depth, limit) {
    if (depth >= limit || rows.length <= 1) return { size: rows.length };
    const dims = rows[0].length;
    // Try a few random features to find one that actually varies.
    for (let attempt = 0; attempt < dims; attempt++) {
      const f = Math.floor(this.rng() * dims);
      let min = Infinity;
      let max = -Infinity;
      for (const r of rows) {
        if (r[f] < min) min = r[f];
        if (r[f] > max) max = r[f];
      }
      if (min === max) continue;
      const split = min + this.rng() * (max - min);
      const left = rows.filter((r) => r[f] < split);
      const right = rows.filter((r) => r[f] >= split);
      return {
        feature: f,
        split,
        left: this.#build(left, depth + 1, limit),
        right: this.#build(right, depth + 1, limit),
      };
    }
    return { size: rows.length };
  }

  #pathLength(x, node, depth) {
    if (node.size !== undefined) return depth + avgPathLength(node.size);
    return x[node.feature] < node.split
      ? this.#pathLength(x, node.left, depth + 1)
      : this.#pathLength(x, node.right, depth + 1);
  }

  /** Anomaly score in (0, 1]; > ~0.6 is typically anomalous. */
  score(x) {
    const mean = this.trees.reduce((s, t) => s + this.#pathLength(x, t, 0), 0) / this.trees.length;
    return 2 ** (-mean / avgPathLength(this.psi));
  }
}
