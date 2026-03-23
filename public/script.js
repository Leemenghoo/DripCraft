/* ═══════════════════════════════════════════════════════
   DRIPCRAFT — AI UI Generator
   script.js  |  Chat Interface
═══════════════════════════════════════════════════════ */

"use strict";

/* ── DOM References ── */
const promptInput = document.getElementById("promptInput");
const generateBtn = document.getElementById("generateBtn");
const charCounter = document.getElementById("charCounter");
const chatThread = document.getElementById("chatThread");
const chatWelcome = document.getElementById("chatWelcome");
const errorBanner = document.getElementById("errorBanner");
const errorMessage = document.getElementById("errorMessage");
const retryBtn = document.getElementById("retryBtn");
const historyToggleBtn = document.getElementById("historyToggleBtn");
const historySidebar = document.getElementById("historySidebar");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const mainContent = document.getElementById("mainContent");
const navLogoHome = document.getElementById("navLogoHome");
const apiSourceBadge = document.getElementById("apiSourceBadge");
const apiSourceModal = document.getElementById("apiSourceModal");
const apiSourceInfoText = document.getElementById("apiSourceInfoText");
const apiSourceMeta = document.getElementById("apiSourceMeta");
const apiSourceCloseBtn = document.getElementById("apiSourceCloseBtn");
const clearUserApiKeyBtn = document.getElementById("clearUserApiKeyBtn");
const clearApiConfirmModal = document.getElementById("clearApiConfirmModal");
const clearApiConfirmBtn = document.getElementById("clearApiConfirmBtn");
const clearApiConfirmCancelBtn = document.getElementById(
  "clearApiConfirmCancelBtn",
);
const toast = document.getElementById("toast");
const apiModal = document.getElementById("apiModal");
const apiModalInput = document.getElementById("apiModalInput");
const apiModalSubmitBtn = document.getElementById("apiModalSubmitBtn");
const apiModalCancelBtn = document.getElementById("apiModalCancelBtn");

/* ═══════════════════════════════════════════════════════
   BACKGROUND ORB GENERATOR
═══════════════════════════════════════════════════════ */
(function initOrbs() {
  const container = document.getElementById("bgOrbs");
  if (!container) return;

  const mqMobile = window.matchMedia("(max-width: 768px)");
  const mqTiny = window.matchMedia("(max-width: 430px)");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Phones: desktop-sized orbs (up to 580px) dwarf the viewport and wash out the logo — scale down */
  const isMobile = mqMobile.matches;
  const isTiny = mqTiny.matches; /* e.g. iPhone 13 Pro Max portrait ~428px */

  const hideOrbs = prefersReduced.matches;

  let orbCount;
  let sizeMin;
  let sizeMax;
  let blurMin;
  let blurMax;
  let driftMin;
  let driftMax;
  let opacityMin;
  let opacityMax;

  if (hideOrbs) {
    orbCount = 0;
  } else if (isTiny) {
    orbCount = 4;
    sizeMin = 45;
    sizeMax = 130;
    blurMin = 28;
    blurMax = 48;
    driftMin = 18;
    driftMax = 55;
    opacityMin = 0.14;
    opacityMax = 0.26;
  } else if (isMobile) {
    orbCount = 6;
    sizeMin = 70;
    sizeMax = 200;
    blurMin = 38;
    blurMax = 62;
    driftMin = 28;
    driftMax = 85;
    opacityMin = 0.16;
    opacityMax = 0.3;
  } else {
    orbCount = 18;
    sizeMin = 220;
    sizeMax = 580;
    blurMin = 60;
    blurMax = 105;
    driftMin = 80;
    driftMax = 180;
    opacityMin = 0.22;
    opacityMax = 0.38;
  }

  const ORB_COUNT = orbCount;

  const r = (min, max) => Math.random() * (max - min) + min;
  const ri = (min, max) => Math.floor(r(min, max));
  const rv = (v) => (r(0, 1) > 0.5 ? 1 : -1) * r(v * 0.5, v);

  // Core rgba colors (no alpha here — applied separately)
  const coreColors = [
    "220,140,50",
    "245,165,40",
    "255,180,55",
    "200,115,25",
    "235,150,35",
    "210,125,30",
  ];

  // Build all @keyframes as one style block (more reliable than insertRule)
  const orbConfigs = [];
  let cssText = "";

  if (ORB_COUNT === 0) return;

  for (let i = 0; i < ORB_COUNT; i++) {
    const kf = `orbF${i}`;
    const drift = r(driftMin, driftMax);

    // 4 random waypoints — each axis independently randomized for true randomness
    const w1 = { x: rv(drift), y: rv(drift), s: r(0.88, 1.14) };
    const w2 = { x: rv(drift), y: rv(drift), s: r(0.86, 1.12) };
    const w3 = { x: rv(drift), y: rv(drift), s: r(0.9, 1.15) };

    cssText += `@keyframes ${kf} {
  0%   { transform: translate(0px, 0px) scale(1); }
  22%  { transform: translate(${w1.x.toFixed(1)}px, ${w1.y.toFixed(1)}px) scale(${w1.s.toFixed(2)}); }
  50%  { transform: translate(${w2.x.toFixed(1)}px, ${w2.y.toFixed(1)}px) scale(${w2.s.toFixed(2)}); }
  75%  { transform: translate(${w3.x.toFixed(1)}px, ${w3.y.toFixed(1)}px) scale(${w3.s.toFixed(2)}); }
  100% { transform: translate(0px, 0px) scale(1); }
}\n`;

    orbConfigs.push({
      kf,
      size: ri(sizeMin, sizeMax),
      blur: ri(blurMin, blurMax),
      dur: r(12, 40).toFixed(1),
      fadeEnd: r(1.8, 3.2).toFixed(1),
      delay: r(0, 7).toFixed(2),
      opacity: r(opacityMin, opacityMax).toFixed(2),
      topPct: r(-20, 110).toFixed(1),
      leftPct: r(-20, 110).toFixed(1),
      color: coreColors[ri(0, coreColors.length)],
    });
  }

  // Inject all keyframes at once
  const styleEl = document.createElement("style");
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);

  // Create DOM elements
  orbConfigs.forEach(
    ({
      kf,
      size,
      blur,
      dur,
      fadeEnd,
      delay,
      opacity,
      topPct,
      leftPct,
      color,
    }) => {
      const floatStart = (+delay + +fadeEnd).toFixed(2);
      const orb = document.createElement("div");
      orb.className = "orb";
      orb.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `top:${topPct}%`,
        `left:${leftPct}%`,
        `filter:blur(${blur}px)`,
        `background:radial-gradient(circle at 42% 38%, rgba(${color},${opacity}), rgba(${color},0.07) 50%, transparent 75%)`,
        `animation:orbFadeIn ${fadeEnd}s ${delay}s ease forwards, ${kf} ${dur}s ${floatStart}s ease-in-out infinite`,
      ].join(";");
      container.appendChild(orb);
    },
  );
})();

