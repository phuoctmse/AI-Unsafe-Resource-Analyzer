# Project Specification: Aura - AI Unsafe Resource Analyzer

## 1. Project Overview
- **Project Name:** Aura
- **Concept:** A real-time automated system for moderating uploaded images using AI. It detects unsafe content (NSFW, violence, spam) and broadcasts results to a live dashboard.
- **Core Value:** Instant moderation to maintain platform safety with low latency.

## 2. Tech Stack
- **Frontend (Dashboard):** Next.js 14 (App Router), Tailwind CSS, Shadcn UI, Lucide Icons.
- **Backend (Gateway):** Node.js (Express or Hono) + TypeScript.
- **AI Worker (Inference):** Python (FastAPI) + Open-source Vision Models (e.g., NudeNet, Transformers).
- **Communication:** WebSockets (Socket.io) + Redis (for Pub/Sub and caching).
- **Database:** PostgreSQL + Prisma ORM.
- **Infrastructure:** Docker & Docker Compose.

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