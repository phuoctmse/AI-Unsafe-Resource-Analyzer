# 🛡️ Aura - AI Unsafe Resource Analyzer

**Aura** is a high-performance, real-time content moderation system designed to automatically detect and filter unsafe image content (NSFW, violence, spam). Built with a microservices architecture, it ensures platform safety with sub-second latency.

---

## 🚀 Key Features

* **Real-time Moderation:** Instant image analysis using WebSockets (Socket.io).
* **AI-Powered Detection:** Leverages Python-based Vision models (NudeNet/Transformers) for high accuracy.
* **Live Admin Dashboard:** A sleek, reactive interface to monitor incoming streams and alerts.
* **Scalable Architecture:** Decoupled Node.js Gateway and Python AI Workers.
* **Comprehensive Logging:** Detailed audit trails for every scanned resource.

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

## 📌 Notes
- This repository follows a monorepo structure with independent services.
- Real-time moderation updates are emitted to dashboard clients via `image:processed` events.
- See `specs/PROJECT_SPEC.md` for architecture, data flow, and roadmap.