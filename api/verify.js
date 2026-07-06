// api/verify.js
// Checks whether a Groq API key the visitor typed in actually works,
// by asking Groq to list models. The key is never stored server-side —
// it's just relayed for this one check and discarded.

const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ valid: false, error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ valid: false, error: "Invalid JSON body" });
    return;
  }

  const apiKey = (body?.apiKey || "").trim();
  if (!apiKey) {
    res.status(400).json({ valid: false, error: "No key provided" });
    return;
  }
  if (!apiKey.startsWith("gsk_")) {
    res.status(200).json({ valid: false, error: "That doesn't look like a Groq key (should start with gsk_)." });
    return;
  }

  try {
    const groqRes = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (groqRes.status === 401) {
      res.status(200).json({ valid: false, error: "Groq rejected this key. Double-check it was copied correctly." });
      return;
    }
    if (!groqRes.ok) {
      res.status(200).json({ valid: false, error: `Groq returned an error (${groqRes.status}). Try again in a moment.` });
      return;
    }

    res.status(200).json({ valid: true });
  } catch (err) {
    console.error("Verify function failed:", err);
    res.status(200).json({ valid: false, error: "Couldn't reach Groq to verify. Check your connection and try again." });
  }
};
