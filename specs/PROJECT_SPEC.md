# Project Specification: Aura - AI Unsafe Resource Analyzer

## 1. Project Overview
- **Project Name:** Aura
- **Concept:** A real-time automated system for moderating uploaded images using AI. It detects unsafe content (NSFW, violence, spam) and broadcasts results to a live dashboard.
- **Core Value:** Instant moderation to maintain platform safety with low latency.

## 2. Tech Stack
- **Monorepo & Tooling:** pnpm workspaces, TypeScript 5.x (strict), ESLint + Prettier.
- **Frontend (Dashboard):** Next.js 15 (App Router) + React 19, Tailwind CSS v4, shadcn/ui, `lucide-react`, Zustand (global state), TanStack Query (server state).
- **Backend (Gateway/API):** Node.js 22 LTS + TypeScript, Hono (HTTP API), Socket.io (real-time events), Prisma ORM.
- **AI Worker (Inference):** Python 3.12, FastAPI, Pydantic v2, open-source vision models (NudeNet / Transformers) with optional ONNX Runtime acceleration.
- **Async & Communication Layer:** Redis 7 (Pub/Sub + cache + lightweight queues), WebSockets (`image:processed` events to dashboard).
- **Database:** PostgreSQL 16 + Prisma Migrate.
- **Object Storage:** S3-compatible storage (MinIO for local/dev; cloud S3-compatible in production).
- **Infrastructure & Runtime:** Docker + Docker Compose, environment-based config via `.env`.

## 3. Architecture & Data Flow
- **Workflow:**
  1. **Ingestion:** User/Client uploads an image to the Node.js API.
  2. **Storage:** Image is uploaded to S3-compatible storage; metadata is saved as `PENDING` in PostgreSQL.
  3. **Analysis:** Node.js triggers the Python AI Worker (via HTTP or Queue).
  4. **Processing:** AI Worker analyzes the image and returns a safety score and categories.
  5. **Notification:** Backend updates PostgreSQL and emits a WebSocket event (`image:processed`) to the Dashboard.

## 4. Database Schema (Prisma)
```prisma
model ImageLog {
  id              String     @id @default(uuid())
  imageUrl        String
  sourceId        String?    
  status          ScanStatus @default(PENDING)
  nsfwScore       Float?
  violenceScore   Float?
  rawAiResponse   Json?      
  processedTimeMs Int?       
  createdAt       DateTime   @default(now())
}

enum ScanStatus {
  PENDING
  SAFE
  UNSAFE
  ERROR
}
```

## 5. Coding Rules (Antigravity & Cursor Context)
- **Patterns:** Use "Plan-then-Execute". Always propose a file structure before writing code.
- **Typing:** Strict TypeScript (no `any`). Python Pydantic models for all API schemas.
- **Components:** Atomic design for Shadcn UI components.
- **Error Handling:** Centralized error middleware in Backend; Graceful degradation in Frontend.
- **Performance:** Asynchronous image processing; do not block the main event loop.

## 6. Implementation Roadmap
- [ ] **Phase 1: Workspace Initialization** - Setup Monorepo structure and Docker environment.
- [ ] **Phase 2: Database & Storage** - Configure Prisma, PostgreSQL, and S3 upload logic.