/* ── State ── */
let chatMessages = []; // current session: [{ role:'user'|'ai', content?, result? }]
let generated = { html: "", css: "", js: "" }; // latest code for context
let chatHistory = []; // recent prompts sent to AI for context
let toastTimer = null;
let cardCounter = 0;
let lastPrompt = "";
let currentSessionId = null; // server-assigned ID for the active session
let apiSourcePollTimer = null;
let currentApiSource = { source: "unknown", expiresAt: null };

const MAX_CHAT_HISTORY = 4;
const LS_SESSION_KEY = "dripcraft_session"; // localStorage key
const LS_CLIENT_ID_KEY = "dripcraft_client_id";
const sourceBadgeCompactMedia = window.matchMedia("(max-width: 768px)");

const clientId = getOrCreateClientId();

function getOrCreateClientId() {
  try {
    const existing = localStorage.getItem(LS_CLIENT_ID_KEY);
    if (existing) return existing;

    const nextId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(LS_CLIENT_ID_KEY, nextId);
    return nextId;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "x-client-id": clientId,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/* ═══════════════════════════════════════════════════════
   AUTO-RESIZE TEXTAREA
═══════════════════════════════════════════════════════ */
promptInput.addEventListener("input", () => {
  charCounter.textContent = `${promptInput.value.length} chars`;
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 160) + "px";
});

/* ═══════════════════════════════════════════════════════
   GENERATE — main entry point
═══════════════════════════════════════════════════════ */
generateBtn.addEventListener("click", handleGenerate);
retryBtn.addEventListener("click", () => {
  if (lastPrompt) {
    promptInput.value = lastPrompt;
    promptInput.dispatchEvent(new Event("input"));
    handleGenerate();
  }
});

promptInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
});

