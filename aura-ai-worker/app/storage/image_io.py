import io
from PIL import Image, ImageOps


def decode_pil_rgb(data: bytes, max_side: int) -> Image.Image:
    im = Image.open(io.BytesIO(data))
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "RGBA", "L"):
        im = im.convert("RGB")
    elif im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        im = bg
    elif im.mode == "L":
        im = im.convert("RGB")

    w, h = im.size
    if max(w, h) > max_side:
        scale = max_side / float(max(w, h))
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return im
