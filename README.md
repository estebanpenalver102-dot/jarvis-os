# JARVIS OS v9.0

Autonomous Operating System for E.

## Stack
- **Runtime**: Node.js 20 on Fly.io
- **Database**: PostgreSQL + pgvector
- **AI**: OpenAI (ExecutivePlanner)
- **Interfaces**: Telegram + REST API + Dashboard

## Endpoints
- `GET /health`
- `GET /api/brain/status`
- `POST /api/memory/store`
- `GET /api/memory/search`
- `GET/POST /api/projects`
- `GET/POST /api/tasks`
- `GET /api/delegations`
- `GET/POST /api/knowledge-graph`
- `GET /api/system-health`

## Deploy
```bash
flyctl deploy
```
