# StockSage — AI Portfolio Health Analyzer

Deployable on **Vercel** in under 2 minutes. Groq API key stays safely on the server — never exposed to users.

## Project structure

```
stocksage/
├── api/
│   └── analyze.js      ← Vercel serverless function (calls Groq)
├── public/
│   └── index.html      ← The full frontend
├── vercel.json         ← Routing config
└── package.json
```

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "init stocksage"
gh repo create stocksage --public --push
```

### 2. Import on Vercel
- Go to https://vercel.com/new
- Import your GitHub repo
- Click **Deploy** (no build step needed)

### 3. Add your Groq API key
In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `GROQ_API_KEY` | `gsk_your_key_here` |

Get a free key at https://console.groq.com

### 4. Redeploy
After adding the env var, go to **Deployments → Redeploy** once.

## How the AI is used

| Where | What Groq AI does |
|-------|-------------------|
| After "Analyse" click | Full portfolio assessment: strengths, risks, top 3 actions |
| Follow-up questions | Answers 4 pre-set questions about the user's specific portfolio |

The frontend sends portfolio data to `/api/analyze` — your backend calls Groq with the Groq key from env vars, and returns only the AI text. The key is never sent to the browser.

## Local development

```bash
npm i -g vercel
vercel dev
```

Then visit http://localhost:3000
