"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const beautify = require("js-beautify");

/* ═══════════════════════════════════════════════════════
   CONFIGURATION
═══════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 3000;
const MAX_RETRIES = 5;
const MAX_SESSIONS = 50;
const CLIENT_ID_HEADER = "x-client-id";
const USER_KEY_TTL_MS = 60 * 60 * 1000; // 1 hour
const USER_KEY_CLEANUP_MS = 5 * 60 * 1000; // every 5 minutes
const SERVER_API_KEY = process.env.GEMINI_API_KEY || null;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

/* ═══════════════════════════════════════════════════════
   EXPRESS SETUP
═══════════════════════════════════════════════════════ */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // sessions contain full code, so we need more room
app.use(
  express.static(PUBLIC_DIR, {
    etag: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
  }),
);

/* ═══════════════════════════════════════════════════════
   GEMINI SETUP
═══════════════════════════════════════════════════════ */
const modelCache = new Map(); // key: apiKey, value: Gemini model
const userKeysByClientId = new Map(); // key: clientId, value: { apiKey, expiresAt }

function getModelForApiKey(apiKey) {
  if (!apiKey) return null;
  if (modelCache.has(apiKey)) return modelCache.get(apiKey);

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  modelCache.set(apiKey, model);
  return model;
}

function getClientId(req) {
  const raw = req.get(CLIENT_ID_HEADER);
  if (!raw || typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id) return null;
  return id.slice(0, 120);
}

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return "••••••••";
  return `${apiKey.slice(0, 4)}••••••${apiKey.slice(-4)}`;
}

function purgeExpiredUserKeys() {
  const now = Date.now();
  for (const [clientId, entry] of userKeysByClientId.entries()) {
    if (!entry || entry.expiresAt <= now) {
      userKeysByClientId.delete(clientId);
    }
  }
}

function getActiveUserKeyEntry(clientId) {
  if (!clientId) return null;
  const entry = userKeysByClientId.get(clientId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    userKeysByClientId.delete(clientId);
    return null;
  }
  return entry;
}

function getActiveApiKeyForRequest(req) {
  const clientId = getClientId(req);
  const userEntry = getActiveUserKeyEntry(clientId);
  if (userEntry?.apiKey) return userEntry.apiKey;
  return SERVER_API_KEY;
}

async function validateApiKeyAvailability(apiKey) {
  const model = getModelForApiKey(apiKey);
  if (!model) throw new Error("API key is missing.");

  const result = await model.generateContent(
    'Return this exact JSON only: {"ok":true}',
  );
  await result.response;
}

setInterval(purgeExpiredUserKeys, USER_KEY_CLEANUP_MS);

/* ═══════════════════════════════════════════════════════
  SESSION STORE  (saved to history.json)
  Schema: [{ id, title, createdAt, updatedAt, messages: [{ role, content?, result? }] }]
═══════════════════════════════════════════════════════ */
const SESSIONS_FILE = path.join(DATA_DIR, "history.json");
const SESSIONS_BAK = path.join(DATA_DIR, "history.backup.json");
const LEGACY_SESSIONS_FILE = path.join(__dirname, "history.json");
const LEGACY_SESSIONS_BAK = path.join(__dirname, "history.backup.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SESSIONS_FILE) && fs.existsSync(LEGACY_SESSIONS_FILE)) {
  fs.copyFileSync(LEGACY_SESSIONS_FILE, SESSIONS_FILE);
}

if (!fs.existsSync(SESSIONS_BAK) && fs.existsSync(LEGACY_SESSIONS_BAK)) {
  fs.copyFileSync(LEGACY_SESSIONS_BAK, SESSIONS_BAK);
}

function normalizeSession(entry) {
  const fallbackId = Date.now() + Math.floor(Math.random() * 1000);
  const safeId = Number(entry?.id) || fallbackId;
  const safeTitle =
    typeof entry?.title === "string" && entry.title.trim()
      ? entry.title.trim().slice(0, 80)
      : "Untitled session";
  const safeCreatedAt =
    typeof entry?.createdAt === "string" && entry.createdAt
      ? entry.createdAt
      : new Date().toISOString();
  const safeUpdatedAt =
    typeof entry?.updatedAt === "string" && entry.updatedAt
      ? entry.updatedAt
      : safeCreatedAt;
  const safeMessages = Array.isArray(entry?.messages) ? entry.messages : [];

  return {
    id: safeId,
    title: safeTitle,
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
    messages: safeMessages,
  };
}

function readSessionsFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed;
}

function writeJsonAtomic(filePath, payload) {
  const tempFile = `${filePath}.tmp`;
  const json = JSON.stringify(payload, null, 2);

  fs.writeFileSync(tempFile, json, "utf8");
  fs.renameSync(tempFile, filePath);
}

function loadSessions() {
  try {
    const parsed = readSessionsFile(SESSIONS_FILE);

    // Migration: old format was flat { id, prompt, result, createdAt } entries
    if (
      parsed.length > 0 &&
      parsed[0].prompt !== undefined &&
      !parsed[0].messages
    ) {
      console.log("[Sessions] Migrating old history format to sessions...");
      const migrated = parsed.map((entry) =>
        normalizeSession({
          id: entry.id,
          title: String(entry.prompt || "").slice(0, 80),
          createdAt: entry.createdAt,
          messages: [
            { role: "user", content: entry.prompt },
            { role: "ai", result: entry.result },
          ],
        }),
      );
      writeJsonAtomic(SESSIONS_FILE, migrated);
      writeJsonAtomic(SESSIONS_BAK, migrated);
      return migrated;
    }

    return parsed.map(normalizeSession);
  } catch (err) {
    console.warn(
      "[Sessions] Could not load history.json, trying backup...",
      err.message,
    );
    try {
      const backup = readSessionsFile(SESSIONS_BAK).map(normalizeSession);
      if (backup.length > 0) {
        console.log(
          `[Sessions] Recovered ${backup.length} session(s) from backup.`,
        );
        writeJsonAtomic(SESSIONS_FILE, backup);
        return backup;
      }
    } catch (backupErr) {
      console.warn(
        "[Sessions] Could not load backup file either.",
        backupErr.message,
      );
    }
  }
  return [];
}

function saveSessions() {
  try {
    const normalized = sessions.map(normalizeSession).slice(0, MAX_SESSIONS);

    if (fs.existsSync(SESSIONS_FILE)) {
      fs.copyFileSync(SESSIONS_FILE, SESSIONS_BAK);
    }

    writeJsonAtomic(SESSIONS_FILE, normalized);

    if (!fs.existsSync(SESSIONS_BAK)) {
      writeJsonAtomic(SESSIONS_BAK, normalized);
    }
  } catch (err) {
    console.error("[Sessions] Could not save history.json:", err.message);
  }
}

const sessions = loadSessions();

/* ═══════════════════════════════════════════════════════
   PROMPT ENGINEERING
═══════════════════════════════════════════════════════ */
function buildSystemPrompt(userInput, currentCode, conversationHistory) {
  const isFollowUp = currentCode && (currentCode.html || currentCode.css);

  if (isFollowUp) {
    return `You are an expert front-end developer specialising in UI components. 
Your sole job is to generate clean, standalone UI component code.

USER REQUEST: "${userInput}"

EXISTING COMPONENT (modify it according to the user request above — keep everything not mentioned unchanged):
HTML:
${currentCode.html}

CSS:
${currentCode.css}

JS:
${currentCode.js || "(none)"}

STRICT RULES — follow every rule, no exceptions:
1.  Generate ONLY a UI component. Do NOT generate full pages, full websites, or any backend code.
2.  HTML must be a self-contained snippet (a <div> or semantic wrapper), NOT a full HTML document.
3.  CSS must be scoped with a unique class prefix to avoid conflicts (e.g. "dc-componentname-").
4.  JavaScript must be vanilla JS only — no libraries, no frameworks, no CDN imports.
5.  JavaScript must be wrapped in an IIFE: (function(){ ... })();
6.  All interactive JS must reference elements within the component only.
7.  Follow modern UI/UX best practices: spacing, contrast, accessibility (aria labels where needed).
8.  Keep code readable, well-structured, and beginner-friendly with brief inline comments.
9.  Ensure full responsiveness using CSS Flexbox or Grid.
10. Use CSS custom properties (variables) for colours and repeating values.
11. Do NOT include any <style> tags inside the HTML string — keep CSS separate.
12. Do NOT include any <script> tags inside the HTML string — keep JS separate.

OUTPUT FORMAT:
Return a JSON object with three string fields: html, css, js.
The html field contains the component HTML snippet.
The css field contains all styles.
The js field contains all JavaScript (or an empty string if none is needed).`;
  }

  return `You are an expert front-end developer specialising in UI components. 
Your sole job is to generate clean, standalone UI component code.

USER REQUEST: "${userInput}"

STRICT RULES — follow every rule, no exceptions:
1.  Generate ONLY a UI component. Do NOT generate full pages, full websites, or any backend code.
2.  HTML must be a self-contained snippet (a <div> or semantic wrapper), NOT a full HTML document.
3.  CSS must be scoped with a unique class prefix to avoid conflicts (e.g. "dc-componentname-").
4.  JavaScript must be vanilla JS only — no libraries, no frameworks, no CDN imports.
5.  JavaScript must be wrapped in an IIFE: (function(){ ... })();
6.  All interactive JS must reference elements within the component only.
7.  Follow modern UI/UX best practices: spacing, contrast, accessibility (aria labels where needed).
8.  Keep code readable, well-structured, and beginner-friendly with brief inline comments.
9.  Ensure full responsiveness using CSS Flexbox or Grid.
10. Use CSS custom properties (variables) for colours and repeating values.
11. Do NOT include any <style> tags inside the HTML string — keep CSS separate.
12. Do NOT include any <script> tags inside the HTML string — keep JS separate.

OUTPUT FORMAT:
Return a JSON object with three string fields: html, css, js.
The html field contains the component HTML snippet.
The css field contains all styles.
The js field contains all JavaScript (or an empty string if none is needed).`;
}

