import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    redis_url: str
    scan_queue_key: str
    backend_url: str
    internal_api_key: str
    model_version: str
    label_set_version: str
    thresholds_version: str
    worker_version: str
    unsafe_threshold: float
    use_mock_inference: bool
    clip_model_id: str
    s3_endpoint: str
    s3_region: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str
    max_image_side: int
    inference_timeout_s: float
    download_timeout_s: float
    max_concurrent_inference: int
    backend_callback_retries: int


def load_settings() -> Settings:
    return Settings(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        scan_queue_key=os.getenv("SCAN_QUEUE_KEY", "aura:scanQueue"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:3001"),
        internal_api_key=os.getenv("INTERNAL_API_KEY", "aura-internal-api-key"),
        model_version=os.getenv("MODEL_VERSION", "openai/clip-vit-base-patch32"),
        label_set_version=os.getenv("LABEL_SET_VERSION", "aura-labels-v1"),
        thresholds_version=os.getenv("THRESHOLDS_VERSION", "aura-thresholds-v1"),
        worker_version=os.getenv("WORKER_VERSION", "dev"),
        unsafe_threshold=float(os.getenv("UNSAFE_THRESHOLD", "0.22")),
        use_mock_inference=os.getenv("USE_MOCK_INFERENCE", "false").lower() in ("1", "true", "yes"),
        clip_model_id=os.getenv("CLIP_MODEL_ID", "openai/clip-vit-base-patch32"),
        s3_endpoint=os.getenv("S3_ENDPOINT", "http://localhost:9000"),
        s3_region=os.getenv("S3_REGION", "us-east-1"),
        s3_access_key=os.getenv("S3_ACCESS_KEY", "aura"),
        s3_secret_key=os.getenv("S3_SECRET_KEY", "aurasecret"),
        s3_bucket=os.getenv("S3_BUCKET", "aura-images"),
        max_image_side=int(os.getenv("MAX_IMAGE_SIDE", "512")),
        inference_timeout_s=float(os.getenv("INFERENCE_TIMEOUT_S", "120")),
        download_timeout_s=float(os.getenv("DOWNLOAD_TIMEOUT_S", "30")),
        max_concurrent_inference=max(1, int(os.getenv("MAX_CONCURRENT_INFERENCE", "1"))),
        backend_callback_retries=max(1, int(os.getenv("BACKEND_CALLBACK_RETRIES", "3"))),
    )
