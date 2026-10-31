# 🛡️ PhishShield AI — Phishing & Scam Detection

🔗 **Live demo:** https://phishshield-ai-scsa.onrender.com

PhishShield AI analyses **emails, SMS, URLs and chat messages** and flags phishing attempts, suspicious links, impersonation and social-engineering patterns. Every verdict is explainable: it comes with highlighted evidence, per-engine scores and recommended next steps.

It ships as a **web app** (React + Express) plus a **Chrome extension**. All models are trained in-house at server start-up; no third-party AI APIs are called, and messages never leave the server.

---

## ✨ Features

| | |
|---|---|
| 🧠 **NLP classifier** | TF-IDF (unigrams + bigrams) → L2-regularised logistic regression, with per-term explainability |
| 🌐 **URL classifier** | 18 lexical/structural features, typosquat + homoglyph detection, risky TLDs, shorteners, raw-IP hosts, `@` obfuscation, punycode → logistic regression + expert rules |
| 👤 **Impersonation** | Display-name spoofing, look-alike sender domains, Reply-To mismatch, free-webmail "organisations", brand claims that the links don't back up (28 brands) |
| 🎭 **Social engineering** | 9 tactics: urgency, fear, rewards, credential harvesting, payment requests, secrecy, authority, calls to action, family pretexts |
| 📈 **Anomaly detection** | Isolation Forests fit only on legitimate URLs and messages catch structurally unusual inputs |
| ⚖️ **Score fusion** | Weighted noisy-OR: `risk = 1 − Π(1 − wᵢ·pᵢ)` → **safe** < 35 ≤ **suspicious** < 65 ≤ **phishing** |
| 📊 **Dashboard** | KPIs, 14-day timeline, verdict mix, channels, top indicators, scan history |
| 🧩 **Extension** | Scans the current tab, plus right-click "scan selected text / link" |

## 🏗️ Architecture

```
phishshield-ai/
├── server/                     Express REST API (layered)
│   └── src/
│       ├── routes/             HTTP routing + rate limiting
│       ├── middleware/         zod validation, error handling
│       ├── controllers/        request → service → response
│       ├── services/           analysis pipeline & fusion, history/stats
│       ├── engines/            the AI
│       │   ├── ml/             LogisticRegression, IsolationForest, StandardScaler
│       │   ├── text/           tokenizer, TF-IDF, text classifier
│       │   ├── url/            parser/extractor, features, brand matcher, classifier
│       │   ├── patterns/       social engineering, impersonation
│       │   └── anomaly/        anomaly detector
│       ├── repositories/       scan persistence (JSON file; swappable for a DB)
│       ├── data/               training corpus, labelled URLs, brand registry
│       └── config/
├── client/                     React 18 + TypeScript + Vite + Tailwind v4 + Framer Motion + Recharts
└── extension/                  Chrome MV3 extension
```

Request flow: `route → validate → controller → analysis.service → engines → fusion → repository`.

## 🚀 Run locally

Requires **Node.js 20+**.

```bash
npm run install:all      # install server + client deps

# terminal 1 — API on :5000
npm run dev:server
# terminal 2 — UI on :5173 (proxies /api to :5000)
npm run dev:client
```

Production mode (one process serves both the API and the built UI):

```bash
npm run build && npm start   # → http://localhost:5000
```

Tests (unit + API integration):

```bash
npm test
```

## 🔌 API

Base URL: `/api/v1`

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Body: `{ type: "email"\|"sms"\|"url"\|"message", content, sender?, subject?, save? }` |
| `GET` | `/history?limit&offset&verdict&type` | Paginated scan summaries |
| `GET` | `/history/:id` | Full scan result |
| `DELETE` | `/history/:id` · `/history` | Delete one / clear all |
| `GET` | `/stats` | Dashboard aggregates |
| `GET` | `/models` | Model metadata |
| `GET` | `/health` | Health check |

```bash
curl -X POST http://localhost:5000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"type":"sms","content":"Your KYC expired, account blocked today. Update: http://sbi-kyc-update.online/kyc"}'
```

## ☁️ Deploy

### Option A: Render (recommended, single service, free)
1. Push this folder to a GitHub repository.
2. On [render.com](https://render.com): **New → Blueprint** → select the repo. `render.yaml` configures everything.
3. When it's live, open `https://<your-app>.onrender.com`.

### Option B: Docker (any host: Railway, Fly.io, a VPS…)
```bash
docker build -t phishshield-ai .
docker run -p 5000:5000 phishshield-ai
```

### Option C: Split hosting (Vercel frontend + Render API)
Deploy `server/` to Render, then deploy `client/` to Vercel with the env var `VITE_API_URL=https://<your-api>.onrender.com`. Set `CORS_ORIGIN` on the API to your Vercel URL.

> **Note:** scan history is kept in a JSON file. On free hosts with ephemeral disks it resets on redeploy. For permanent history, swap `server/src/repositories/scan.repository.js` for a database-backed implementation; nothing else needs to change.

## 🧩 Chrome extension
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. It uses the live server by default; to use a local one, open the popup → ⚙ → `http://localhost:5000`.

## ⚙️ Environment variables (server)

| Var | Default | |
|---|---|---|
| `PORT` | `5000` | |
| `CORS_ORIGIN` | `*` | comma-separated origins |
| `RATE_LIMIT_MAX` | `60` | analyses per minute per IP |
| `MAX_HISTORY` | `500` | scans kept |
| `STORAGE_FILE` | `server/storage/scans.json` | |
