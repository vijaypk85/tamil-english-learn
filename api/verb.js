// api/verb.js
// Vercel serverless function. Asks Groq to generate ONE random, advanced,
// real-world-usable English verb (with meaning, example sentence, and Tamil
// translation) each time it's called — used for the "Verb of the Day"
// section. Same key-relay pattern as chat.js / transcribe.js: the Groq key
// never lives on the server, it's just passed through from the visitor
// (or a site-wide fallback env var).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // free tier on Groq as of 2026; swap here if Groq changes free models

const SYSTEM_PROMPT = `You are a vocabulary generator for an English-through-Tamil learning app aimed at Indian learners who already know basic English.

Generate exactly ONE random English verb for a "Verb of the Day" feature. Rules:
1. The verb must be advanced / professional-level — the kind used in workplace emails, meetings, interviews, news, or serious everyday conversation. Examples of the right difficulty: articulate, streamline, mitigate, scrutinize, delegate, reconcile, expedite, substantiate.
2. Do NOT pick basic/school-level verbs (e.g. go, eat, run, play, want, like, help, make, do, get, give, take, see, come).
3. Do NOT pick extremely rare, archaic, or purely literary words nobody actually uses (e.g. perambulate, obfuscate-tier obscurity is fine only if genuinely still used in professional writing — avoid anything a working professional would never say or write).
4. The word must be genuinely useful in daily life, work, or study — not just impressive-sounding.
5. Pick a DIFFERENT verb each time you're called — vary your choice, don't default to the same common examples every time.

Respond with ONLY a single valid JSON object and nothing else — no markdown, no code fences, no preamble, no explanation. Use exactly this shape:
{"verb":"the English verb, base form","ta":"a short, natural Tamil word or phrase for this verb","meaning":"one simple, clear English sentence defining the verb","sentence":"one natural example sentence using the verb in a workplace or daily-life context","sentenceTa":"the Tamil translation of that exact example sentence"}`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const { apiKey: visitorKey, exclude } = body || {};

  // Prefer the visitor's own key (typed into the sidebar box). Fall back to a
  // site-wide key if the site owner chose to set one in Vercel env vars.
  const apiKey = (visitorKey || "").trim() || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "missing_key", message: "Add your free Groq API key in the sidebar to load a verb." });
    return;
  }

  const excludeList = Array.isArray(exclude) ? exclude.filter(Boolean).slice(-15) : [];
  const userPrompt =
    excludeList.length > 0
      ? `Generate a new verb now. Do not use any of these verbs, they were already shown recently: ${excludeList.join(", ")}.`
      : "Generate a verb now.";

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.05,
        max_tokens: 300,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      if (groqRes.status === 401) {
        res.status(401).json({ error: "invalid_key", message: "Groq rejected this API key. Please re-verify it in the sidebar." });
        return;
      }
      res.status(502).json({ error: "groq_error", message: "The verb generator returned an error. Please try again." });
      return;
    }

    const data = await groqRes.json();
    const raw = (data?.choices?.[0]?.message?.content || "").trim();

    // The model was told to return raw JSON only, but be defensive in case
    // it wraps the object in code fences or adds stray text around it.
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      res.status(502).json({ error: "parse_error", message: "Couldn't read a verb from the response. Please try again." });
      return;
    }

    let verb;
    try {
      verb = JSON.parse(match[0]);
    } catch {
      res.status(502).json({ error: "parse_error", message: "Couldn't read a verb from the response. Please try again." });
      return;
    }

    const { verb: en, ta, meaning, sentence, sentenceTa } = verb || {};
    if (!en || !meaning || !sentence) {
      res.status(502).json({ error: "parse_error", message: "The generator returned an incomplete verb. Please try again." });
      return;
    }

    res.status(200).json({
      verb: {
        en: String(en).trim(),
        ta: String(ta || "").trim(),
        meaning: String(meaning).trim(),
        sentence: String(sentence).trim(),
        sentenceTa: String(sentenceTa || "").trim(),
      },
    });
  } catch (err) {
    console.error("Verb function failed:", err);
    res.status(500).json({ error: "server_error", message: "Something went wrong generating today's verb." });
  }
};
