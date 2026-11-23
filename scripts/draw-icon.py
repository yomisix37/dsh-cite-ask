"""Draw the 180px raster storefront tile for dsh-cite-ask.

Same subject as icon.svg (a speech bubble with a question mark), rendered at the
size the plugin catalog draws its tile at. Run with the workspace Python:

    python3 scripts/draw-icon.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 180
SCALE = 4  # supersample, then downscale for clean edges
BLUE = (47, 127, 191, 255)
WHITE = (255, 255, 255, 255)

canvas = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)


def s(value: float) -> float:
    return value * SCALE


# Bubble body: an ellipse plus a tail at the lower left, matching icon.svg's
# silhouette proportions.
draw.ellipse([s(24), s(26), s(156), s(134)], fill=BLUE)
draw.polygon([(s(62), s(118)), (s(62), s(150)), (s(90), s(128))], fill=BLUE)

# Question mark: the hook over the top, the stem dropping from its right end
# down to just left of centre, and the dot.
stroke = int(s(9.5))
hook_cx, hook_cy, hook_r = 86.0, 68.0, 23.0
hook_end = 30
draw.arc(
    [s(hook_cx - hook_r), s(hook_cy - hook_r), s(hook_cx + hook_r), s(hook_cy + hook_r)],
    start=180,
    end=hook_end,
    fill=WHITE,
    width=stroke,
)
# Pillow measures arc angles clockwise from 3 o'clock with y growing downward.
end_x = hook_cx + hook_r * math.cos(math.radians(hook_end))
end_y = hook_cy + hook_r * math.sin(math.radians(hook_end))
stem_end = (87.0, 103.0)
draw.line([(s(end_x), s(end_y)), (s(stem_end[0]), s(stem_end[1]))], fill=WHITE, width=stroke)
draw.ellipse([s(81.5), s(111), s(92.5), s(122)], fill=WHITE)

# Round the line ends of the stem, then downscale.
for center in [(end_x, end_y), stem_end]:
    draw.ellipse(
        [s(center[0] - 4.75), s(center[1] - 4.75), s(center[0] + 4.75), s(center[1] + 4.75)],
        fill=WHITE,
    )

icon = canvas.resize((SIZE, SIZE), Image.LANCZOS)
target = Path(__file__).resolve().parent.parent / "assets" / "icon-180.png"
target.parent.mkdir(parents=True, exist_ok=True)
icon.save(target, "PNG", optimize=True)
print("wrote", target, icon.size, target.stat().st_size, "bytes")
