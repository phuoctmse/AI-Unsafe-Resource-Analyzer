import hashlib


def deterministic_mock_scores(image_url: str) -> tuple[float, float]:
    """
    Deterministic "fake inference" so the skeleton pipeline is testable
    without downloading ML model weights.
    """
    digest = hashlib.sha256(image_url.encode("utf-8")).digest()
    nsfw = int.from_bytes(digest[0:4], "big") / 2**32
    violence = int.from_bytes(digest[4:8], "big") / 2**32
    return nsfw, violence

