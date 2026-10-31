/**
 * Binary logistic regression trained with batch gradient descent + L2 regularisation.
 * Works on sparse inputs: each sample is a Map<featureIndex, value>.
 */
export class LogisticRegression {
  constructor({ learningRate = 0.5, epochs = 400, l2 = 0.001 } = {}) {
    this.learningRate = learningRate;
    this.epochs = epochs;
    this.l2 = l2;
    this.weights = null;
    this.bias = 0;
  }

  static sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  fit(samples, labels, dims) {
    this.weights = new Float64Array(dims);
    this.bias = 0;
    const n = samples.length;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const grad = new Float64Array(dims);
      let gradBias = 0;
      for (let i = 0; i < n; i++) {
        const err = this.#raw(samples[i]) - labels[i];
        for (const [idx, val] of samples[i]) grad[idx] += err * val;
        gradBias += err;
      }
      for (let j = 0; j < dims; j++) {
        this.weights[j] -= this.learningRate * (grad[j] / n + this.l2 * this.weights[j]);
      }
      this.bias -= this.learningRate * (gradBias / n);
    }
    return this;
  }

  #raw(sample) {
    let z = this.bias;
    for (const [idx, val] of sample) z += this.weights[idx] * val;
    return LogisticRegression.sigmoid(z);
  }

  predictProba(sample) {
    return this.#raw(sample);
  }

  /** Per-feature contribution to the logit — used for explainability. */
  contributions(sample) {
    const out = [];
    for (const [idx, val] of sample) out.push({ index: idx, value: this.weights[idx] * val });
    return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }
}

/** Convert a dense numeric array into the sparse Map representation. */
export const toSparse = (arr) => {
  const m = new Map();
  arr.forEach((v, i) => {
    if (v !== 0) m.set(i, v);
  });
  return m;
};