async function handleGenerate() {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showToast("Please describe a UI component first.", "error");
    promptInput.focus();
    return;
  }

  hideError();
  setLoading(true);
  lastPrompt = prompt;

  // Switch to active chat layout on first message
  if (!mainContent.classList.contains("has-messages")) {
    mainContent.classList.add("has-messages");
    if (chatWelcome) chatWelcome.style.display = "none";
  }

  // Append user bubble immediately
  appendUserBubble(prompt);
  chatMessages.push({ role: "user", content: prompt });

  // Clear input
  promptInput.value = "";
  charCounter.textContent = "0 chars";
  promptInput.style.height = "auto";

  // Show thinking indicator
  const thinkingEl = appendThinkingCard();

  try {
    const result = await postGenerate(prompt);

    // Remove thinking card
    thinkingEl.remove();

    // Update context state
    generated = result;
    chatHistory.push({ content: prompt });
    if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();

    // Append AI card
    appendAICard(result);
    chatMessages.push({ role: "ai", result });

    // Save to server + localStorage immediately so nothing is lost on refresh
    await upsertSession();

    const isFollowUp = chatHistory.length > 1;
    showToast(isFollowUp ? "Component updated!" : "UI generated!", "success");
  } catch (err) {
    thinkingEl.remove();
    if (err.requireUserKey || err.code === "SERVER_KEYS_EXHAUSTED") {
      openApiModal();
    }
    showError(err.message || "Generation failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════════ */
async function postGenerate(prompt) {
  const hasExistingCode = generated.html || generated.css;

  const body = {
    prompt,
    currentCode: hasExistingCode ? generated : null,
    history: chatHistory,
  };

  const res = await apiFetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      data.error || `Server error (${res.status}). Please try again.`,
    );
    error.code = data.code || null;
    error.requireUserKey = Boolean(data.requireUserKey);
    error.status = res.status;
    throw error;
  }

  return data;
}

async function fetchSessionList() {
  const res = await apiFetch("/sessions");
  if (!res.ok) throw new Error("Could not load sessions.");
  return res.json();
}

async function fetchSession(id) {
  const res = await apiFetch(`/sessions/${id}`);
  if (!res.ok) throw new Error("Session not found.");
  return res.json();
}

async function postSaveSession(title, messages) {
  const res = await apiFetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, messages }),
  });
  const data = await res.json().catch(() => ({}));
  return data.id || null;
}

