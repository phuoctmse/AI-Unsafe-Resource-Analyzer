import io
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from .logger import log


def _client(endpoint: str, region: str, access_key: str, secret_key: str) -> Any:
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def fetch_object_bytes(
    *,
    bucket: str,
    key: str,
    endpoint: str,
    region: str,
    access_key: str,
    secret_key: str,
) -> bytes:
    cli = _client(endpoint, region, access_key, secret_key)
    try:
        resp = cli.get_object(Bucket=bucket, Key=key)
        body = resp["Body"].read()
        log("info", "s3.fetch.ok", bucket=bucket, key=key, bytes=len(body))
        return body
    except ClientError as e:
        log("error", "s3.fetch.failed", bucket=bucket, key=key, error=str(e))
        raise
