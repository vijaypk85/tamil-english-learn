# Nool (நூல்) — Learn English through Tamil

A free, hosted website where anyone can pick a grammar topic (28 topics, Beginner → Advanced)
and chat with an AI tutor that explains it with real-time bilingual examples (English + Tamil).

- Frontend: plain HTML/CSS/JS (no build step)
- Backend: one Vercel serverless function (`/api/chat.js`) that talks to Groq's free LLM API
- Cost: **₹0** — Vercel's free (Hobby) tier + Groq's free API tier

---

## How the API key works

Each **visitor** pastes their own free Groq key into the box in the sidebar and clicks
**Verify**. This means:

- You, the site owner, don't need to pay for or manage everyone's usage.
- The key is checked live against Groq (`/api/verify`) before it's trusted.
- Once verified, it's saved only in that visitor's own browser (`localStorage`) and sent
  along with their chat requests — it's never stored on your server or in your database
  (because there isn't one).
- If someone doesn't have a key yet, the tutor tells them to add one and links straight to
  console.groq.com.

If you'd rather run it as "one key pays for everyone" instead, you can still set a
`GROQ_API_KEY` environment variable in Vercel — `api/chat.js` will use it automatically as a
fallback for any visitor who hasn't entered their own key. That's optional; the site works
fully without it.

## 1. Get a free Groq API key (for yourself, to test — visitors will get their own)

1. Go to https://console.groq.com and sign up (free, no credit card required).
2. Go to **API Keys** → **Create API Key**.
3. Copy the key (starts with `gsk_...`).

Groq's free tier gives generous daily request limits on models like `llama-3.3-70b-versatile`, which is what this project uses by default. If Groq retires that model name later, just change the `MODEL` constant at the top of `api/chat.js` to whatever current free model they list on their console.

---

## 2. Push this project to GitHub

```bash
cd tamil-english-learn
git init
git add .
git commit -m "Initial commit: Nool - learn English through Tamil"
```

Create a new empty repo on GitHub (e.g. `nool-learn-english`), then:

```bash
git remote add origin https://github.com/<your-username>/nool-learn-english.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy on Vercel (free)

1. Go to https://vercel.com and sign up/log in with your GitHub account.
2. Click **Add New… → Project**, then **Import** your `nool-learn-english` repo.
3. Framework preset: leave as **Other** (no build command needed — it's static + two API functions).
4. (Optional) If you want a fallback key that covers visitors who haven't added their own,
   open **Environment Variables** and add `GROQ_API_KEY` = your key. Otherwise skip this —
   the site works fine with visitors bringing their own key.
5. Click **Deploy**.

In under a minute you'll get a free URL like `https://nool-learn-english.vercel.app` — share that with anyone.

Every time you `git push` to `main`, Vercel automatically redeploys.

---

## 4. Test it

Open your Vercel URL. In the sidebar box, paste a Groq key and click **Verify** — you should
see "Connected — ready to chat." in green. Then click **Start with Topic 1** and check that the
tutor replies with an explanation and English + Tamil examples.

If Verify shows an error, it's telling you exactly what's wrong (bad key format, Groq rejected
it, or a network issue) — no separate debugging needed.

---

## Project structure

```
tamil-english-learn/
├── index.html        # page shell — sidebar + hero + chat panel
├── style.css          # all styling (indigo/turmeric palette, bilingual type)
├── script.js           # topic data, sidebar rendering, chat logic (calls /api/chat)
├── api/
│   ├── chat.js          # serverless function — proxies to Groq using the visitor's key
│   └── verify.js        # serverless function — checks a key is valid before trusting it
├── package.json
└── README.md
```

---

## Customizing

- **Add/edit topics:** edit the `TOPICS` array at the top of `script.js`. Each entry needs
  `id`, `en`, `ta`, and `level` (`"Beginner"`, `"Intermediate"`, or `"Advanced"`).
- **Change the tutor's teaching style:** edit the `systemPrompt` string in `api/chat.js`.
- **Switch LLM provider later:** the frontend only ever calls your own `/api/chat` endpoint,
  so you can swap Groq for any other provider inside `api/chat.js` without touching `script.js`.
- **Progress tracking:** currently stored in the visitor's own browser (`localStorage`), so
  each visitor's progress is private to their device. If you want progress shared across
  devices, that would need a small database (e.g. Vercel KV or Supabase) — happy to help
  wire that up if you want it later.

---

## A note on "Grok" vs "Groq"

xAI's actual **Grok** API is not free. This project uses **Groq** (different company, note the
spelling) which offers a genuinely free API tier — that's the "free key" this build relies on.
