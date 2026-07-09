// api/transcribe.js
// Vercel serverless function. Sends a short audio recording to Groq's
// Whisper endpoint and returns the transcribed text. Same pattern as
// chat.js and verify.js — the Groq key never touches the browser directly,
// it's just relayed from the visitor's own key (or a site-wide fallback).

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3-turbo"; // free tier on Groq as of 2026; swap here if Groq changes free models
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // keep clips short; well under Vercel's request body limit

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

  const { audioBase64, mimeType, apiKey: visitorKey } = body || {};

  // Prefer the visitor's own key (typed into the sidebar box). Fall back to a
  // site-wide key if the site owner chose to set one in Vercel env vars.
  const apiKey = (visitorKey || "").trim() || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "missing_key", message: "Add your free Groq API key in the sidebar to start speaking." });
    return;
  }

  if (!audioBase64) {
    res.status(400).json({ error: "missing_audio", message: "Missing audio" });
    return;
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch {
    res.status(400).json({ error: "invalid_audio", message: "Invalid audio data" });
    return;
  }

  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    res.status(400).json({ error: "Recording too long. Please keep clips under ~20 seconds." });
    return;
  }
  if (audioBuffer.byteLength < 500) {
    res.status(200).json({ text: "", message: "That was too short — please try again." });
    return;
  }

  try {
    const ext = (mimeType || "").includes("mp4") ? "mp4" : "webm";
    const audioBlob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

    const form = new FormData();
    form.append("file", audioBlob, `speech.${ext}`);
    form.append("model", MODEL);
    form.append("response_format", "json");
    // Hinting English helps accuracy for learners practicing English out loud,
    // even when a few Tamil words slip in.
    form.append("language", "en");

    const groqRes = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq transcription error:", groqRes.status, errText);
      if (groqRes.status === 401) {
        res.status(401).json({ error: "invalid_key", message: "Groq rejected this API key. Please re-verify it in the sidebar." });
        return;
      }
      res.status(502).json({
        error: "groq_error",
        message: `Groq returned an error (status ${groqRes.status}). Please try again.`,
      });
      return;
    }

    const data = await groqRes.json();
    const text = (data?.text || "").trim();

    if (!text) {
      res.status(200).json({ text: "", message: "Didn't catch that — please try speaking again." });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    console.error("Transcribe function failed:", err);
    res.status(500).json({
      error: "server_error",
      message: `Something went wrong transcribing your recording: ${err?.message || "unknown error"}`,
    });
  }
};