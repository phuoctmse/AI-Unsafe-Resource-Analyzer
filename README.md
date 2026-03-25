# 🛡️ Aura - AI Unsafe Resource Analyzer

**Aura** is a high-performance, real-time content moderation system designed to automatically detect and filter unsafe image content (NSFW, violence, spam). Built with a microservices architecture, it ensures platform safety with sub-second latency.

---

## 🚀 Key Features

* **Real-time Moderation:** Instant image analysis using WebSockets (Socket.io).
* **AI-Powered Detection:** Leverages Python-based Vision models (NudeNet/Transformers) for high accuracy.
* **Live Admin Dashboard:** A sleek, reactive interface to monitor incoming streams and alerts.
* **Scalable Architecture:** Decoupled Node.js Gateway and Python AI Workers.
* **Comprehensive Logging:** Detailed audit trails for every scanned resource.
* **Observability-ready logs:** Backend/worker emit single-line JSON logs to stdout (Loki-friendly).

## 🏗️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui, lucide-react |
| **Backend API** | Node.js 22 LTS, TypeScript, Hono, Prisma ORM, Socket.io |
| **AI Engine** | Python 3.12, FastAPI, Pydantic v2, NudeNet/Transformers (optional ONNX Runtime) |
| **Database** | PostgreSQL 16 + Prisma |
| **Real-time / Async** | Redis 7 (Pub/Sub + cache + lightweight queues) |
| **Infrastructure** | Docker, Docker Compose, S3-compatible storage (MinIO for local dev) |

## 📁 Project Structure

```text
aura/
├── aura-frontend/       # Next.js Dashboard UI
├── aura-backend/        # Node.js API Gateway + Socket.io
├── aura-ai-worker/      # Python AI inference service
├── specs/
│   └── PROJECT_SPEC.md  # Technical specifications & roadmap
├── docker-compose.yml   # Local infra orchestration
└── .cursorrules         # Project coding/agent conventions
```

## ⚙️ Development Setup

### Prerequisites
- Node.js 22 LTS
- pnpm 10+
- Python 3.12
- Docker Desktop

### Install dependencies

```bash
# Node.js workspaces
pnpm install

# Python worker dependencies
cd aura-ai-worker
python -m pip install -r requirements.txt
```

### Start local infrastructure (Phase 2)

```bash
docker compose up -d
```

### Prisma setup

```bash
# Ensure aura-backend/.env contains DATABASE_URL
pnpm --filter aura-backend prisma:validate
pnpm --filter aura-backend prisma:generate
pnpm --filter aura-backend exec prisma migrate dev --name init_imagelog
```

### Storage upload API (current)

```bash
POST /uploads/presign
```

Request body:

```json
{
  "filename": "sample.jpg",
  "contentType": "image/jpeg"
}
```

Response includes:
- `imageId` (UUID)
- `key` (object key in MinIO/S3 bucket)
- `uploadUrl` (presigned `PUT` URL, 5 min expiry)
- `imageUrl` (final object URL)

### Upload completion (enqueue scan)

After the client successfully uploads the bytes to `uploadUrl`, call:

```bash
POST /uploads/complete
```

Request body:

```json
{
  "imageId": "UUID-from-presign",
  "key": "object-key-from-presign"
}
```

### Logs (for Loki/Grafana later)
- The backend (`aura-backend`) and worker (`aura-ai-worker`) emit **single-line JSON logs** to stdout.
- Presigned `uploadUrl` values are **not** logged (they contain signatures).

### AI worker skeleton (current)
- Worker consumes tasks and updates the DB by calling:
  - `POST /internal/images/:id/processed`
- Worker also exposes:
  - `GET /health`
  - `POST /analyze` (manual smoke test; bypasses Redis queue)

### Quick troubleshooting
- If Docker images fail to pull with EOF/auth errors, retry after Docker Hub connectivity is restored.
- If Prisma shows `P1000` auth errors, update `aura-backend/.env` `DATABASE_URL` with valid local PostgreSQL credentials.

## 📌 Notes
- This repository follows a monorepo structure with independent services.
- Real-time moderation updates are emitted to dashboard clients via `image:processed` events.
- See `specs/PROJECT_SPEC.md` for architecture, data flow, and roadmap.

## 📚 Documentation Strategy
- `README.md` is the **repository-facing document**: vision, architecture snapshot, stack, setup, and how to run.
- `specs/PROJECT_SPEC.md` is the **implementation source of truth**: detailed architecture decisions, security/ops requirements, and task roadmap.
- Any roadmap/status changes should be updated in `specs/PROJECT_SPEC.md` first, then reflected in `README.md` as a concise summary.