async function putUpdateSession(id, messages) {
  await apiFetch(`/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

/* Create or update the current session after every generation */
async function upsertSession() {
  try {
    const title =
      chatMessages.find((m) => m.role === "user")?.content || "Untitled";
    if (!currentSessionId) {
      currentSessionId = await postSaveSession(title, chatMessages);
    } else {
      await putUpdateSession(currentSessionId, chatMessages);
    }
    saveToLocalStorage();
    await loadSessionList();
  } catch {
    // Non-critical — fail silently
  }
}

async function deleteAllSessions() {
  await apiFetch("/sessions", { method: "DELETE" });
}

async function validateUserKey(apiKey) {
  const res = await apiFetch("/user-key/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not validate API key.");
  return data;
}

async function clearUserKey() {
  const res = await apiFetch("/user-key", { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not clear API key.");
  return data;
}

async function fetchApiSource() {
  const res = await apiFetch("/api-source");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load API source.");
  return data;
}

/* ═══════════════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════════════ */
function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle("loading", on);
}

/* ═══════════════════════════════════════════════════════
   ERROR BANNER
═══════════════════════════════════════════════════════ */
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.removeAttribute("hidden");
}

function hideError() {
  errorBanner.setAttribute("hidden", "");
}

/* ═══════════════════════════════════════════════════════
   CHAT RENDERING
═══════════════════════════════════════════════════════ */

/* Append a right-aligned user bubble */
function appendUserBubble(prompt) {
  const msg = document.createElement("div");
  msg.className = "chat-message chat-message--user";
  msg.innerHTML = `<div class="user-bubble">${escapeHTML(prompt)}</div>`;
  chatThread.appendChild(msg);
  scrollToBottom();
}

/* Append the three-dot thinking indicator */
function appendThinkingCard() {
  const msg = document.createElement("div");
  msg.className = "chat-message chat-message--ai";
  msg.innerHTML = `
    <div class="ai-avatar" aria-hidden="true">⬡</div>
    <div class="thinking-card" aria-label="Generating...">
      <div class="thinking-dots" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <span>Generating...</span>
    </div>
  `;
  chatThread.appendChild(msg);
  scrollToBottom();
  return msg;
}

/* Append a full AI response card with code tabs + live preview */
function appendAICard(result) {
  const id = ++cardCounter;

  const msg = document.createElement("div");
  msg.className = "chat-message chat-message--ai";
  msg.dataset.cardId = id;

  msg.innerHTML = `
    <div class="ai-avatar" aria-hidden="true">⬡</div>
    <div class="ai-card">
      <div class="ai-card-panels">

        <!-- Code panel -->
        <div class="ai-code-panel">
          <div class="panel-header">
            <div class="tab-group" role="tablist" aria-label="Code tabs">
              <button class="tab-btn active" role="tab" aria-selected="true"  data-tab="html" data-card="${id}">HTML</button>
              <button class="tab-btn"        role="tab" aria-selected="false" data-tab="css"  data-card="${id}">CSS</button>
              <button class="tab-btn"        role="tab" aria-selected="false" data-tab="js"   data-card="${id}">JS</button>
            </div>
            <div class="panel-actions">
              <button class="action-btn copy-btn" data-card="${id}" aria-label="Copy code">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy
              </button>
              <button class="action-btn download-btn" data-card="${id}" aria-label="Download as HTML">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
            </div>
          </div>
          <div class="code-display-area">
            <div class="tab-panel active" id="card-${id}-html" role="tabpanel">
              <pre class="code-block"><code id="code-${id}-html"></code></pre>
            </div>
            <div class="tab-panel" id="card-${id}-css" role="tabpanel">
              <pre class="code-block"><code id="code-${id}-css"></code></pre>
            </div>
            <div class="tab-panel" id="card-${id}-js" role="tabpanel">
              <pre class="code-block"><code id="code-${id}-js"></code></pre>
            </div>
          </div>
        </div>

        <!-- Preview panel -->
        <div class="ai-preview-panel">
          <div class="panel-header">
            <span class="preview-label">
              <span class="live-dot" aria-hidden="true"></span>
              Live Preview
            </span>
            <div class="panel-actions">
              <button class="action-btn" data-refresh="${id}" aria-label="Refresh preview">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Refresh
              </button>
              <button class="action-btn newtab-btn" data-newtab="${id}" aria-label="Open in new tab">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                New Tab
              </button>
            </div>
          </div>
          <div class="preview-frame-wrapper">
            <iframe
              id="preview-${id}"
              class="preview-frame"
              title="Live preview"
              sandbox="allow-scripts"
            ></iframe>
          </div>
        </div>

      </div>
    </div>
  `;

  chatThread.appendChild(msg);

  // Populate code
  document.getElementById(`code-${id}-html`).innerHTML = highlight(
    result.html || "",
    "html",
  );
  document.getElementById(`code-${id}-css`).innerHTML = highlight(
    result.css || "",
    "css",
  );
  document.getElementById(`code-${id}-js`).innerHTML = highlight(
    result.js || "",
    "js",
  );

  // Load preview
  loadPreview(id, result);

  // Wire up tab buttons for this card
  msg.querySelectorAll(`.tab-btn[data-card="${id}"]`).forEach((btn) => {
    btn.addEventListener("click", () => switchCardTab(id, btn.dataset.tab));
  });

  // Wire up copy
  msg
    .querySelector(`.copy-btn[data-card="${id}"]`)
    .addEventListener("click", () => copyCardCode(id, result));

  // Wire up download
  msg
    .querySelector(`.download-btn[data-card="${id}"]`)
    .addEventListener("click", () => {
      triggerDownload(
        buildDownloadFile(result),
        "dripcraft-component.html",
        "text/html",
      );
      showToast("HTML file downloaded!", "success");
    });

  // Wire up refresh
  msg
    .querySelector(`[data-refresh="${id}"]`)
    .addEventListener("click", () => loadPreview(id, result));

  // Wire up new tab
  msg.querySelector(`[data-newtab="${id}"]`).addEventListener("click", () => {
    const doc = buildPreviewDocument(result);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  scrollToBottom();
}

/* ═══════════════════════════════════════════════════════
   PER-CARD HELPERS
═══════════════════════════════════════════════════════ */
function switchCardTab(cardId, tab) {
  const allBtns = document.querySelectorAll(`.tab-btn[data-card="${cardId}"]`);
  const panelHTML = document.getElementById(`card-${cardId}-html`);
  const panelCSS = document.getElementById(`card-${cardId}-css`);
  const panelJS = document.getElementById(`card-${cardId}-js`);

  allBtns.forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });

  [panelHTML, panelCSS, panelJS].forEach((p) => {
    if (p) p.classList.toggle("active", p.id === `card-${cardId}-${tab}`);
  });
}

async function copyCardCode(cardId, result) {
  // Figure out active tab for this card
  const activeBtn = document.querySelector(
    `.tab-btn[data-card="${cardId}"].active`,
  );
  const tab = activeBtn ? activeBtn.dataset.tab : "html";
  const code = result[tab] || "";
  const label = tab.toUpperCase();

  if (!code) {
    showToast("Nothing to copy on this tab.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    const btn = document.querySelector(`.copy-btn[data-card="${cardId}"]`);
    const orig = btn.innerHTML;
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    showToast(`${label} copied!`, "success");
    setTimeout(() => {
      btn.innerHTML = orig;
    }, 2000);
  } catch {
    showToast("Copy failed — try selecting the code manually.", "error");
  }
}

/* ═══════════════════════════════════════════════════════
   PREVIEW HELPERS
═══════════════════════════════════════════════════════ */
function buildPreviewDocument({ html, css, js }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    body > *:first-child { min-height: 100vh; }
  </style>
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

let blobUrlCache = {};

function loadPreview(cardId, result) {
  const iframe = document.getElementById(`preview-${cardId}`);
  if (!iframe) return;

  const doc = buildPreviewDocument(result);
  const blob = new Blob([doc], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  iframe.src = url;

  iframe.addEventListener(
    "load",
    () => {
      if (blobUrlCache[cardId]) URL.revokeObjectURL(blobUrlCache[cardId]);
      blobUrlCache[cardId] = url;
    },
    { once: true },
  );
}

/* ═══════════════════════════════════════════════════════
   DOWNLOAD
═══════════════════════════════════════════════════════ */
function buildDownloadFile({ html, css, js }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DripCraft — Generated Component</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    body > *:first-child { min-height: 100vh; }
  </style>
  <style>
${css}
  </style>
</head>
<body>
${html}
${js ? `<script>\n${js}\n<\/script>` : ""}
</body>
</html>`;
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  }).click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════
   SYNTAX HIGHLIGHTING
