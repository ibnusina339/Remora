"""Crop selected user-supplied cows and export crisp native pixel masks.

Original cutouts are retained as PNGs. The simulator paints the same masks as
integer runs, so it does not depend on image decoding or fractional scaling.
"""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SOURCES = Path('C:/Users/Admin/Downloads')
BODY = 'ChatGPT Image Sep 30, 2026, 11_01_58 PM.png'
POSES = 'ChatGPT Image Sep 30, 2026, 11_01_03 PM.png'
FACE = 'ChatGPT Image Sep 30, 2026, 11_01_42 PM.png'
SELECTIONS = {
    'stand': (POSES, (43, 50, 232, 227), (104, 102)),
    'graze': (BODY, (18, 685, 323, 960), (112, 96)),
    'jump': (POSES, (18, 815, 238, 1024), (104, 100)),
    'run': (BODY, (329, 391, 648, 641), (112, 96)),
    'roll': (BODY, (1266, 96, 1619, 350), (106, 96)),
    'peek': (BODY, (76, 350, 325, 663), (94, 100)),
    'listen': (POSES, (1008, 451, 1243, 643), (104, 100)),
    'think': (BODY, (1280, 350, 1617, 656), (104, 102)),
    'back': (BODY, (350, 671, 618, 950), (94, 100)),
    'alert': (BODY, (20, 66, 325, 338), (100, 100)),
    'drink': (BODY, (990, 660, 1250, 950), (98, 100)),
    'sit': (BODY, (666, 350, 968, 655), (96, 96)),
    'sleep': (BODY, (1245, 668, 1619, 950), (124, 90)),
    'happy': (FACE, (267, 61, 515, 335), (72, 66)),
    'sad': (FACE, (766, 71, 1016, 329), (72, 66)),
    'surprised': (FACE, (768, 350, 1020, 633), (72, 66)),
    'easy': (FACE, (85, 654, 390, 908), (96, 80)),
    'normal': (FACE, (444, 658, 740, 908), (96, 80)),
    'hard': (FACE, (801, 662, 1116, 909), (96, 80)),
    'expert': (FACE, (1260, 73, 1536, 340), (88, 80)),
    'master': (FACE, (1160, 628, 1495, 909), (96, 80)),
}

def mask(image):
    # Threshold removes paper texture; flood only the outside white region.
    gray = image.convert('L')
    ink = gray.point(lambda n: 0 if n < 140 else 255)
    w, h = ink.size
    px = ink.load()
    outside = set()
    queue = deque((x, y) for x in range(w) for y in (0, h-1))
    queue.extend((x, y) for y in range(h) for x in (0, w-1))
    while queue:
        x, y = queue.popleft()
        if (x, y) in outside or not (0 <= x < w and 0 <= y < h) or px[x, y] == 0:
            continue
        outside.add((x, y))
        queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    result = Image.new('RGBA', (w,h))
    for y in range(h):
        for x in range(w):
            if (x,y) not in outside:
                v = px[x,y]
                result.putpixel((x,y), (v,v,v,255))
    return result.crop(result.getbbox())

def eyes_for(image):
    """Find paired, isolated black eye marks; leave ambiguous poses untouched."""
    seen=set();candidates=[];w,h=image.size
    for y in range(h):
        for x in range(w):
            if (x,y) in seen or image.getpixel((x,y))!=(0,0,0,255):continue
            todo=[(x,y)];component=[];seen.add((x,y))
            while todo:
                a,b=todo.pop();component.append((a,b))
                for nx,ny in ((a-1,b),(a+1,b),(a,b-1),(a,b+1)):
                    if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and image.getpixel((nx,ny))==(0,0,0,255):
                        seen.add((nx,ny));todo.append((nx,ny))
            xs,ys=zip(*component);box=(min(xs),min(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1)
            a,b,bw,bh=box
            if 2<=bw<=7 and 3<=bh<=11 and w*.34<a<w*.90 and h*.20<b<h*.54:
                candidates.append(box)
    candidates.sort(key=lambda b:b[1])
    for i,a in enumerate(candidates):
        for b in candidates[i+1:]:
            if abs(a[1]-b[1])<=max(3,h*.04) and abs(a[0]-b[0])>w*.12:
                return [a,b]
    return []

dest = ROOT / 'cow-sprites'
dest.mkdir(exist_ok=True)
sprites = {}
preview = Image.new('RGB', (560, 90*((len(SELECTIONS)+3)//4)), '#20212a')
draw = ImageDraw.Draw(preview)
for i, (name, (source, box, limit)) in enumerate(SELECTIONS.items()):
    original = mask(Image.open(SOURCES/source).crop(box))
    original.save(dest/f'{name}-cutout.png')
    ratio = min(limit[0]/original.width, limit[1]/original.height)
    size = (round(original.width*ratio), round(original.height*ratio))
    native = original.resize(size, Image.Resampling.NEAREST)
    native.save(dest/f'{name}.png')
    rows = [''.join('.' if native.getpixel((x,y))[3]==0 else
                    '#' if native.getpixel((x,y))[0]==0 else 'o'
                    for x in range(native.width)) for y in range(native.height)]
    eyes = {'stand': [(49,41,6,12),(74,42,6,11)], 'normal': [(38,44,4,10),(60,44,4,9)]}.get(name, eyes_for(native) if name in ('alert','hard') else [])
    sprites[name] = {'w':size[0], 'h':size[1], 'rows':rows, 'eyes':eyes,
                     'source':source, 'crop':box}
    x,y = (i%4)*140, (i//4)*90
    thumb = native.copy()
    thumb.thumbnail((124,68), Image.Resampling.NEAREST)
    preview.paste(thumb, (x+7,y+4), thumb)
    draw.text((x+7,y+74),name,fill='#f4ebd6')
(ROOT/'remora-cow-sprites.js').write_text(
    '// Selected crops from user-provided sprite sheets; native integer pixel masks.\n'
    'window.RemoraCowSprites = '+json.dumps(sprites,separators=(',',':'))+';\n',encoding='utf-8')
preview.save(ROOT.parent/'previews'/'cow-sprite-selection.png')
print('Exported',len(sprites),'selected cows into',dest)