/* ═══════════════════════════════════════════════════════
   GEMINI API CALL WITH EXPONENTIAL BACKOFF RETRY
═══════════════════════════════════════════════════════ */
async function callGeminiWithRetry(prompt, apiKey) {
  const aiModel = getModelForApiKey(apiKey);
  if (!aiModel) throw new Error("GEMINI_API_KEY is not configured.");

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await aiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      lastError = err;
      console.error(
        `[Gemini] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`,
      );

      const statusCode = err?.status || err?.statusCode;
      if (statusCode === 401 || statusCode === 403 || statusCode === 400) {
        const error = new Error(
          `Gemini API error (${statusCode}): ${err.message}`,
        );
        error.statusCode = statusCode;
        throw error;
      }
      if (statusCode === 429) {
        const error = new Error(
          "API quota exceeded. You have reached your daily request limit for this model. " +
            "Please wait until tomorrow or use a different API key.",
        );
        error.statusCode = 429;
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 10000);
        console.log(`[Gemini] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `AI failed after ${MAX_RETRIES} attempts. ${lastError?.message || ""}`,
  );
}

async function generateWithAvailableKeys(prompt, req) {
  const clientId = getClientId(req);
  const userEntry = getActiveUserKeyEntry(clientId);

  if (userEntry?.apiKey) {
    try {
      return await callGeminiWithRetry(prompt, userEntry.apiKey);
    } catch (err) {
      const statusCode = err?.statusCode;
      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        userKeysByClientId.delete(clientId);
        const invalidUserKeyError = new Error(
          "Your saved API key is invalid now. Please enter it again.",
        );
        invalidUserKeyError.statusCode = 400;
        throw invalidUserKeyError;
      }
      if (statusCode === 429) {
        const userQuotaError = new Error(
          "Your saved API key quota is exhausted. Please clear it and try another key.",
        );
        userQuotaError.statusCode = 429;
        throw userQuotaError;
      }
      throw err;
    }
  }

  if (!SERVER_API_KEY) {
    const missingKeyError = new Error(
      "No server API key available. Configure GEMINI_API_KEY.",
    );
    missingKeyError.statusCode = 500;
    missingKeyError.requireUserKey = true;
    missingKeyError.code = "SERVER_KEYS_EXHAUSTED";
    throw missingKeyError;
  }

  try {
    return await callGeminiWithRetry(prompt, SERVER_API_KEY);
  } catch (err) {
    const statusCode = err?.statusCode;

    if (statusCode === 429) {
      const exhaustedError = new Error(
        "Server API limit is used up right now. Please enter your own API key to continue.",
      );
      exhaustedError.statusCode = 429;
      exhaustedError.code = "SERVER_KEYS_EXHAUSTED";
      exhaustedError.requireUserKey = true;
      throw exhaustedError;
    }

    if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
      const invalidServerKeyError = new Error(
        "Server API key is invalid right now. Please enter your own API key to continue.",
      );
      invalidServerKeyError.statusCode = 400;
      invalidServerKeyError.code = "SERVER_KEYS_EXHAUSTED";
      invalidServerKeyError.requireUserKey = true;
      throw invalidServerKeyError;
    }

    throw err;
  }
}

/* ═══════════════════════════════════════════════════════
   RESPONSE PARSING
═══════════════════════════════════════════════════════ */
function parseGeminiResponse(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Could not parse AI response. The model returned an unexpected format.",
    );
  }

  const html = String(parsed.html || "").trim();
  const css = String(parsed.css || "").trim();
  const js = String(parsed.js || "").trim();

  if (!html && !css)
    throw new Error("AI returned empty content. Try rephrasing your prompt.");

  return { html, css, js };
}

/* ═══════════════════════════════════════════════════════
   CODE FORMATTER
═══════════════════════════════════════════════════════ */
const HTML_OPTS = {
  indent_size: 2,
  wrap_line_length: 100,
  max_preserve_newlines: 1,
  end_with_newline: true,
};
const CSS_OPTS = { indent_size: 2, end_with_newline: true };
const JS_OPTS = {
  indent_size: 2,
  max_preserve_newlines: 1,
  end_with_newline: true,
};

function formatCode({ html, css, js }) {
  return {
    html: beautify.html(html, HTML_OPTS),
    css: beautify.css(css, CSS_OPTS),
    js: js ? beautify.js(js, JS_OPTS) : "",
  };
}

/* ═══════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════ */

app.get("/user-key/status", (req, res) => {
  const clientId = getClientId(req);
  if (!clientId) {
    return res.status(400).json({ error: "Missing client id." });
  }

  const entry = getActiveUserKeyEntry(clientId);
  if (!entry) {
    return res.json({ hasUserKey: false, expiresAt: null, maskedKey: null });
  }

  return res.json({
    hasUserKey: true,
    expiresAt: entry.expiresAt,
    maskedKey: maskApiKey(entry.apiKey),
  });
});

app.get("/api-source", (req, res) => {
  const clientId = getClientId(req);
  if (!clientId) {
    return res.status(400).json({ error: "Missing client id." });
  }

  const userEntry = getActiveUserKeyEntry(clientId);
  if (userEntry?.apiKey) {
    return res.json({
      source: "user",
      label: "Source: User",
      expiresAt: userEntry.expiresAt,
    });
  }

  return res.json({
    source: "server",
    label: "Source: Server",
    expiresAt: null,
  });
});

app.post("/user-key/validate", async (req, res) => {
  const clientId = getClientId(req);
  const rawApiKey = req.body?.apiKey;

  if (!clientId) {
    return res.status(400).json({ error: "Missing client id." });
  }

  if (!rawApiKey || typeof rawApiKey !== "string" || !rawApiKey.trim()) {
    return res.status(400).json({ error: "API key is required." });
  }

  const apiKey = rawApiKey.trim();

  try {
    await validateApiKeyAvailability(apiKey);

    const expiresAt = Date.now() + USER_KEY_TTL_MS;
    userKeysByClientId.set(clientId, { apiKey, expiresAt });

    return res.json({
      ok: true,
      hasUserKey: true,
      expiresAt,
      maskedKey: maskApiKey(apiKey),
      message: "API key is valid and quota is available.",
    });
  } catch (err) {
    const statusCode = err?.status || err?.statusCode;

    if (statusCode === 429) {
      return res.status(429).json({
        error:
          "API key is valid but quota is currently unavailable. Please use another key.",
      });
    }

    if (statusCode === 401 || statusCode === 403 || statusCode === 400) {
      return res.status(400).json({
        error: "API key is invalid or not authorized for this model.",
      });
    }

    return res.status(500).json({
      error: "Could not validate API key right now. Please try again.",
    });
  }
});

app.delete("/user-key", (req, res) => {
  const clientId = getClientId(req);
  if (!clientId) {
    return res.status(400).json({ error: "Missing client id." });
  }

  userKeysByClientId.delete(clientId);
  return res.json({ ok: true, hasUserKey: false });
});

/* Generate — unchanged interface, no longer saves to history inline */
app.post("/generate", async (req, res) => {
  const rawPrompt = req.body?.prompt;
  const currentCode = req.body?.currentCode || null;
  const conversationHistory = Array.isArray(req.body?.history)
    ? req.body.history.slice(-4)
    : [];

  if (
    !rawPrompt ||
    typeof rawPrompt !== "string" ||
    rawPrompt.trim().length === 0
  ) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const prompt = rawPrompt.trim();

  try {
    const isFollowUp = currentCode && (currentCode.html || currentCode.css);
    console.log(
      `[Generate] ${isFollowUp ? "Follow-up edit" : "New component"} — Prompt: "${prompt.slice(0, 80)}..."`,
    );

    const systemPrompt = buildSystemPrompt(
      prompt,
      currentCode,
      conversationHistory,
    );
    const rawText = await generateWithAvailableKeys(systemPrompt, req);
    const parsed = parseGeminiResponse(rawText);
    const formatted = formatCode(parsed);

    console.log(
      `[Generate] Success — HTML: ${formatted.html.length}c, CSS: ${formatted.css.length}c, JS: ${formatted.js.length}c`,
    );

    return res.json(formatted);
  } catch (err) {
    console.error("[Generate] Error:", err.message);
    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({
      error: err.message || "Unexpected error. Please try again.",
      code: err?.code || null,
      requireUserKey: Boolean(err?.requireUserKey),
    });
  }
});

/* Sessions — save a completed session (called on New Chat) */
app.post("/sessions", (req, res) => {
  const { title, messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required." });
  }

  const session = {
    id: Date.now(),
    title:
      typeof title === "string" && title.trim()
        ? title.trim().slice(0, 80)
        : "Untitled session",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages,
  };

  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) sessions.pop();
  saveSessions();

  console.log(
    `[Sessions] Saved session "${session.title}" (${messages.length} messages)`,
  );
  return res.json({ id: session.id });
});

/* Sessions — list (slim, no message content) */
app.get("/sessions", (req, res) => {
  const slim = sessions.map(
    ({ id, title, createdAt, updatedAt, messages }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      messageCount: messages.length,
    }),
  );
  res.json(slim);
});

/* Sessions — get full session */
app.get("/sessions/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const session = sessions.find((s) => s.id === id);

  if (!session) return res.status(404).json({ error: "Session not found." });

  res.json(session);
});

/* Sessions — update an existing session's messages (called after every generation) */
app.put("/sessions/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = sessions.findIndex((s) => s.id === id);

  if (idx === -1) return res.status(404).json({ error: "Session not found." });

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required." });
  }

  const updatedSession = {
    ...sessions[idx],
    messages,
    updatedAt: new Date().toISOString(),
  };

  sessions.splice(idx, 1);
  sessions.unshift(updatedSession);
  saveSessions();

  return res.json({ id });
});

/* Sessions — delete one session */
app.delete("/sessions/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = sessions.findIndex((s) => s.id === id);

  if (idx === -1) return res.status(404).json({ error: "Session not found." });

  sessions.splice(idx, 1);
  saveSessions();

  res.json({ message: "Session deleted." });
});

/* Sessions — clear all */
app.delete("/sessions", (req, res) => {
  sessions.length = 0;
  saveSessions();
  res.json({ message: "All sessions cleared." });
});

/* Legacy /history aliases so old bookmarks or tests don't break */
app.get("/history", (req, res) => res.redirect("/sessions"));
app.delete("/history", (req, res) => {
  sessions.length = 0;
  saveSessions();
  res.json({ message: "All sessions cleared." });
});

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ═══════════════════════════════════════════════════════
   START SERVER
═══════════════════════════════════════════════════════ */
app.listen(PORT, () => {
  const keyStatus = SERVER_API_KEY
    ? `✓  Configured (${SERVER_API_KEY.slice(0, 8)}...)`
    : "✗  MISSING — add GEMINI_API_KEY to your .env file";

  console.log("\n══════════════════════════════════════════");
  console.log("  DripCraft — AI UI Generator");
  console.log("══════════════════════════════════════════");
  console.log(`  URL     : http://localhost:${PORT}`);
  console.log(`  API Key : ${keyStatus}`);
  console.log("══════════════════════════════════════════\n");
});
