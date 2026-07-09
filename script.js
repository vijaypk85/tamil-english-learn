// ---------------------------------------------------------------
// Topic data — 30 topics, Beginner -> Advanced, English + Tamil
// ---------------------------------------------------------------
const TOPICS = [
  { id: 1, en: "Parts of Speech", ta: "சொல் வகைகள்", level: "Beginner" },
  { id: 2, en: "Sentence Structure", ta: "வாக்கிய அமைப்பு", level: "Beginner" },
  { id: 3, en: "Nouns", ta: "பெயர்ச்சொல்", level: "Beginner" },
  { id: 4, en: "Pronouns", ta: "பிரதிப்பெயர்ச்சொல்", level: "Beginner" },
  { id: 5, en: "Verbs", ta: "வினைச்சொல்", level: "Beginner" },
  { id: 6, en: "Subject–Verb Agreement", ta: "எழுவாய்-வினை ஒற்றுமை", level: "Beginner" },
  { id: 7, en: "Tenses (12)", ta: "காலங்கள் (12)", level: "Beginner" },
  { id: 8, en: "Articles", ta: "Articles (a, an, the)", level: "Beginner" },
  { id: 9, en: "Determiners", ta: "நிர்ணயிப்பான்கள்", level: "Beginner" },
  { id: 10, en: "Adjectives", ta: "பெயரடை", level: "Intermediate" },
  { id: 11, en: "Adverbs", ta: "வினையடை", level: "Intermediate" },
  { id: 12, en: "Prepositions", ta: "முன்னிடைச்சொல்", level: "Intermediate" },
  { id: 13, en: "Conjunctions", ta: "இணைப்புச்சொல்", level: "Intermediate" },
  { id: 14, en: "Phrases", ta: "தொடர்கள்", level: "Intermediate" },
  { id: 15, en: "Clauses", ta: "உட்பிரிவுகள்", level: "Intermediate" },
  { id: 16, en: "Active & Passive Voice", ta: "செய்வினை & செயப்பாட்டு வினை", level: "Intermediate" },
  { id: 17, en: "Direct & Indirect Speech", ta: "நேரடி & மறைமுக பேச்சு", level: "Intermediate" },
  { id: 18, en: "Modals", ta: "இயல்பு துணை வினைகள்", level: "Intermediate" },
  { id: 19, en: "Conditionals", ta: "நிபந்தனை வாக்கியங்கள்", level: "Intermediate" },
  { id: 20, en: "Gerunds, Infinitives & Participles", ta: "வினையெச்சம் & தொழிற்பெயர்", level: "Intermediate" },
  { id: 21, en: "Question Tags", ta: "கேள்வி ஏற்பு சொற்கள்", level: "Advanced" },
  { id: 22, en: "Punctuation", ta: "நிறுத்தற்குறிகள்", level: "Advanced" },
  { id: 23, en: "Capitalization", ta: "பெரிய எழுத்து பயன்பாடு", level: "Advanced" },
  { id: 24, en: "Common Grammar Errors", ta: "பொதுவான இலக்கண பிழைகள்", level: "Advanced" },
  { id: 25, en: "Advanced Grammar", ta: "மேம்பட்ட இலக்கணம்", level: "Advanced" },
  { id: 26, en: "Business & Academic English", ta: "வணிக & கல்வி ஆங்கிலம்", level: "Advanced" },
  { id: 27, en: "Writing Skills", ta: "எழுத்துத் திறன்கள்", level: "Advanced" },
  { id: 28, en: "Spoken English Practice", ta: "பேச்சு ஆங்கில பயிற்சி", level: "Advanced" },
  { id: 29, en: "Phrasal Verbs", ta: "மொழிப்புணர்ச்சி வினைச்சொற்கள்", level: "Advanced" },
  { id: 30, en: "Public Speaking", ta: "பொதுப் பேச்சு", level: "Advanced" },
];

const GROUPS = ["Beginner", "Intermediate", "Advanced"];
const PUBLIC_SPEAKING_TOPIC_ID = 30;

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
let currentTopic = null;
let conversations = loadProgress().conversations || {}; // { topicId: [{role, content}] }
let completed = new Set(loadProgress().completed || []);
let apiKeyVerified = false;

// ---------------------------------------------------------------
// Groq API key box (sidebar): save, verify, gate chat on it
// ---------------------------------------------------------------
const apiKeyInput = document.getElementById("apiKeyInput");
const verifyKeyBtn = document.getElementById("verifyKeyBtn");
const keyStatusEl = document.getElementById("keyStatus");