═══════════════════════════════════════════════════════ */
function highlight(src, lang) {
  if (!src)
    return `<span style="color:var(--text-muted);font-style:italic">// Nothing generated</span>`;

  const e = escapeHTML(src);

  switch (lang) {
    case "html":
      return e
        .replace(
          /(&lt;!--[\s\S]*?--&gt;)/g,
          '<span class="token-comment">$1</span>',
        )
        .replace(/(&lt;\/)([\w-]+)/g, '$1<span class="token-tag">$2</span>')
        .replace(/(&lt;)([\w-]+)/g, '$1<span class="token-tag">$2</span>')
        .replace(/\s([\w-]+)=/g, ' <span class="token-attr">$1</span>=')
        .replace(
          /(=)(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g,
          '$1<span class="token-string">$2</span>',
        );

    case "css":
      return e
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
        .replace(/(@[\w-]+)/g, '<span class="token-kw">$1</span>')
        .replace(/^([^{}\n]+)\{/gm, '<span class="token-sel">$1</span>{')
        .replace(/([\w-]+)\s*:/g, '<span class="token-prop">$1</span>:')
        .replace(/:\s*([^;{}\/\n]+)/g, ': <span class="token-val">$1</span>');

    case "js":
      return e
        .replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
        .replace(
          /(&quot;[^&\n]*?&quot;|&#039;[^&\n]*?&#039;|`[^`]*?`)/g,
          '<span class="token-string">$1</span>',
        )
        .replace(
          /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|import|export|default|async|await|try|catch|finally|typeof|instanceof|void|delete|in|of|true|false|null|undefined|this|super)\b/g,
          '<span class="token-kw">$1</span>',
        )
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-num">$1</span>');

    default:
      return e;
  }
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ═══════════════════════════════════════════════════════
   NEW CHAT
═══════════════════════════════════════════════════════ */
if (navLogoHome) {
  navLogoHome.addEventListener("click", () => {
    if (historySidebar.classList.contains("open")) closeSidebar();
    resetChat();
    showToast("Returned to new chat.", "info");
  });

  navLogoHome.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navLogoHome.click();
    }
  });
}

function resetChat() {
  // Clear thread and return to welcome/centered layout
  chatThread.querySelectorAll(".chat-message").forEach((el) => el.remove());
  if (chatWelcome) chatWelcome.style.display = "";
  mainContent.classList.remove("has-messages");

  // Reset state
  chatMessages = [];
  generated = { html: "", css: "", js: "" };
  chatHistory = [];
  lastPrompt = "";
  blobUrlCache = {};
  cardCounter = 0;
  currentSessionId = null;

  // Clear persisted session from localStorage
  clearLocalStorage();

  // Reset input
  promptInput.value = "";
  charCounter.textContent = "0 chars";
  promptInput.style.height = "auto";

  hideError();
  promptInput.focus();
}

