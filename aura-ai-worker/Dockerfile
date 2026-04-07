FROM python:3.12-slim-bookworm AS builder

WORKDIR /opt/app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip

COPY aura-ai-worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY aura-ai-worker ./

FROM python:3.12-slim-bookworm AS runner

RUN groupadd --gid 10001 app \
  && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
  && mkdir -p /app/model-cache \
  && chown -R app:app /app/model-cache

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/app/model-cache \
    TRANSFORMERS_CACHE=/app/model-cache \
    XDG_CACHE_HOME=/app/model-cache

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder --chown=app:app /opt/app /app

USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
