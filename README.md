# AI Banking POC

UK banking demo (dummy data only) with a RAG-powered, read-only AI assistant.
Stack: React + Node.js (Express) + TypeScript + PostgreSQL/pgvector + Cloudflare Workers AI.

## Diagrams

- [Flow & architecture](docs/diagrams/1-flow-architecture.png)
- [High level design (HLD)](docs/diagrams/2-hld.png)
- [Low level design (LLD)](docs/diagrams/3-lld.png)

Each also has an editable `.svg` next to it.

## Quick start (from the repo root)

```bash
npm run install:all                 # installs root, backend and frontend
# create backend/.env from backend/.env.example first
npm run db:up                       # Postgres 18 + pgvector in Docker on localhost:5433
npm run db:migrate
npm run db:seed
npm run dev                         # backend :4000 + frontend :5173 together
```

## Backend setup

Prerequisites: Node 20+, local PostgreSQL with the `vector` extension available.

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, CF_ACCOUNT_ID, CF_API_TOKEN
npm install
npm run db:migrate -- --name init   # creates the DB, tables and the vector extension
npm run db:seed                     # dummy users, cards, transactions, documents
npm run dev                         # http://localhost:4000
```

Seeded logins: `admin / admin123` (admin), `alice / password123`, `bob / password123`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173 (calls the backend at VITE_API_URL, default http://localhost:4000)
```

Pages: **POS Simulation** (cards, card transactions, "Simulate random purchase", Pay to, history),
**Test Users** (admin: create users), **Documents** (upload .txt/.md for RAG), **AI Assistant** (chat).

## API

All routes except `/auth/login` need `Authorization: Bearer <token>`.

| Method | Route | Notes |
|---|---|---|
| POST | /auth/login | `{ username, password }` → `{ token, user }` |
| GET | /auth/me | Current user |
| POST | /users | Admin: create test user |
| GET | /users | Admin: list users |
| GET | /users/:id | Self or admin |
| POST | /cards | `{ cardType, userId? }` |
| GET | /cards | `?userId=` (admin) |
| POST | /transactions | `{ cardId, type: DEBIT\|CREDIT, amount, description, merchant? }` — updates balance |
| GET | /transactions | `?cardId&type&from&to&limit&userId` |
| POST | /transfers | Pay to: `{ toUsername, amount, description? }` |
| GET | /transfers | Sent and received |
| POST | /documents | multipart `file` (.txt/.md) + `visibility: PUBLIC\|PRIVATE` |
| GET | /documents | Docs visible to you |
| POST | /chat | `{ message, history? }` → `{ answer, toolsUsed, sources }` |

## Access rules

- Users see only their own cards, transactions, transfers and PRIVATE documents; admins see all.
- RAG search filters by access in SQL: `PUBLIC` docs + the user's own `PRIVATE` docs.
- AI tools are read-only and always use the logged-in user's id from the JWT, never from the model.

## AI tools (v1, read-only)

`get_my_profile`, `list_my_cards`, `get_my_transactions`, `get_my_transfers`, `search_documents`.
