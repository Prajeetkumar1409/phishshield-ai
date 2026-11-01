# 🛡️ PhishShield AI + TRACE-X: Phishing & Email Forensics

🔗 **Live demo:** https://client-roan-delta.vercel.app

PhishShield AI detects phishing emails, malicious links, malicious attachments, impersonation and social engineering, and explains every verdict. Its front end is **TRACE-X**, an email forensics workspace: open an email in Gmail, click the PhishShield extension, and TRACE-X shows who really sent it, where it travelled, what its links and attachments do, and what to do next.

Every result is real analysis. There are no preset cases, and nothing about any verdict is hard-coded.

---

## ✨ What it does

| | |
|---|---|
| 📥 **Bring an email in** | From Gmail with the Chrome extension (one click), by pasting Gmail's *Show original*, by uploading an `.eml`, or with **Try a sample email** (a raw phishing email analysed live) |
| 🧾 **Header forensics** | SPF / DKIM / DMARC, Reply-To mismatch, the Received chain, the originating IP and hop latency, parsed in the browser |
| 🧠 **Phishing engines** | NLP (TF-IDF + logistic regression), URL classifier (18 features + rules), social-engineering tactics, impersonation and look-alike domains, and Isolation-Forest anomaly detection |
| 🦠 **Malware detection** | Static analysis of every attachment on the server, never executed: real file type vs extension, executables, Office macros / remote templates / DDE, PDF JavaScript and launch actions, RTF exploits, HTML credential forms and HTML smuggling, archives hiding executables or passwords, PowerShell/VBS downloaders, packed or unsigned programs, and signature rules. The SHA-256 is checked on **VirusTotal** (70+ antivirus engines). |
| 🌍 **Threat intel** | Domain age and registrar from **RDAP** registries; the sending IP's ASN, country and owner from **Team Cymru** and RDAP; VirusTotal reputation for links and the IP |
| 🤖 **AI assistant** | **Google Gemini** writes the case summary and answers questions using only the open case's evidence |
| ⚖️ **Explainable verdict** | Each part of the email is scored separately and fused with a weighted noisy-OR, `risk = 1 − Π(1 − wᵢ·sᵢ)`, with per-component points, highlighted suspicious wording and a MITRE ATT&CK mapping derived from the evidence |
| 📤 **Outputs** | IOC Hub (JSON / CSV / STIX 2.1), infrastructure graph, and a printable 10-section incident report |

## 🔬 How an email is analysed

```
Gmail / paste / .eml / sample
        │
        ▼
TRACE-X (browser) ── parse headers, body, links, attachments ── SPF/DKIM/DMARC, Reply-To, Received chain
        │
        ▼  PhishShield API
        ├── POST /analyze            NLP · URL · social engineering · impersonation · anomaly
        ├── POST /attachments/scan   static malware analysis + VirusTotal (files never executed)
        ├── POST /intel              RDAP domain age · Team Cymru ASN · VirusTotal reputation
        └── POST /assistant          Gemini summary and chat (evidence only)
        │
        ▼
Fused risk score, classification, MITRE mapping, IOCs, report
```

The pipeline bar in TRACE-X shows each stage's real status. If a stage fails, TRACE-X shows the actual error and works with what it has. If an optional key is missing, it says so instead of inventing results.

## 🧩 Chrome extension (v1.2)

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `extension/` folder.
2. **Gmail:** open an email, click the PhishShield icon → **Analyse in TRACE-X**, or right-click the email → **Analyse this email in TRACE-X**. The extension fetches Gmail's *Show original* (full headers) using your own logged-in session. If Gmail refuses, it rebuilds the email from the page and marks the case **NO HEADERS**.
3. **Any page or link:** popup → **Check this page in TRACE-X**, or right-click a link → **Check this link in TRACE-X**. The link is analysed as text and never opened.
4. **Paste:** paste an email's original source into the popup → **Analyse in TRACE-X**.

The extension uses the live site by default. To use a local server, open the popup → ⚙ and enter `http://localhost:5000`. After updating the `extension/` folder, press **Reload** on its card in `chrome://extensions`.

## 🏗️ Project structure

```
phishshield-ai/
├── client/public/trace-x.html   TRACE-X: the whole front end (single file, no build step)
├── extension/                   Chrome MV3 extension
├── server/                      Express REST API
│   └── src/
│       ├── routes/ middleware/ controllers/
│       ├── services/            analysis fusion, VirusTotal, RDAP/Cymru intel, Gemini assistant
│       ├── engines/
│       │   ├── text/ url/ patterns/ anomaly/ ml/   phishing engines
│       │   └── malware/                            static attachment analyser
│       └── data/                training corpus, labelled URLs, brands
├── api/index.mjs                Vercel serverless entry (runs the Express app)
├── ml/train.py                  optional: retrain the NLP model on Enron + Nazario
└── vercel.json                  Vercel: TRACE-X site + API function
```