function getStoredKey() {
  try {
    return localStorage.getItem("groqApiKey") || "";
  } catch {
    return "";
  }
}

function setStoredKey(key) {
  try {
    localStorage.setItem("groqApiKey", key);
  } catch {}
}

function setKeyStatus(text, kind) {
  keyStatusEl.textContent = text;
  keyStatusEl.className = "key-status" + (kind ? ` ${kind}` : "");
}

async function verifyKey(key, { silent = false } = {}) {
  if (!key) {
    apiKeyVerified = false;
    if (!silent) setKeyStatus("Not connected yet.", "");
    return false;
  }
  if (!silent) {
    setKeyStatus("Checking with Groq…", "pending");
    verifyKeyBtn.disabled = true;
  }
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json();
    if (data.valid) {
      apiKeyVerified = true;
      setStoredKey(key);
      setKeyStatus("Connected — ready to chat.", "ok");
      return true;
    } else {
      apiKeyVerified = false;
      setKeyStatus(data.error || "Couldn't verify this key.", "err");
      return false;
    }
  } catch (err) {
    apiKeyVerified = false;
    setKeyStatus("Couldn't reach the server to verify. Try again.", "err");
    return false;
  } finally {
    verifyKeyBtn.disabled = false;
  }
}

verifyKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  verifyKey(key);
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    verifyKeyBtn.click();
  }
});

// On load: if a key was saved earlier, fill it in and quietly re-verify
(function initKey() {
  const saved = getStoredKey();
  if (saved) {
    apiKeyInput.value = saved;
    setKeyStatus("Re-checking saved key…", "pending");
    verifyKey(saved, { silent: false });
  }
})();

function loadProgress() {
  try {
    const raw = localStorage.getItem("teach-progress");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(
      "teach-progress",
      JSON.stringify({ conversations, completed: [...completed] })
    );
  } catch {}
}

// ---------------------------------------------------------------
// Sidebar rendering
// ---------------------------------------------------------------
const topicPathEl = document.getElementById("topicPath");

function renderSidebar() {
  topicPathEl.innerHTML = "";
  GROUPS.forEach((group) => {
    const label = document.createElement("div");
    label.className = "path-group-label";
    label.textContent = group;
    topicPathEl.appendChild(label);

    TOPICS.filter((t) => t.level === group).forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "topic-btn" + (t.id === currentTopic?.id ? " active" : "") + (completed.has(t.id) ? " done" : "");
      btn.innerHTML = `<span class="num">${String(t.id).padStart(2, "0")}</span><span>${t.en}</span>`;
      btn.addEventListener("click", () => selectTopic(t.id));
      topicPathEl.appendChild(btn);
    });
  });
  updateProgressBar();
}

function updateProgressBar() {
  document.getElementById("progressCount").textContent = `${completed.size} / 30`;
  document.getElementById("progressFill").style.width = `${(completed.size / 30) * 100}%`;
}

// ---------------------------------------------------------------
// Topic selection
// ---------------------------------------------------------------
const heroEl = document.getElementById("hero");
const topicViewEl = document.getElementById("topicView");
const chatThreadEl = document.getElementById("chatThread");

function selectTopic(id) {
  const topic = TOPICS.find((t) => t.id === id);
  if (!topic) return;
  currentTopic = topic;
  completed.add(id);
  saveProgress();

  heroEl.hidden = true;
  topicViewEl.hidden = false;

  document.getElementById("topicId").textContent = String(topic.id).padStart(2, "0");
  document.getElementById("topicEn").textContent = topic.en;
  document.getElementById("topicTa").textContent = topic.ta;
  document.getElementById("topicLevel").textContent = topic.level;

  renderSidebar();
  renderChat();

  if (!conversations[id] || conversations[id].length === 0) {
    conversations[id] = [];
    if (!apiKeyVerified) {
      appendMessage(
        "bot",
        "**Add your free Groq API key** in the box on the left, then click **Verify**, to start this lesson.\n\n(இடதுபுறம் உள்ள பெட்டியில் உங்கள் இலவச Groq திறவுகோலைச் சேர்த்து 'Verify' அழுத்தவும்.)"
      );
      // Not saved into conversations[id] on purpose — once the key is
      // verified, selecting this topic again will still trigger the real intro.
    } else if (topic.id === PUBLIC_SPEAKING_TOPIC_ID) {
      // Public Speaking works differently: ask the learner for a subject first,
      // instead of auto-generating an introduction.
      appendMessage(
        "bot",
        "**Type any topic** you'd like a public speaking passage on — e.g. \"leadership\", \"climate change\", \"my school\".\n\nI'll share 10–20 lines, with the important verbs in **bold** and their Tamil meaning right after in brackets.\n\n(நீங்கள் பேச விரும்பும் தலைப்பை தட்டச்சு செய்யவும் — எ.கா. \"தலைமைத்துவம்\". முக்கியமான வினைச்சொற்கள் **தடிமனாக** காட்டப்பட்டு, அதற்கடுத்து அதன் தமிழ் அர்த்தம் அடைப்புக்குறிக்குள் தரப்படும்.)"
      );
    } else {
      // Kick off with an automatic introduction from the tutor
      sendToTutor(`Please introduce the topic "${topic.en}" to a Tamil-speaking beginner/intermediate English learner. Give a short, simple explanation with 2-3 real-time example sentences in English, each with its Tamil meaning.`, { silent: true });
    }
  }

  document.getElementById("sidebar").classList.remove("open");
}

