# SharedMemoryLocalDB

A lightweight local API server that gives your custom GPTs persistent memory across sessions. Each GPT writes to its own named **namespace** — a JSON file on disk — and can read it back in any future session.

Built with Node.js + Express + TypeScript. Secured with OAuth 2.0 Client Credentials (compatible with OpenAI GPT Actions).

---

## How it works

```
GPT Action  →  POST /oauth/token         →  JWT access token
GPT Action  →  POST /api/namespaces/my-gpt  →  append a memory entry
GPT Action  →  GET  /api/namespaces/my-gpt  →  retrieve all entries
```
Flow high level explanation
── ONE-TIME SETUP (first use per device) ──────────────────────────

You open ChatGPT → it redirects your browser to ngrok → your server
    │
    │  "Here's a one-time code, send it back to ChatGPT"
    ▼
ChatGPT exchanges the code for a JWT token
    │
    │  "I'll keep this token and reuse it from now on"
    ▼
Token stored by ChatGPT (valid for 1 hour, then re-fetched silently)

── EVERY SAVE ─────────────────────────────────────────────────────

ChatGPT decides something is worth remembering
    │  HTTPS + JWT token — internet
    ▼
ngrok (cloud relay)
    │  HTTP — your local network
    ▼
Your Express server — checks token, appends entry
    │  file write
    ▼
data/namespace.json (your disk)

── EVERY LOAD ─────────────────────────────────────────────────────

New chat session starts → GPT fetches previous memories
    │  HTTPS + JWT token — internet
    ▼
ngrok (cloud relay)
    │  HTTP — your local network
    ▼
Your Express server — checks token, reads file
    │  returns JSON array of all past entries
    ▼
ChatGPT receives the entries, summarizes them into context
    │
    ▼
You — the GPT already "knows" everything it previously saved


Each namespace is stored as a plain JSON file at `data/<name>.json`. Entries are append-only — every write adds a new record with a UUID and timestamp. The payload is whatever JSON the GPT sends.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-03-07T14:00:00.000Z",
    "payload": {
      "fact": "User prefers metric units",
      "category": "preferences"
    }
  }
]
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATA_DIR=./data

OAUTH_CLIENT_ID=my-gpt-client
OAUTH_CLIENT_SECRET=choose-a-strong-secret

JWT_SECRET=choose-a-long-random-string
JWT_EXPIRES_IN=3600
```

### 3. Run

**Development** (hot reload):
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

---

## API Reference

### `POST /oauth/token`

Issues a JWT access token. Send as `application/x-www-form-urlencoded`.

**Request:**
```
grant_type=client_credentials&client_id=my-gpt-client&client_secret=...
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### `GET /api/namespaces/:name`

Returns all entries in the namespace. Returns an empty list if the namespace doesn't exist yet.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "namespace": "my-gpt",
  "entries": [
    {
      "id": "uuid",
      "timestamp": "2026-03-07T14:00:00.000Z",
      "payload": { "note": "hello" }
    }
  ]
}
```

---

### `POST /api/namespaces/:name`

Appends a new entry. Creates the namespace file if it doesn't exist.

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Body:** Any JSON object.

**Response (201):**
```json
{
  "id": "uuid",
  "timestamp": "2026-03-07T14:00:00.000Z",
  "payload": { "note": "hello" }
}
```

Namespace names may only contain letters, numbers, hyphens, and underscores.

---

## Deployment model

Each user runs their own server instance on their own machine. User isolation is provided by deployment — separate `data/` directories, separate credentials, and separate tunnel URLs. No shared server, no user registration.

Use a distinct namespace name per GPT to keep memories separate (e.g. `cooking-gpt`, `code-assistant`).

---

## Connecting to a Custom GPT

GPT Actions require a public HTTPS URL. Use **ngrok** with a free static domain — the URL never changes, so GPT Builder is configured once and never touched again.

### One-time ngrok setup

1. Create a free account at https://ngrok.com
2. Copy your auth token from the ngrok dashboard and run:
   ```bash
   ngrok config add-authtoken <your-token>
   ```
3. In the ngrok dashboard → **Domains** → claim your free static domain (e.g. `yourname.ngrok-free.app`)
4. Update `openapi.yaml` — replace the host in both `servers[0].url` and `tokenUrl` with your static domain

### Steps in GPT Builder (one-time per GPT)

1. Go to **Configure → Actions → Create new action**
2. Paste the contents of [`openapi.yaml`](openapi.yaml) into the schema field
3. Set **Authentication** to **OAuth**
4. Fill in:
   - **Client ID** — matches `OAUTH_CLIENT_ID` in `.env`
   - **Client Secret** — matches `OAUTH_CLIENT_SECRET` in `.env`
   - **Token URL** — `https://<your-static-domain>/oauth/token`
   - **Token Exchange Method** — POST request body
5. Leave **Scope** empty
6. Save and test

### Running the tunnel

```bash
ngrok http --domain=yourname.ngrok-free.app 3000
```

The URL never changes — GPT Builder needs no updates after initial setup.

### GPT system prompt example

```
You have access to a persistent memory store via the SharedMemoryLocalDB actions.
Your namespace is "my-gpt-name".

At the start of each conversation, call getNamespace to recall relevant context.
When the user shares important preferences, facts, or decisions, call appendEntry to store them.

Store entries as JSON objects with descriptive fields, for example:
{ "type": "preference", "detail": "User prefers concise answers" }
```

---

## Smoke test with curl

```bash
# 1. Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/oauth/token \
  -d "grant_type=client_credentials&client_id=my-gpt-client&client_secret=supersecretvalue" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).access_token))")

# 2. Write an entry
curl -X POST http://localhost:3000/api/namespaces/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "hello from GPT", "category": "test"}'

# 3. Read all entries
curl http://localhost:3000/api/namespaces/test \
  -H "Authorization: Bearer $TOKEN"
```

---

## Project structure

```
src/
├── index.ts                  # Entry point
├── app.ts                    # Express app (routes, middleware, error handler)
├── config.ts                 # Env validation
├── routes/
│   ├── auth.ts               # POST /oauth/token
│   └── namespaces.ts         # GET/POST /api/namespaces/:name
├── middleware/
│   └── authenticate.ts       # JWT bearer verification
└── services/
    ├── tokenService.ts       # Issue and verify JWTs
    └── namespaceService.ts   # Read/write namespace JSON files
data/                         # Runtime storage (gitignored)
openapi.yaml                  # GPT Action schema
```