`client/src` holds the earlier React interface. It is no longer served: the site is TRACE-X, and the old routes redirect to it.

## 🚀 Run locally

Requires **Node.js 20+**.

```bash
npm run install:all
npm run build && npm start        # → http://localhost:5000 (TRACE-X + API)
```

To enable the AI assistant and VirusTotal locally, copy `server/.env.example` to `server/.env` and fill in the keys.

Tests (engines, malware analyser, API):

```bash
npm test
```

## ⚙️ Environment variables

| Var | Default | |
|---|---|---|
| `GEMINI_API_KEY` | – | AI assistant. Free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | optional; falls back to the newest stable Flash model |
| `VIRUSTOTAL_API_KEY` | – | attachment / URL / IP reputation. Free key at [virustotal.com](https://www.virustotal.com) (profile → API key; 4 lookups/min) |
| `PORT` | `5000` | |
| `CORS_ORIGIN` | `*` | comma-separated origins |
| `RATE_LIMIT_MAX` | `60` | analyses per minute per IP |
| `MAX_HISTORY` | `500` | scans kept (legacy history API) |
| `STORAGE_FILE` | `server/storage/scans.json` | |
| `TEXT_MODEL_FILE` | `server/models/text-model.json` | optional NLP model exported by `ml/train.py` |

Without `GEMINI_API_KEY` or `VIRUSTOTAL_API_KEY`, everything else still works, and TRACE-X shows those two parts as "not configured".

## 🔌 API

Base URL: `/api/v1`

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Phishing engines. Body: `{ type: "email"\|"sms"\|"url"\|"message", content, sender?, subject?, replyTo?, save? }` |
| `POST` | `/attachments/scan` | Static malware analysis + VirusTotal. Body: `{ name, data }` (base64, ≤ 3 MB) or `{ name, sha256 }` |
| `POST` | `/intel` | Body: `{ ip?, domains: [], urls: [] }`: RDAP domain age, ASN/country/owner, VirusTotal reputation |
| `POST` | `/assistant` | Body: `{ evidence, question?, history?, mode: "chat"\|"summary" }`: Gemini answer |
| `GET` | `/capabilities` | Which optional services are configured |
| `GET` | `/health` · `/models` | Health check · model metadata |
| `GET`/`DELETE` | `/history` · `/history/:id` · `/stats` | Scan history (used by the legacy React UI) |

```bash
curl -X POST http://localhost:5000/api/v1/analyze -H "Content-Type: application/json" \
  -d '{"type":"email","content":"Your account is limited. Verify now: http://paypa1-secure-login.com/verify"}'
```

## ☁️ Deploy

**Vercel (current live site).** From the repo root run `vercel deploy --prod`. `vercel.json` serves TRACE-X and runs the API as one serverless function. Add `GEMINI_API_KEY` and `VIRUSTOTAL_API_KEY` under *Project → Settings → Environment Variables*, then redeploy.

**Render / Docker.** `render.yaml` and the `Dockerfile` still work. The Express server serves TRACE-X at `/` and the API at `/api/v1`.

```bash
docker build -t phishshield-ai . && docker run -p 5000:5000 -e GEMINI_API_KEY=... phishshield-ai
```

## 🧪 Retrain the NLP model (optional)

`ml/train.py` trains the text classifier on the **Nazario** phishing corpus and the **Enron** maildir: balanced classes, a 70/15/15 split, the regularisation strength tuned on validation, and metrics on the held-out test set. It exports `server/models/text-model.json`, which the API loads at start-up. Without that file, the API trains on its built-in corpus.

```bash
pip install -r ml/requirements.txt
python ml/train.py --nazario data/nazario --enron data/enron_maildir
```

The Python tokenizer mirrors `server/src/engines/text/tokenizer.js`. If you change one, change the other and retrain.

## 🔒 Privacy and limits

- Attachments are only read as bytes, never opened or executed. Only file hashes, link URLs and the sending IP are sent to VirusTotal.
- The AI assistant sends the open case's evidence, including a body excerpt, to Google Gemini. On Gemini's free tier, Google may use that data to improve its products, so don't use the free tier with confidential mail.
- Geolocation shows where a server's network is registered, not who operated it.
- Malware detection is static (structure, signatures and reputation). Brand-new malware can evade it; there is no live sandbox detonation.
- The Gmail import reads mail through your own browser session. Nothing is stored on the server.
