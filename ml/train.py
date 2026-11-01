"""
Train the PhishShield NLP text classifier on real email corpora and export it
as JSON for the Node backend (server/models/text-model.json).

    phishing : Nazario phishing corpus (mbox files)
    safe     : Enron maildir (balanced to the phishing count)

The Python tokenizer below mirrors server/src/engines/text/tokenizer.js and the
TF-IDF settings mirror server/src/engines/text/tfidf.js, so the exported vocab,
IDF and weights plug straight into the existing JS vectorizer + model.

Usage:
    pip install -r ml/requirements.txt
    python ml/train.py --nazario data/nazario --enron data/enron_maildir
"""
import argparse
import json
import mailbox
import random
import re
import subprocess
import time
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "server" / "models" / "text-model.json"
MAX_CHARS = 20000  # same cap as the API's maxContentLength

# ---------- Tokenizer (keep in sync with tokenizer.js) ----------
STOPWORDS = set((
    "a an the and or but if of to in on at by for with from is are was were be been being this that these those "
    "it its i me my we our you your he she they them their his her as so do does did have has had will would "
    "can could should shall may might must am not no just than then there here what which who whom when where "
    "how all any each few more most other some such only own same too very s t up out about into over"
).split(" "))

A = re.ASCII  # JS \d / \s are ASCII-only without the /u flag
RE_URL = re.compile(r"https?://\S+|www\.\S+", A)
RE_MONEY = re.compile(r"[$€£₹]\s?\d[\d,.]*|\d[\d,.]*\s?(usd|inr|rs|dollars|lakh|crore)\b", A)
RE_PHONE = re.compile(r"\+?\d[\d\s-]{8,}\d", A)
RE_NUM = re.compile(r"\d+", A)
RE_SPLIT = re.compile(r"[^a-z_]+")
RE_SUFFIX = re.compile(r"(ations?|ing|edly|ed|ies|es|ly|ment|s)$")
RE_DOUBLE = re.compile(r"(.)\1$")


def stem(word):
    if len(word) <= 4:
        return word
    return RE_DOUBLE.sub(r"\1", RE_SUFFIX.sub("", word, count=1), count=1)


def tokenize(text):
    t = text.lower()
    t = RE_URL.sub(" __url__ ", t)
    t = RE_MONEY.sub(" __money__ ", t)
    t = RE_PHONE.sub(" __phone__ ", t)
    t = RE_NUM.sub(" __num__ ", t)
    words = [stem(w) for w in RE_SPLIT.split(t) if len(w) > 1 and w not in STOPWORDS]
    return words + [f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)]


# Corpus artefacts that separate Enron from Nazario without saying anything about phishing.
LEAKY = re.compile(r"\b(enron|ect|hou|kaminski|vince|corp|forwarded|cc|bcc)\b")

