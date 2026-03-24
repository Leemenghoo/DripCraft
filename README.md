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
- **Session history persisted in MongoDB Atlas** (survives restarts and deploys)

## Tech Stack

- **Backend:** Node.js, Express, CORS, dotenv
- **AI:** `@google/generative-ai` (Gemini)
- **Database:** MongoDB (via `mongodb` native driver)
- **Formatting:** `js-beautify`
- **Frontend:** Vanilla HTML/CSS/JavaScript

## Requirements

- Node.js 18+
- npm
- Gemini API key
- MongoDB Atlas account (free M0 cluster)

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
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
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

## MongoDB Atlas Setup

> Sessions are stored in MongoDB Atlas. The free **M0 cluster** is sufficient and never expires.

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up (free).
2. Create a **free M0 cluster** (choose any region).
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` to allow connections from Render (or any IP).
5. Click **Connect** on your cluster → **Drivers** → copy the connection string.
6. Replace `<user>` and `<password>` in the string with your database user credentials.
7. Add the full URI as `MONGODB_URI` in your `.env` (local) and as an environment variable on Render.

The app will automatically create the `dripcraft` database and a `sessions` collection on first run.

> **Note:** If `MONGODB_URI` is not set, the app still runs normally — it just won't persist sessions between restarts (a warning will be shown in the console).

## Deploying to Render

1. Push your code to GitHub.
2. On [render.com](https://render.com), create a new **Web Service** and connect your repo.
3. Set the following environment variables in Render's dashboard:
   - `GEMINI_API_KEY` — your Gemini API key
   - `MONGODB_URI` — your MongoDB Atlas connection string
4. Set the **Start Command** to `npm start`.
5. Deploy — sessions will now persist across restarts and deploys.

## Available Scripts

- `npm start` — run `server.js`
- `npm run dev` — run with `nodemon`

## Environment Variables

| Variable         | Required | Default | Description                                             |
| ---------------- | -------: | ------- | ------------------------------------------------------- |
| `GEMINI_API_KEY` |    Yes\* | `null`  | Server-side Gemini key used when user key is not active |
| `MONGODB_URI`    |    Yes\* | `null`  | MongoDB Atlas connection string for session storage     |
| `PORT`           |       No | `3000`  | Express server port                                     |

\* The app runs without these but with reduced functionality (no AI / no persistent sessions).

## API Reference

Base URL: `http://localhost:3000`

### Key Management

| Method   | Endpoint             | Purpose                                    |
| -------- | -------------------- | ------------------------------------------ |
| `GET`    | `/user-key/status`   | Returns whether a valid user key is active |
| `POST`   | `/user-key/validate` | Validates and stores a user key for 1 hour |
| `DELETE` | `/user-key`          | Clears active user key                     |
| `GET`    | `/api-source`        | Returns active source (`server` or `user`) |

### Generation

| Method | Endpoint    | Purpose                                |
| ------ | ----------- | -------------------------------------- |
| `POST` | `/generate` | Generates or refines UI component code |

Request body (`/generate`):

```json
{
  "prompt": "Create a pricing card with monthly/yearly toggle",
  "currentCode": { "html": "...", "css": "...", "js": "..." },
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

> The `data/` directory is no longer used. Sessions are stored in MongoDB.

## Troubleshooting

- **`Prompt is required.`**: Ensure prompt text is not empty.
- **`Missing client id.`**: Include `x-client-id` header for key/source endpoints.
- **Quota errors (`429`)**: Use a different Gemini key or wait for quota reset.
- **Server key missing/invalid**: Set `GEMINI_API_KEY` in `.env` or use user key modal.
- **Sessions not persisting**: Ensure `MONGODB_URI` is set and the MongoDB Atlas IP allowlist includes `0.0.0.0/0`.

## License

This project currently has no license file in the repository.
