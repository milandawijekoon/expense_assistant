# Smart Expense Assistant

Type an expense in plain language ("Paid 1800 rupees for lunch at Barista today"). An LLM extracts the
amount, currency, category, merchant and date; the backend validates and saves it. You can browse
transactions, see a monthly dashboard, and ask spending questions in a chat.

- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, PostgreSQL, pandas
- **LLM:** Anthropic or OpenAI, chosen with `LLM_PROVIDER`, using structured JSON output
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Recharts, React Query

```
/backend    FastAPI app, Alembic migrations, pytest suite
/frontend   Next.js app
docker-compose.yml   db + backend + frontend
.env.example         every setting, documented
```

## Quick start (Docker)

```bash
cp .env.example .env
# edit .env: set JWT_SECRET and ANTHROPIC_API_KEY (or LLM_PROVIDER=openai + OPENAI_API_KEY)
docker compose up --build
```

- App: http://localhost:3000
- API docs (Swagger): http://localhost:8000/docs

The backend runs `alembic upgrade head` on start. Create an account on the login page, then add an expense.

`NEXT_PUBLIC_API_URL` is baked into the frontend at build time and must be the address your **browser**
uses for the API. Change it in `.env` and rebuild (`docker compose up --build`) if you don't use localhost.

## Run without Docker

You need PostgreSQL 14+ and a database matching `DATABASE_URL`.

```bash
# backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export $(grep -v '^#' ../.env | xargs)   # or set the variables yourself
alembic upgrade head
uvicorn app.main:app --reload            # http://localhost:8000

# frontend (second terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev   # http://localhost:3000
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | local Postgres | SQLAlchemy URL, `postgresql+psycopg://user:pass@host:5432/db` |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | `expense` | Used by the compose `db` service |
| `JWT_SECRET` | placeholder | **Change it.** `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_EXPIRE_MINUTES` | `60` | Token lifetime |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin(s), comma-separated |
| `LLM_PROVIDER` | `anthropic` | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | – / `claude-sonnet-5-5` | Used when provider is `anthropic` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | – / `gpt-4o-mini` | Used when provider is `openai` |
| `LLM_TIMEOUT_SECONDS` | `30` | Per-request LLM timeout |
| `RATE_LIMIT_ENABLED`, `LLM_RATE_LIMIT` | `true`, `20/minute` | Per-user limit on `/expenses/parse` and `/assistant/chat` |
| `AUTH_RATE_LIMIT` | `10/minute` | Per-IP limit on `/auth/login` and `/auth/register` |
| `DEFAULT_CURRENCY` | `INR` | Currency assumed when none is mentioned |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API address as seen by the browser (build time) |

If the selected provider has no API key, the LLM endpoints return `503 llm_not_configured`; everything else works.

## Example requests

```bash
API=http://localhost:8000

# Register (returns a JWT); use /auth/login for an existing account
TOKEN=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"correct-horse-battery"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
AUTH="Authorization: Bearer $TOKEN"

# Parse natural language (does not save)
curl -s -X POST $API/expenses/parse -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"text":"Paid 1800 rupees for lunch at Barista today"}'
# {"amount":1800.0,"currency":"INR","category":"Food","merchant":"Barista","date":"2026-10-28"}

# Save the parsed expense
curl -s -X POST $API/expenses -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"amount":1800,"currency":"INR","category":"Food","merchant":"Barista","date":"2026-10-28"}'

# List with filters and pagination
curl -s "$API/expenses?month=2026-10&category=Food&page=1&page_size=20" -H "$AUTH"

# Correct a category, then delete
curl -s -X PATCH $API/expenses/<id> -H "$AUTH" -H 'Content-Type: application/json' -d '{"category":"Entertainment"}'
curl -s -X DELETE $API/expenses/<id> -H "$AUTH"

# Monthly summary with comparison to the previous month
curl -s "$API/summary?month=2026-10" -H "$AUTH"

# Ask the assistant
curl -s -X POST $API/assistant/chat -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"message":"How much did I spend on food compared to last month?"}'
```

An unclear message such as "Spent some money yesterday" returns **422**:

```json
{"detail": {"code": "missing_fields", "missing": ["amount", "category"],
            "message": "I couldn't find a valid amount in that message. Please include the amount and the category, ..."}}
```

Other statuses: `401` not logged in, `404` expense not found (or not yours), `429` rate limited,
`502` LLM provider failed, `503` LLM not configured.

## How it works

- **Parsing:** only the user's text, today's date and the default currency go to the LLM. The result is
  validated again in code (positive amount, known category, sane date) before anything is saved.
- **Assistant:** the LLM never sees your database. It first turns the question into a small intent
  (`compare_months`, `spending_total`, `category_breakdown`), the backend computes the numbers with
  pandas for the logged-in user only, and the LLM then words a reply from those numbers. Percentages
  and the suggested budget (last month + 5%, only when spending rose) are calculated in code.
- **Currencies:** totals use your default currency. Expenses in other currencies are saved and listed
  separately on the dashboard rather than converted.
- **Security:** bcrypt password hashing, JWT auth, every query filtered by `user_id`, CORS limited to
  `FRONTEND_ORIGIN`, per-user rate limits on LLM endpoints, and API keys/bearer tokens redacted from logs.

## Tests

```bash
cd backend && pytest -q          # LLM is mocked; uses in-memory SQLite by default
TEST_DATABASE_URL=postgresql+psycopg://expense:expense@localhost:5432/expense_test pytest -q   # against Postgres

cd frontend && npm run typecheck && npm run lint && npm run build
```

GitHub Actions (`.github/workflows/ci.yml`) runs ruff, the migrations (up and down) and pytest against
Postgres, plus the frontend typecheck, lint and build.

## Known limitations

- The JWT is kept in `localStorage` (simple, but readable by any XSS). For stricter setups, switch to an
  httpOnly cookie.
- Rate limiting is in memory, so it is per backend process. Use Redis if you run several replicas.
- "Today" and month boundaries use the server's date, not the user's timezone.
- Chat history is not stored; the browser sends the last few turns with each question.