# ---------- 1. Load data ----------
class _TextOnly(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts, self._skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip += 1
        if tag == "a":  # keep link targets so the __url__ token survives
            href = dict(attrs).get("href") or ""
            if href.startswith(("http://", "https://", "www.")):
                self.parts.append(f" {href} ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(html):
    p = _TextOnly()
    try:
        p.feed(html)
    except Exception:
        pass
    return " ".join(p.parts)


def extract_text(msg):
    """Subject + body. Plain text preferred, HTML stripped as fallback. Attachments are never opened."""
    plain, html = [], []
    for part in msg.walk() if msg.is_multipart() else [msg]:
        if part.get_filename():
            continue
        ctype = part.get_content_type()
        if ctype not in ("text/plain", "text/html"):
            continue
        try:
            body = part.get_content()
        except Exception:
            payload = part.get_payload(decode=True) or b""
            body = payload.decode("utf-8", errors="replace")
        (plain if ctype == "text/plain" else html).append(body)
    body = "\n".join(plain) if plain else html_to_text("\n".join(html))
    return f"{msg.get('subject', '') or ''}\n{body}"[:MAX_CHARS]


def parse_bytes(f):
    return BytesParser(policy=policy.default).parse(f)


def load_nazario(folder):
    rows = []
    for p in sorted(Path(folder).rglob("*")):
        if not p.is_file():
            continue
        try:
            for msg in mailbox.mbox(str(p), factory=parse_bytes):
                if msg is not None:
                    rows.append({"text": extract_text(msg), "label": 1})
        except Exception as e:
            print(f"  skipped {p.name}: {e}")
    return rows


def load_enron(folder, limit):
    files = [p for p in Path(folder).rglob("*") if p.is_file()]
    random.shuffle(files)
    rows = []
    for p in files:
        if len(rows) >= limit:
            break
        try:
            with open(p, "rb") as f:
                rows.append({"text": extract_text(parse_bytes(f)), "label": 0})
        except Exception:
            continue
    return rows


def load_builtin_corpus():
    """Hand-written SMS/chat examples from server/src/data/corpus.js, so short messages stay covered."""
    script = (
        "import { PHISHING, LEGITIMATE } from './server/src/data/corpus.js';"
        "console.log(JSON.stringify({ PHISHING, LEGITIMATE }));"
    )
    try:
        out = subprocess.run(["node", "--input-type=module", "-e", script],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except Exception as e:
        print(f"  could not load built-in corpus ({e}); continuing without it")
        return []
    data = json.loads(out)
    return ([{"text": t, "label": 1} for t in data["PHISHING"]] +
            [{"text": t, "label": 0} for t in data["LEGITIMATE"]])


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nazario", default="data/nazario", help="folder of Nazario mbox files")
    ap.add_argument("--enron", default="data/enron_maildir", help="Enron maildir root")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output JSON path")
    ap.add_argument("--max-features", type=int, default=30000)
    ap.add_argument("--no-builtin", action="store_true", help="don't mix in the hand-written corpus")
    args = ap.parse_args()
    random.seed(42)

    print("Loading Nazario (phishing)...")
    phish = load_nazario(args.nazario)
    print("Loading Enron (safe)...")
    safe = load_enron(args.enron, limit=len(phish))  # balanced classes

    df = pd.DataFrame(phish + safe)
    df = df[df["text"].str.strip() != ""].drop_duplicates("text").reset_index(drop=True)
    print(df["label"].value_counts().rename({0: "safe", 1: "phishing"}).to_string())
    if df["label"].nunique() < 2:
        raise SystemExit("Need both phishing and safe emails — check the dataset paths.")

    # ---------- 2. Split 70 / 15 / 15 ----------
    X_train, X_temp, y_train, y_temp = train_test_split(
        df["text"], df["label"], test_size=0.30, stratify=df["label"], random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42)

    # Built-in examples go into training only, so val/test stay pure held-out email.
    if not args.no_builtin:
        extra = pd.DataFrame(load_builtin_corpus())
        if len(extra):
            X_train = pd.concat([X_train, extra["text"]], ignore_index=True)
            y_train = pd.concat([y_train, extra["label"]], ignore_index=True)
    print(f"Train: {len(X_train)} | Validation: {len(X_val)} | Test: {len(X_test)}")

    # ---------- 3. Vectorize (matches tfidf.js: (1+ln tf)*smooth idf, L2 norm) ----------
    vectorizer = TfidfVectorizer(analyzer=tokenize, sublinear_tf=True, smooth_idf=True, norm="l2",
                                 min_df=2, max_df=0.9, max_features=args.max_features)
    vectorizer.fit(X_train)
    keep = [t for t in vectorizer.vocabulary_ if not LEAKY.search(t)]
    vectorizer = TfidfVectorizer(analyzer=tokenize, sublinear_tf=True, smooth_idf=True, norm="l2",
                                 vocabulary=sorted(keep)).fit(X_train)
    Xtr, Xva, Xte = (vectorizer.transform(x) for x in (X_train, X_val, X_test))

    # ---------- 4. Train and tune on validation set ----------
    best_model, best_f1, best_C = None, -1, None
    for C in [0.1, 1, 10]:
        model = LogisticRegression(C=C, max_iter=2000, class_weight="balanced")
        model.fit(Xtr, y_train)
        score = f1_score(y_val, model.predict(Xva))
        print(f"C={C}: validation F1 = {score:.3f}")
        if score > best_f1:
            best_model, best_f1, best_C = model, score, C
    print(f"Best C = {best_C}")

    # ---------- 5. Final check on the untouched test set ----------
    t0 = time.perf_counter()
    pred = best_model.predict(Xte)
    ms_per_email = (time.perf_counter() - t0) * 1000 / len(y_test)
    print(classification_report(y_test, pred, target_names=["safe", "phishing"], digits=3))
    tn, fp, fn, tp = confusion_matrix(y_test, pred).ravel()
    metrics = {
        "accuracy": round((tp + tn) / len(y_test), 4),
        "precision": round(tp / max(tp + fp, 1), 4),
        "recall": round(tp / max(tp + fn, 1), 4),
        "f1": round(f1_score(y_test, pred), 4),
        "falsePositiveRate": round(fp / max(fp + tn, 1), 4),
    }
    print(f"FPR = {metrics['falsePositiveRate']:.3%} | {ms_per_email:.3f} ms/email")

    terms = vectorizer.get_feature_names_out()
    coef = best_model.coef_[0]
    order = np.argsort(coef)
    print("Top phishing terms:", ", ".join(terms[i] for i in order[::-1][:20]))
    print("Top safe terms:    ", ", ".join(terms[i] for i in order[:20]))

    # ---------- 6. Export for the Node backend ----------
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    model_json = {
        "version": 1,
        "source": "nazario+enron" + ("" if args.no_builtin else "+builtin"),
        "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "samples": {"train": len(X_train), "validation": len(X_val), "test": len(X_test)},
        "C": best_C,
        "testMetrics": metrics,
        "terms": terms.tolist(),
        "idf": [round(float(v), 5) for v in vectorizer.idf_],
        "weights": [round(float(v), 5) for v in coef],
        "bias": round(float(best_model.intercept_[0]), 5),
    }
    out.write_text(json.dumps(model_json, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"Saved {out} ({out.stat().st_size / 1e6:.1f} MB, {len(terms)} terms)")


if __name__ == "__main__":
    main()
