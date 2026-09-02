"""Create single-object source images for HUGGE products with multi-view photos."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "public" / "catalog-sources" / "hugge-md"

# The catalog photos for these SKUs contain two views of the same product.
# TRELLIS interprets both views as two physical objects, so retain only the
# complete front-facing product and place it on a neutral square canvas.
CROPS = {
    "98232": (500, 105, 975, 900),
    "108501": (505, 105, 980, 900),
}


def prepare(sku: str, box: tuple[int, int, int, int]) -> Path:
    source = Image.open(SOURCES / f"{sku}-1.jpg").convert("RGB")
    product = source.crop(box)
    product.thumbnail((880, 880), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1024, 1024), "white")
    x = (canvas.width - product.width) // 2
    y = (canvas.height - product.height) // 2
    canvas.paste(product, (x, y))
    destination = SOURCES / f"{sku}-single.jpg"
    canvas.save(destination, quality=96, subsampling=0)
    return destination


if __name__ == "__main__":
    for product_sku, crop_box in CROPS.items():
        print(prepare(product_sku, crop_box))
