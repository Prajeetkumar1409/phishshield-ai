import { TfidfVectorizer } from './tfidf.js';
import { LogisticRegression } from '../ml/logisticRegression.js';
import { PHISHING, LEGITIMATE } from '../../data/corpus.js';
import { round } from '../../utils/strings.js';

/**
 * NLP phishing classifier: TF-IDF features -> logistic regression.
 * Trained once at start-up on the embedded corpus (milliseconds) and kept in memory.
 */
class TextClassifier {
  constructor() {
    const docs = [...PHISHING, ...LEGITIMATE];
    const labels = [...PHISHING.map(() => 1), ...LEGITIMATE.map(() => 0)];

    this.vectorizer = new TfidfVectorizer().fit(docs);
    const X = docs.map((d) => this.vectorizer.transform(d));
    this.model = new LogisticRegression({ learningRate: 2, epochs: 600, l2: 0.0005 }).fit(
      X,
      labels,
      this.vectorizer.size
    );

    const correct = X.filter((x, i) => (this.model.predictProba(x) >= 0.5 ? 1 : 0) === labels[i]).length;
    this.trainingInfo = {
      samples: docs.length,
      vocabulary: this.vectorizer.size,
      trainAccuracy: round(correct / docs.length, 3),
    };
  }

  /**
   * @returns {{probability:number, topTerms:{term:string, weight:number}[], coverage:number}}
   */
  predict(text) {
    const vec = this.vectorizer.transform(text);
    if (vec.size === 0) return { probability: 0.5, topTerms: [], coverage: 0 };

    const probability = this.model.predictProba(vec);
    const topTerms = this.model
      .contributions(vec)
      .slice(0, 8)
      .map(({ index, value }) => ({ term: this.vectorizer.terms[index], weight: round(value, 3) }));

    // Few known tokens means the model has little to go on; callers shrink its influence.
    const coverage = Math.min(1, vec.size / 12);
    return { probability: round(probability, 4), topTerms, coverage: round(coverage, 2) };
  }
}

export const textClassifier = new TextClassifier();
