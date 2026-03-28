from typing import Literal

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    imageId: str
    imageUrl: str
    objectKey: str = ""


class ScanTask(BaseModel):
    imageId: str
    imageUrl: str
    objectKey: str = ""


class TopLabel(BaseModel):
    label: str
    score: float


class ProcessedCallback(BaseModel):
    status: Literal["SAFE", "UNSAFE", "ERROR"]
    nsfwScore: float | None = None
    violenceScore: float | None = None
    topLabels: list[TopLabel] | None = None
    reasonShort: str | None = None
    modelVersion: str | None = None
    labelSetVersion: str | None = None
    thresholdsVersion: str | None = None
    scoresFull: dict[str, float] | None = None
    workerVersion: str | None = None
    processedTimeMs: int | None = None

