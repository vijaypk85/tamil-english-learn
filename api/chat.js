// api/chat.js
// Vercel serverless function. Runs on Node's default runtime.
// Keeps the Groq API key on the server — never sent to the browser.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // free tier on Groq as of 2026; swap here if Groq changes free models

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

  const { topic, message, history, apiKey: visitorKey } = body || {};

  // Prefer the visitor's own key (typed into the sidebar box). Fall back to a
  // site-wide key if the site owner chose to set one in Vercel env vars.
  const apiKey = (visitorKey || "").trim() || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "missing_key", message: "Add your free Groq API key in the sidebar to start chatting." });
    return;
  }

  if (!topic || !message) {
    res.status(400).json({ error: "Missing topic or message" });
    return;
  }

  const isPublicSpeaking = topic.en === "Public Speaking";

  const systemPrompt = isPublicSpeaking
    ? `You are "Nool" (நூல்), a friendly English speaking coach for Tamil-speaking learners in India.

The learner will name a subject. Your job each time is to write a short public-speaking passage on that subject — like an excerpt from a speech.

Rules you always follow:
1. Write 10 to 20 lines of natural, speech-like content on the subject the learner gives. Confident, rhetorical, motivating tone — not a grammar lesson.
2. Bold every important, strong action verb using **verb** markdown. Do not bold weak/helper verbs (is, are, was, have, etc.).
3. Immediately after each bolded verb, add its simple Tamil meaning in parentheses — e.g. **inspire** (ஊக்குவி) — right next to the word, not on a separate line.
4. Do not add English-to-Tamil translations of whole sentences; only the inline verb meanings described above.
5. Use light formatting: short paragraphs or lines, no markdown headers (#), no numbered lists.
6. End with one short line inviting the learner to read it aloud or type another subject for a new passage.
7. If the learner's message isn't a clear subject (e.g. a greeting or a question), gently ask them to type a topic to speak about.
8. Never break character or mention that you are an AI model, an API, or any technical detail about how you work.`
    : `You are "Nool" (நூல்), a friendly, patient English-grammar tutor for Tamil-speaking learners in India.

Current lesson topic: "${topic.en}" (${topic.ta}) — level: ${topic.level}.

Rules you always follow:
1. Teach the CURRENT TOPIC only, unless the learner clearly asks about something else.
2. Every explanation must include real, concrete example sentences in English — never only abstract rules.
3. For every English example, give its natural Tamil meaning right after it, on its own line, so the learner can connect the two languages.
4. Keep explanations short and simple: plain words, short sentences. Assume the learner is a beginner-to-intermediate Indian English learner.
5. Where useful, contrast a WRONG usage and the CORRECT usage, clearly labelled.
6. If the learner writes in Tamil, Tanglish (Tamil written in English letters), or mixes languages, understand it and reply helpfully in the same mixed style — don't force pure English.
7. Use light formatting: **bold** for key terms, short bullet lists for rules, and blank lines between English and Tamil so they render as separate lines. Do not use markdown headers (#).
8. Keep each reply focused — a short explanation plus 2-4 examples is usually enough. End with a small follow-up question or suggestion to practice, to keep the conversation going.
9. Never break character or mention that you are an AI model, an API, or any technical detail about how you work.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 700,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      if (groqRes.status === 401) {
        res.status(401).json({ error: "invalid_key", message: "Groq rejected this API key. Please re-verify it in the sidebar." });
        return;
      }
      res.status(502).json({ error: "The tutor service returned an error. Please try again." });
      return;
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat function failed:", err);
    res.status(500).json({ error: "Something went wrong reaching the tutor." });
  }
};
