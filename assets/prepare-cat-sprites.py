"""Export selected poses from the user's cat sheet as native pixel masks."""
from collections import deque
from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DEST = ROOT / 'cat-sprites'
DEST.mkdir(exist_ok=True)
SOURCE = DEST / 'source-sheet.png'
if not SOURCE.exists():
    shutil.copyfile(Path('C:/Users/Admin/AppData/Local/Temp/codex-clipboard-bd64d4ed-770c-43bf-a92d-886c8797bb8e.png'), SOURCE)
SELECTIONS = {
    'secretStand': ((25, 65, 345, 338), (166, 142)),
    'sit': ((724, 88, 978, 335), (130, 138)),
    'groom': ((1005, 95, 1274, 338), (82, 78)),
    'happy': ((727, 361, 959, 617), (46, 50)),
    'peek': ((78, 357, 293, 630), (24, 31)),
    'roll': ((1306, 116, 1635, 339), (58, 40)),
    'bowl': ((1019, 695, 1280, 905), (39, 38)),
    'sleep': ((1320, 667, 1618, 907), (62, 44)),
}

def cutout(image):
    gray = image.convert('L')
    w, h = gray.size
    outside = set()
    queue = deque([(x, y) for x in range(w) for y in (0, h-1)] +
                  [(x, y) for y in range(h) for x in (0, w-1)])
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < w and 0 <= y < h) or (x, y) in outside or gray.getpixel((x, y)) < 100:
            continue
        outside.add((x, y))
        queue.extend(((x-1, y), (x+1, y), (x, y-1), (x, y+1)))
    result = Image.new('RGBA', (w, h))
    for y in range(h):
        for x in range(w):
            if (x, y) not in outside:
                v = gray.getpixel((x, y))
                v = 0 if v < 100 else 153 if v < 205 else 255
                result.putpixel((x, y), (v, v, v, 255))
    return result.crop(result.getbbox())

sheet = Image.open(SOURCE)
sprites = {}
preview = Image.new('RGB', (720, 360), '#1c1711')
draw = ImageDraw.Draw(preview)
for i, (name, (box, limit)) in enumerate(SELECTIONS.items()):
    crop = cutout(sheet.crop(box))
    crop.save(DEST / f'{name}-cutout.png')
    scale = min(limit[0] / crop.width, limit[1] / crop.height)
    size = (round(crop.width * scale), round(crop.height * scale))
    native = crop.resize(size, Image.Resampling.NEAREST)
    native.save(DEST / f'{name}.png')
    rows = [''.join('.' if native.getpixel((x, y))[3] == 0 else
                    '#' if native.getpixel((x, y))[0] == 0 else
                    'g' if native.getpixel((x, y))[0] == 153 else 'o'
                    for x in range(size[0])) for y in range(size[1])]
    sprites[name] = {'w': size[0], 'h': size[1], 'rows': rows, 'crop': box}
    x, y = (i % 4) * 180, (i // 4) * 180
    preview.paste(native, (x + (180-size[0])//2, y + 146-size[1]), native)
    draw.text((x+12, y+157), name, fill='#f4ebd6')
(ROOT / 'remora-cat-sprites.js').write_text(
    '// Selected user-supplied cat poses. Transparent, three-colour native masks.\n'
    'window.RemoraCatSprites = ' + json.dumps(sprites, separators=(',', ':')) + ';\n', encoding='utf-8')
preview.save(ROOT.parent / 'previews' / 'cat-sprite-selection.png')
print('Exported', len(sprites), 'cat poses.')