/* ═══════════════════════════════════════════════════════
   SESSION HISTORY PANEL
═══════════════════════════════════════════════════════ */
async function loadSessionList() {
  try {
    const items = await fetchSessionList();
    renderSessionList(items);
  } catch {
    // Non-critical — fail silently
  }
}

function renderSessionList(items = []) {
  historyList.querySelectorAll(".history-item").forEach((el) => el.remove());
  historyEmpty.style.display = items.length ? "none" : "";

  items.forEach((session) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.setAttribute("role", "listitem");
    li.dataset.sessionId = session.id;
    li.innerHTML = `
      <div class="history-item-body">
        <p class="history-item-text">${escapeHTML(session.title)}</p>
        <div class="history-item-meta">
          <span class="history-item-time">${formatTime(session.updatedAt || session.createdAt)}</span>
          <span class="history-item-count">${session.messageCount} msg${session.messageCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <button class="history-item-delete" data-delete-id="${session.id}" aria-label="Delete session" title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    `;
    historyList.appendChild(li);
  });
}

/* Single delegated listener on the list — handles all items including dynamic re-renders */
historyList.addEventListener("click", async (e) => {
  const deleteBtn = e.target.closest("[data-delete-id]");
  const sessionLi = e.target.closest("[data-session-id]");

  if (deleteBtn) {
    e.stopPropagation();
    const id = Number(deleteBtn.dataset.deleteId);
    try {
      const res = await apiFetch(`/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Not found");
      if (currentSessionId === id) resetChat();
      await loadSessionList();
      showToast("Session deleted.", "info");
    } catch {
      showToast("Could not delete session.", "error");
    }
    return;
  }

  if (sessionLi) {
    if (window.innerWidth < 768 && historySidebar.classList.contains("open")) {
      closeSidebar();
    }
    restoreSession(Number(sessionLi.dataset.sessionId));
  }
});

async function restoreSession(id) {
  hideError();
  try {
    showToast("Restoring session…", "info");

    const session = await fetchSession(id);

    // Clear thread (also clears currentSessionId and localStorage)
    resetChat();

    // Set the restored session as the active one
    currentSessionId = session.id;

    // Replay all messages
    for (const msg of session.messages) {
      if (msg.role === "user") {
        appendUserBubble(msg.content);
        chatMessages.push({ role: "user", content: msg.content });
        chatHistory.push({ content: msg.content });
        if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
      } else if (msg.role === "ai" && msg.result) {
        appendAICard(msg.result);
        chatMessages.push({ role: "ai", result: msg.result });
        generated = msg.result;
      }
    }

    // Persist the restored session to localStorage
    saveToLocalStorage();

    if (chatWelcome) chatWelcome.style.display = "none";
    mainContent.classList.add("has-messages");
    await loadSessionList();

    showToast("Session restored!", "success");
  } catch (err) {
    showToast(err.message || "Could not restore session.", "error");
  }
}

clearHistoryBtn.addEventListener("click", async () => {
  try {
    await deleteAllSessions();
    renderSessionList([]);
    showToast("All sessions cleared.", "success");
  } catch {
    showToast("Could not clear sessions.", "error");
  }
});

/* ═══════════════════════════════════════════════════════
   SIDEBAR TOGGLE
═══════════════════════════════════════════════════════ */
historyToggleBtn.addEventListener("click", () => {
  historySidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});

sidebarCloseBtn.addEventListener("click", closeSidebar);

function openSidebar() {
  historySidebar.classList.add("open");
  historySidebar.removeAttribute("aria-hidden");
  mainContent.classList.add("shifted");
  historyToggleBtn.setAttribute("aria-expanded", "true");
  loadSessionList();
}

function closeSidebar() {
  historySidebar.classList.remove("open");
  historySidebar.setAttribute("aria-hidden", "true");
  mainContent.classList.remove("shifted");
  historyToggleBtn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (e) => {
  if (
    historySidebar.classList.contains("open") &&
    !historySidebar.contains(e.target) &&
    !historyToggleBtn.contains(e.target) &&
    window.innerWidth < 768
  )
    closeSidebar();
});

/* ═══════════════════════════════════════════════════════
   LOCAL STORAGE  (survives page refresh)
═══════════════════════════════════════════════════════ */
function saveToLocalStorage() {
  try {
    localStorage.setItem(
      LS_SESSION_KEY,
      JSON.stringify({
        sessionId: currentSessionId,
        chatMessages,
        chatHistory,
        generated,
      }),
    );
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}

function clearLocalStorage() {
  try {
    localStorage.removeItem(LS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    if (!saved.chatMessages || saved.chatMessages.length === 0) return false;

    currentSessionId = saved.sessionId || null;
    chatHistory = saved.chatHistory || [];
    generated = saved.generated || { html: "", css: "", js: "" };

    // Replay messages into the chat thread
    if (chatWelcome) chatWelcome.style.display = "none";
    mainContent.classList.add("has-messages");
    saved.chatMessages.forEach((msg) => {
      if (msg.role === "user") {
        appendUserBubble(msg.content);
      } else if (msg.role === "ai" && msg.result) {
        appendAICard(msg.result);
      }
      chatMessages.push(msg);
    });

    return true;
  } catch {
    clearLocalStorage();
    return false;
  }
}

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
function scrollToBottom() {
  chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: "smooth" });
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function getApiSourceMetaText(source, expiresAt) {
  if (source === "user") {
    if (!expiresAt) return "Your key is active in server memory.";
    const minutesLeft = Math.max(
      0,
      Math.ceil((Number(expiresAt) - Date.now()) / 60000),
    );
    return `Your key expires in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
  }

  if (source === "server") {
    return "Using the website API key right now.";
  }

  return "Source is temporarily unavailable. Try again in a moment.";
}

function renderApiSourceModalContent() {
  if (!apiSourceInfoText || !apiSourceMeta) return;

  const { source, expiresAt } = currentApiSource;

  if (source === "user") {
    apiSourceInfoText.textContent =
      "You are currently using your own Gemini API key.";
  } else if (source === "server") {
    apiSourceInfoText.textContent =
      "You are currently using the website API key.";
  } else {
    apiSourceInfoText.textContent =
      "We could not confirm the active API source right now.";
  }

  apiSourceMeta.textContent = getApiSourceMetaText(source, expiresAt);
}

function renderApiSourceBadge(source, expiresAt) {
  if (!apiSourceBadge) return;

  currentApiSource = { source, expiresAt };
  const isCompact = sourceBadgeCompactMedia.matches;

  apiSourceBadge.classList.remove(
    "api-source-badge--server",
    "api-source-badge--user",
    "api-source-badge--unknown",
  );

  if (source === "user") {
    apiSourceBadge.textContent = isCompact ? "USER" : "Source: User";
    apiSourceBadge.classList.add("api-source-badge--user");
    apiSourceBadge.title = "Using user API key";
    apiSourceBadge.setAttribute("aria-label", "API source: User");
    renderApiSourceModalContent();
    return;
  }

  if (source === "server") {
    apiSourceBadge.textContent = isCompact ? "SERVER" : "Source: Server";
    apiSourceBadge.classList.add("api-source-badge--server");
    apiSourceBadge.title = "Using website API key";
    apiSourceBadge.setAttribute("aria-label", "API source: Server");
    renderApiSourceModalContent();
    return;
  }

  apiSourceBadge.textContent = isCompact ? "UNKNOWN" : "Source: Unknown";
  apiSourceBadge.classList.add("api-source-badge--unknown");
  apiSourceBadge.title = "Could not determine API source";
  apiSourceBadge.setAttribute("aria-label", "API source: Unknown");
  renderApiSourceModalContent();
}

async function refreshApiSourceBadge() {
  try {
    const payload = await fetchApiSource();
    renderApiSourceBadge(payload.source, payload.expiresAt);
    updateUserKeyButtons(payload.source === "user");
  } catch {
    renderApiSourceBadge("unknown", null);
  }
}

function updateUserKeyButtons(hasUserKey) {
  if (!clearUserApiKeyBtn) return;
  clearUserApiKeyBtn.hidden = !hasUserKey;
  clearUserApiKeyBtn.setAttribute("aria-hidden", String(!hasUserKey));
}

function openApiSourceModal() {
  if (!apiSourceModal) return;
  renderApiSourceModalContent();
  apiSourceModal.removeAttribute("hidden");
  setTimeout(() => {
    if (apiSourceCloseBtn) apiSourceCloseBtn.focus();
  }, 0);
}

function closeApiSourceModal() {
  if (!apiSourceModal) return;
  apiSourceModal.setAttribute("hidden", "");
}

function openClearApiConfirmModal() {
  if (!clearApiConfirmModal) return;
  closeApiSourceModal();
  clearApiConfirmModal.removeAttribute("hidden");
  setTimeout(() => {
    if (clearApiConfirmCancelBtn) clearApiConfirmCancelBtn.focus();
  }, 0);
}

function closeClearApiConfirmModal() {
  if (!clearApiConfirmModal) return;
  clearApiConfirmModal.setAttribute("hidden", "");
}

function openApiModal() {
  if (!apiModal) return;
  apiModal.removeAttribute("hidden");
  setTimeout(() => {
    if (apiModalInput) apiModalInput.focus();
  }, 0);
}

function closeApiModal() {
  if (!apiModal) return;
  apiModal.setAttribute("hidden", "");
  if (apiModalInput) apiModalInput.value = "";
}

async function submitApiModalKey() {
  if (!apiModalInput || !apiModalSubmitBtn) return;

  const apiKey = apiModalInput.value.trim();
  if (!apiKey) {
    showToast("Please enter your API key.", "error");
    apiModalInput.focus();
    return;
  }

  const original = apiModalSubmitBtn.textContent;
  apiModalSubmitBtn.disabled = true;
  apiModalSubmitBtn.textContent = "Verifying...";

  try {
    await validateUserKey(apiKey);
    updateUserKeyButtons(true);
    await refreshApiSourceBadge();
    closeApiModal();
    showToast("Your API key is active for 1 hour.", "success");
  } catch (err) {
    showToast(err.message || "API key validation failed.", "error");
  } finally {
    apiModalSubmitBtn.disabled = false;
    apiModalSubmitBtn.textContent = original;
  }
}

if (apiModalSubmitBtn) {
  apiModalSubmitBtn.addEventListener("click", submitApiModalKey);
}

if (apiModalCancelBtn) {
  apiModalCancelBtn.addEventListener("click", closeApiModal);
}

if (apiModalInput) {
  apiModalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitApiModalKey();
    }
  });
}

