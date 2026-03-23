# DripCraft

DripCraft is an AI-powered UI component generator built with Node.js, Express, and Google Gemini. It provides a chat-style interface that generates standalone `HTML`, `CSS`, and `JavaScript` snippets, with live preview, download, and session history.

## Highlights

- Generates reusable UI components (not full pages)
- Follow-up edits using previous generated code as context
- Live component preview in an isolated iframe
- One-click copy and downloadable `.html` export
- Session history with restore, update, and delete
- API source switching: server key or user-provided key
- User API key validation and temporary in-memory storage (1-hour TTL)

## Tech Stack

- **Backend:** Node.js, Express, CORS, dotenv
- **AI:** `@google/generative-ai` (Gemini)
- **Formatting:** `js-beautify`
- **Frontend:** Vanilla HTML/CSS/JavaScript

## Requirements

- Node.js 18+
- npm
- Gemini API key

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Configure `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

4. Run the app:

```bash
npm start
```

5. Open in browser:

```text
http://localhost:3000
```

### Development Mode

```bash
npm run dev
```

## Available Scripts

- `npm start` — run `server.js`
- `npm run dev` — run with `nodemon`

## Environment Variables

| Variable         | Required | Default | Description                                             |
| ---------------- | -------: | ------- | ------------------------------------------------------- |
| `GEMINI_API_KEY` |    Yes\* | `null`  | Server-side Gemini key used when user key is not active |
| `PORT`           |       No | `3000`  | Express server port                                     |

\* If server key is missing or exhausted, users can still continue by submitting their own key from the UI.

## API Reference

Base URL: `http://localhost:3000`

### Key Management

| Method   | Endpoint             | Purpose                                    |
| -------- | -------------------- | ------------------------------------------ |
| `GET`    | `/user-key/status`   | Returns whether a valid user key is active |
| `POST`   | `/user-key/validate` | Validates and stores a user key for 1 hour |
| `DELETE` | `/user-key`          | Clears active user key                     |
| `GET`    | `/api-source`        | Returns active source (`server` or `user`) |

`/user-key/*` and `/api-source` expect request header `x-client-id`.

### Generation

| Method | Endpoint    | Purpose                                |
| ------ | ----------- | -------------------------------------- |
| `POST` | `/generate` | Generates or refines UI component code |

Request body (`/generate`):

```json
{
  "prompt": "Create a pricing card with monthly/yearly toggle",
  "currentCode": {
    "html": "...",
    "css": "...",
    "js": "..."
  },
  "history": [{ "content": "Previous prompt" }]
}
```

Response shape:

```json
{
  "html": "<div class=\"dc-pricing\">...</div>",
  "css": ".dc-pricing { ... }",
  "js": "(function(){ ... })();"
}
```

### Sessions

| Method   | Endpoint        | Purpose                       |
| -------- | --------------- | ----------------------------- |
| `POST`   | `/sessions`     | Create a session              |
| `GET`    | `/sessions`     | List sessions (slim metadata) |
| `GET`    | `/sessions/:id` | Get full session data         |
| `PUT`    | `/sessions/:id` | Update session messages       |
| `DELETE` | `/sessions/:id` | Delete one session            |
| `DELETE` | `/sessions`     | Clear all sessions            |

Legacy aliases:

- `GET /history` → redirects to `/sessions`
- `DELETE /history` → clears all sessions

## Project Structure

```text
.
├── data/
│   ├── history.json
│   └── history.backup.json
├── public/
│   ├── favicon.svg
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── .env.example
├── package.json
├── README.md
└── server.js
```

## Data & Persistence

- Server sessions are persisted in `data/history.json`
- Backup is maintained in `data/history.backup.json`
- Old root-level history files are auto-migrated if detected
- User API keys are stored in server memory only and expire after 1 hour

## Troubleshooting

- **`Prompt is required.`**: Ensure prompt text is not empty.
- **`Missing client id.`**: Include `x-client-id` header for key/source endpoints.
- **Quota errors (`429`)**: Use a different Gemini key or wait for quota reset.
- **Server key missing/invalid**: Set `GEMINI_API_KEY` in `.env` or use user key modal.

## License

This project currently has no license file in the repository.
