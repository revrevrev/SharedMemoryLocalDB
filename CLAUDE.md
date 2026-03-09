# CLAUDE.md — SharedMemoryLocalDB

## What this project is

A local Node.js + Express + TypeScript API server that gives custom GPTs (OpenAI GPT Actions) persistent memory across sessions. Each GPT writes to a named **namespace** — stored as a JSON file on disk — and reads it back in any future session.
Important: The custom GPT should remain stable and not have to be reconfigured to update stuff like URLs, tokens etc. The solution shouldn't break this assumption.

## Tech stack

- **Runtime**: Node.js + Express + TypeScript
- **Auth**: OAuth 2.0 Client Credentials → JWT bearer token
- **Storage**: Local JSON files in `data/` (one file per namespace, append-only)
- **Dev server**: `ts-node-dev` (hot reload)

## Commands

```bash
npm run dev      # start with hot reload (development)
npm run build    # compile TypeScript → dist/
npm start        # run compiled output (production)
```

## Project structure
```
src/
├── index.ts                  # Entry point — loads config, starts server
├── app.ts                    # Express app — mounts routes, middleware, error handler
├── config.ts                 # Reads + validates all env vars at startup
├── routes/
│   ├── auth.ts               # POST /oauth/token
│   └── namespaces.ts         # GET/POST /api/namespaces/:name
├── middleware/
│   └── authenticate.ts       # JWT bearer token verification
└── services/
    ├── tokenService.ts       # issueToken() / verifyToken()
    └── namespaceService.ts   # readNamespace() / appendEntry()
data/                         # Runtime namespace JSON files (gitignored, auto-created)
openapi.yaml                  # OpenAPI schema for GPT Action registration
.env                          # Secrets (gitignored — copy from .env.example)
TODO.md                       # Manual setup tasks for the owner
README.md                     # Full documentation
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/oauth/token` | None | Client credentials → JWT |
| GET | `/api/namespaces/:name` | Bearer JWT | Read all entries in namespace |
| POST | `/api/namespaces/:name` | Bearer JWT | Append new entry to namespace |

Token request body is `application/x-www-form-urlencoded`:
```
grant_type=client_credentials&client_id=...&client_secret=...
```

## Environment variables

All defined in `src/config.ts`. The app throws a clear error at startup if any required var is missing.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 3000) | TCP port |
| `DATA_DIR` | No (default: ./data) | Path to namespace file directory |
| `OAUTH_CLIENT_ID` | Yes | Client ID for token requests |
| `OAUTH_CLIENT_SECRET` | Yes | Client secret for token requests |
| `JWT_SECRET` | Yes | HMAC-SHA256 signing key for JWTs |
| `JWT_EXPIRES_IN` | No (default: 3600) | Token lifetime in seconds |

## Namespace file format

Each namespace is stored at `data/<name>.json` as a JSON array:

```json
[
  {
    "id": "uuid-v4",
    "timestamp": "2026-03-07T14:00:00.000Z",
    "payload": { "any": "json object" }
  }
]
```

- `id` and `timestamp` are always injected server-side — clients cannot override them
- `payload` is the raw request body the GPT sends
- Files are append-only — entries are never deleted or updated
- Namespace names: `^[a-zA-Z0-9_-]+$` only (enforced to prevent path traversal)

## Key design decisions

- **One instance per user** — each user runs their own server locally; isolation between users is provided by deployment (separate `data/` dirs, separate credentials, separate tunnel URLs), not by the API
- **Namespace = GPT identity** — use a distinct namespace per GPT to keep memories separate (e.g. `cooking-gpt`, `code-assistant`)
- **Synchronous fs** — single-process local tool; sync read-modify-write is safe and simple
- **No database** — plain JSON files are human-readable, easy to back up, and zero-dependency
- **`express-async-errors`** — eliminates try/catch boilerplate in async route handlers
- **`express.urlencoded()`** — required alongside `express.json()` because the OAuth token endpoint receives `application/x-www-form-urlencoded` bodies (OAuth 2.0 spec)
- **Namespace name validation** — guards against path traversal via the `:name` route param

## Connecting to GPT Actions

Use **ngrok with a free static domain** — the URL never changes, no domain purchase needed:

1. Create account at ngrok.com → claim one free static domain → `ngrok config add-authtoken <token>`
2. Update both URLs in `openapi.yaml` (`servers[0].url` and `tokenUrl`) with the static domain
3. In GPT Builder → Actions: paste `openapi.yaml`, set auth to OAuth / Client Credentials / POST body
4. To run: `ngrok http --domain=yourname.ngrok-free.app 3000`

The ngrok interstitial only affects browser visits — ChatGPT's server-to-server API calls bypass it.
A `GET /` health check route exists in `app.ts` to satisfy any reachability checks ChatGPT performs.

## Files NOT to modify carelessly

- `openapi.yaml` — must stay valid OpenAPI 3.1 and match the actual route/auth implementation or GPT Actions will break
- `src/config.ts` — all other files import config from here; changes affect the whole app
- `src/services/namespaceService.ts` — core persistence logic; bugs here corrupt data files
