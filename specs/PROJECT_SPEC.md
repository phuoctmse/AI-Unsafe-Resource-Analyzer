# Project Specification: Aura - AI Unsafe Resource Analyzer (Full Edition)

## 1. Solution Architecture Discussion
- **Pattern:** Event-Driven Microservices with Asynchronous Processing.
- **Rationale:** High-concurrency I/O handled by Node.js (Hono) and heavy CPU/GPU computation delegated to Python (FastAPI).
- **Decoupling:** Uses Redis as a message broker to ensure system resilience and handle traffic spikes.



## 2. High-Level Design (HLD)
- **Flow:** User -> Nginx Proxy -> Hono API -> S3 Storage & Redis Queue -> Python Worker (ONNX Inference) -> PostgreSQL -> Socket.io Broadcast -> Next.js Dashboard.

## 3. Service Description
- **Aura-Gateway (Hono/Node.js 22):** Manages REST endpoints, JWT authentication, file upload validation, and WebSocket state.
- **Aura-Worker (FastAPI/Python 3.12):** Dedicated AI service. Pulls tasks from Redis, performs image classification, and updates results.
- **Aura-Dashboard (Next.js 15):** Real-time monitoring UI with administrative controls and moderation logs.

## 4. Network Design
- **Segmentation:** Public Subnet (Nginx, Frontend) and Private Subnet (API Gateway, AI Worker, Redis, PostgreSQL).
- **Service Discovery:** Internal DNS resolution within Docker/Kubernetes cluster.

## 5. Security Design (DevSecOps)
- **Identity:** JWT-based Authentication with Role-Based Access Control (RBAC).
- **Traffic:** End-to-end encryption via TLS (HTTPS/WSS).
- **Infrastructure Security:** S3 Presigned URLs, Rate limiting (10 req/s), and Trivy vulnerability scanning.

## 6. Operations & Monitoring Design
- **Observability:** Prometheus metrics (latency/queue depth), Structured JSON logging, and OpenTelemetry tracing.
- **Health Checks:** Liveness/Readiness probes on all containers.

## 7. Disaster Recovery Design (DR)
- **Backup:** Daily automated snapshots for PostgreSQL.
- **Resilience:** Stateless design for instant recovery; Redis persistence (AOF/RDB) enabled.

## 8. Performance & Scalability
- **Horizontal Scaling:** Auto-scaling AI Workers based on Redis queue length.
- **Optimization:** ONNX Runtime (sub-500ms latency), Content-addressable hashing for duplicate images.

## 9. DevOps, CI/CD & IaC
- **IaC:** Terraform v1.7+ for AWS (VPC, S3, RDS, ECS).
- **CI/CD:** GitHub Actions for linting, testing, and multi-stage Docker builds.

## 10. Coding Rules (Antigravity & Cursor Context)
- **Patterns:** Use **"Plan-then-Execute"**. Always propose a file structure before writing code.
- **Typing:** Strict TypeScript (no `any`). Python Pydantic models (v2) for all API schemas.
- **Components:** **Atomic Design** for Shadcn UI components.
- **Error Handling:** Centralized error middleware in Hono (Backend); Graceful degradation/Error Boundaries in Next.js (Frontend).
- **Performance:** Asynchronous image processing; strictly do not block the main event loop.

## 11. Implementation Roadmap
- [x] **Phase 1: Workspace Initialization** - Setup pnpm monorepo and baseline service skeletons (frontend/backend/worker). Docker Compose and Terraform base pending in next phase.
- [x] **Phase 2: Database & Storage** - Prisma migration applied, PostgreSQL/Redis/MinIO wired in Docker Compose, and backend presigned upload endpoint implemented.
- [x] **Phase 3: AI Inference Worker** - Implement Redis task consumer skeleton with deterministic mock inference and backend processed callback update.
- [x] **Phase 4: Real-time Gateway** - Implement Hono API, Socket.io, and Redis Queue integration (upload completion -> Redis scan orchestration).
- [ ] **Phase 5: Aura Dashboard** - Create Next.js 15 UI with real-time stream updates and Shadcn components.
- [ ] **Phase 6: DevOps & Security** - Setup GitHub Actions, Trivy scan, and Rate limiting.

## 12. Task Tracking Policy
- **Canonical tracker:** This file (`specs/PROJECT_SPEC.md`) is the single source of truth for task progress.
- **README policy:** `README.md` stays repository-facing and should contain only summarized roadmap/status.
- **Update rule:** When a phase status changes, update this roadmap first, then sync any high-level summary in `README.md`.

## 13. Current Execution Notes
- **Phase 2 status:** Completed.
- **Completed items:**
  1. Prisma schema + migration (`init_imagelog`) applied to local PostgreSQL.
  2. Docker Compose services running with health checks (`postgres`, `redis`, `minio`).
  3. Backend `POST /uploads/presign` endpoint implemented:
     - creates `ImageLog` in `PENDING`
     - returns MinIO presigned `PUT` URL and `imageUrl`.
- **Important local note:** PostgreSQL host port mapped to `5433` to avoid host-level conflicts on `5432`.

- **Phase 3 status:** Completed (skeleton).
- **Completed items (Phase 3):**
  1. Backend enqueues scan tasks to Redis list key `aura:scanQueue`.
  2. Worker consumes tasks via Redis `BLPOP`, runs deterministic mock inference (no model downloads), and calls:
     - `POST /internal/images/:id/processed`
  3. Backend updates `ImageLog` status (`SAFE|UNSAFE|ERROR`) and emits `image:processed`.

- **Phase 4 status:** Completed (queue orchestration trigger).
- **Phase 4 slice implemented:** `POST /uploads/complete` now requires `key`, verifies object existence in S3/MinIO via `HeadObject`, and enqueues the scan task to Redis (enqueue removed from `POST /uploads/presign`).

---

## Technical Stack Summary
- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, Zustand.
- **Backend:** Hono (Node.js 22), Prisma ORM, Socket.io.
- **AI Worker:** FastAPI (Python 3.12), ONNX Runtime.
- **Persistence:** PostgreSQL 16, Redis 7, MinIO (S3-compatible).

## Database Schema (Prisma)
```prisma
model ImageLog {
  id              String     @id @default(uuid())
  imageUrl        String
  status          ScanStatus @default(PENDING)
  nsfwScore       Float?
  violenceScore   Float?
  processedTimeMs Int?       
  createdAt       DateTime   @default(now())
}

enum ScanStatus { PENDING, SAFE, UNSAFE, ERROR }
```