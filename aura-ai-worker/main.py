from fastapi import FastAPI

app = FastAPI(title="Aura AI Worker")


@app.get("/health")
async def health() -> dict:
    return {"success": True, "data": {"service": "aura-ai-worker", "status": "ok"}}
