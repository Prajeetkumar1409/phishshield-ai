/** Z-score standardisation of dense feature vectors. */
export class StandardScaler {
  fit(rows) {
    const dims = rows[0].length;
    this.mean = new Array(dims).fill(0);
    this.std = new Array(dims).fill(0);
    for (const r of rows) r.forEach((v, i) => (this.mean[i] += v / rows.length));
    for (const r of rows) r.forEach((v, i) => (this.std[i] += (v - this.mean[i]) ** 2 / rows.length));
    this.std = this.std.map((s) => Math.sqrt(s) || 1);
    return this;
  }

  transform(row) {
    return row.map((v, i) => (v - this.mean[i]) / this.std[i]);
  }
}