document.getElementById("startBtn").addEventListener("click", () => selectTopic(1));

// ---------------------------------------------------------------
// Chat rendering
// ---------------------------------------------------------------
function renderChat() {
  chatThreadEl.innerHTML = "";
  const msgs = conversations[currentTopic.id] || [];
  msgs.forEach((m) => appendMessage(m.role, m.content, false));
  chatThreadEl.scrollTop = chatThreadEl.scrollHeight;
}

function appendMessage(role, content, scroll = true) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatContent(content);
  wrap.appendChild(bubble);
  chatThreadEl.appendChild(wrap);
  if (scroll) chatThreadEl.scrollTop = chatThreadEl.scrollHeight;
  return wrap;
}

// Very small formatter: turns **bold**, `code`, and Tamil-detected lines into styled markup
function formatContent(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  const paragraphs = withInline.split(/\n{2,}/).map((block) => {
    const isTamil = /[\u0B80-\u0BFF]/.test(block) && !/[a-zA-Z]{3,}/.test(block.replace(/\(.*?\)/g, ""));
    const lines = block.split(/\n/).join("<br>");
    return `<p class="${isTamil ? "ta" : ""}">${lines}</p>`;
  });

  return paragraphs.join("");
}

// ---------------------------------------------------------------
// Talking to the tutor (calls our own /api/chat serverless function)
// ---------------------------------------------------------------
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !currentTopic) return;
  chatInput.value = "";
  sendToTutor(text);
});

async function sendToTutor(userText, opts = {}) {
  const topic = currentTopic;

  if (!apiKeyVerified) {
    if (!opts.silent) {
      conversations[topic.id].push({ role: "user", content: userText });
      appendMessage("user", userText);
    }
    appendMessage(
      "bot",
      "**Add your free Groq API key** in the box on the left, then click **Verify**, before chatting.\n\n(முதலில் இடதுபுறம் Groq திறவுகோலைச் சேர்த்து 'Verify' அழுத்தவும்.)"
    );
    apiKeyInput.focus();
    return;
  }

  if (!opts.silent) {
    conversations[topic.id].push({ role: "user", content: userText });
    appendMessage("user", userText);
  }

  sendBtn.disabled = true;
  const typingEl = appendMessage("bot typing", "Typing…");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: { en: topic.en, ta: topic.ta, level: topic.level },
        message: userText,
        history: (conversations[topic.id] || []).slice(-10),
        apiKey: getStoredKey(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      typingEl.remove();
      if (data.error === "missing_key" || data.error === "invalid_key") {
        apiKeyVerified = false;
        setKeyStatus(data.message || "Your Groq key needs to be re-verified.", "err");
        appendMessage(
          "bot",
          `**${data.message || "Your Groq key needs to be re-verified."}**\n\n(உங்கள் திறவுகோலை மீண்டும் சரிபார்க்கவும்.)`
        );
      } else {
        appendMessage(
          "bot",
          "**Something went wrong** reaching the tutor. Please try again in a moment.\n\n(சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.)"
        );
      }
      return;
    }

    const reply = data.reply || "Sorry, I couldn't generate a reply just now. Please try again.";
    typingEl.remove();
    conversations[topic.id].push({ role: "bot", content: reply });
    appendMessage("bot", reply);
    saveProgress();
  } catch (err) {
    typingEl.remove();
    appendMessage(
      "bot",
      "**Connection error.** The tutor couldn't be reached — please check your internet connection and try again in a moment.\n\n(இணைப்பு பிழை — சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.)"
    );
    console.error(err);
  } finally {
    sendBtn.disabled = false;
  }
}

// ---------------------------------------------------------------
// Mobile sidebar toggle
// ---------------------------------------------------------------
document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
renderSidebar();
