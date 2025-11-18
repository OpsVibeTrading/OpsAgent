# Vibe Trading Agent

Use LLM to trade futures on AsterDex.

## Tech Stack

- Express
- PostgreSQL
- Redis
- BullMQ
- Langfuse
- Vercel AI SDK

---

## Getting Started

### Prerequisites

- Docker Compose

### Environment Variables

Prepare the following environment variables:

- **LLM**: `OPENROUTER_API_KEY`
- **Search**: `SERPER_API_KEY`
- **Aster Trading API**: `ASTER_TRADING_BASE_URL`, `ASTER_PUBLIC_API_KEY`
- **Tracing**: `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_HOST`

### Build & Run with Docker Compose

```bash
# Configure environment variables
cp .env.example .env.prod

# Build & Run
docker compose -f build/dev/docker-compose.yml up -d
```

Server will run at: [http://localhost:3000](http://localhost:3000) (or your configured port)

---

## User Guide

1. Create a portfolio with Aster credentials: `POST /api/v1/portfolio`
2. Bootstrap agent: `POST /api/v1/agent/:agentId/bootstrap`
3. Schedule agent with cron: `POST /api/v1/agent/:agentId/schedule`
4. Check agent activities: `GET /api/v1/agent/:agentId/activities`

## API Documentation

Available at: [docs/openapi.yaml](docs/openapi.yaml)