if (apiModal) {
  apiModal.addEventListener("click", (e) => {
    if (e.target === apiModal) closeApiModal();
  });
}

if (apiSourceBadge) {
  apiSourceBadge.addEventListener("click", openApiSourceModal);
  apiSourceBadge.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openApiSourceModal();
    }
  });
}

if (apiSourceCloseBtn) {
  apiSourceCloseBtn.addEventListener("click", closeApiSourceModal);
}

if (apiSourceModal) {
  apiSourceModal.addEventListener("click", (e) => {
    if (e.target === apiSourceModal) closeApiSourceModal();
  });
}

if (clearApiConfirmCancelBtn) {
  clearApiConfirmCancelBtn.addEventListener("click", () => {
    closeClearApiConfirmModal();
    openApiSourceModal();
  });
}

if (clearApiConfirmModal) {
  clearApiConfirmModal.addEventListener("click", (e) => {
    if (e.target === clearApiConfirmModal) {
      closeClearApiConfirmModal();
      openApiSourceModal();
    }
  });
}

if (clearUserApiKeyBtn) {
  clearUserApiKeyBtn.addEventListener("click", () => {
    openClearApiConfirmModal();
  });
}

if (clearApiConfirmBtn) {
  clearApiConfirmBtn.addEventListener("click", async () => {
    clearApiConfirmBtn.disabled = true;
    try {
      await clearUserKey();
      updateUserKeyButtons(false);
      await refreshApiSourceBadge();
      closeClearApiConfirmModal();
      showToast("Your API key has been cleared.", "info");
    } catch (err) {
      showToast(err.message || "Could not clear API key.", "error");
    } finally {
      clearApiConfirmBtn.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
/* Clear localStorage when the tab is closed so the next open starts fresh */
window.addEventListener("beforeunload", () => {
  if (apiSourcePollTimer) {
    clearInterval(apiSourcePollTimer);
    apiSourcePollTimer = null;
  }
  clearLocalStorage();
});

if (
  sourceBadgeCompactMedia &&
  typeof sourceBadgeCompactMedia.addEventListener === "function"
) {
  sourceBadgeCompactMedia.addEventListener("change", () => {
    renderApiSourceBadge(currentApiSource.source, currentApiSource.expiresAt);
  });
} else if (
  sourceBadgeCompactMedia &&
  typeof sourceBadgeCompactMedia.addListener === "function"
) {
  sourceBadgeCompactMedia.addListener(() => {
    renderApiSourceBadge(currentApiSource.source, currentApiSource.expiresAt);
  });
}

(function init() {
  promptInput.focus();
  loadSessionList();
  refreshApiSourceBadge();
  apiSourcePollTimer = setInterval(refreshApiSourceBadge, 5000);
})();
