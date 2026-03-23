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
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Shadcn UI |
| **Backend API** | Node.js (TypeScript), Express/Hono |
| **AI Engine** | Python, FastAPI, PyTorch/TensorFlow |
| **Database** | PostgreSQL + Prisma ORM |
| **Real-time** | Socket.io + Redis Pub/Sub |
| **Infrastructure** | Docker, Docker Compose, AWS S3 |

## 📁 Project Structure

```text
aura/
├── aura-frontend/     # Next.js Dashboard UI
├── aura-backend/      # Node.js Gateway & WebSocket Server
├── aura-ai-worker/    # Python AI Inference Service
├── docker-compose.yml # Orchestration for all services
└── PROJECT_SPEC.md    # Technical specifications & roadmap