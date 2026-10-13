# payments-web

Demo project for the AI-Assisted SDLC platform. It starts empty (greenfield): the platform's
`greenfield-frontend` workflow builds the app from Jira stories in project SDLC, one pull request
per story.

Project conventions the platform applies live in `.sdlc/skills/`.

## Run it locally

Needs Node 24 or later (the API runs its TypeScript directly).

```bash
npm install
npm run dev:api   # login API on http://localhost:3001 (set API_PORT to change it)
npm run dev       # web app on http://localhost:5173; /api is proxied to the login API
```

Sign in with the demo account **admin** / **admin** (SDLC-47). It is a dummy account for the demo,
not a real credential.

| Command                              | What it does                                               |
| ------------------------------------ | ---------------------------------------------------------- |
| `npm test`                           | Unit (jsdom), API (real HTTP) and browser (Chromium) tests |
| `npm run test:coverage`              | The same, with coverage for `src/` and `backend/`          |
| `npm run build`                      | Type-checks and builds the web app into `dist/`            |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks                                 |

### Login API

`POST /api/auth/login` with JSON `{ "username": "…", "password": "…" }`:

| Status                      | Body                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| 200                         | `{ "token": "…", "user": { "username": "admin" } }`                                             |
| 400                         | `{ "error": { "code": "validation_error" \| "invalid_json", "message": "…", "fields"?: {…} } }` |
| 401                         | `{ "error": { "code": "invalid_credentials", "message": "Invalid username or password." } }`    |
| 404 / 405 / 413 / 415 / 500 | `{ "error": { "code": "…", "message": "…" } }`                                                  |
