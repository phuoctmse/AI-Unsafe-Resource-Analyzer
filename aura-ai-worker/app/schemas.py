from typing import Literal

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    imageId: str
    imageUrl: str


class TopLabel(BaseModel):
    label: str
    score: float


class ProcessedCallback(BaseModel):
    status: Literal["SAFE", "UNSAFE", "ERROR"]
    nsfwScore: float | None = None
    violenceScore: float | None = None
    topLabels: list[TopLabel] | None = None
    processedTimeMs: int | None = None

