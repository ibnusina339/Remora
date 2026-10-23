"""Extract the user's four eight-frame strips into registered native masks.

White seams separate neighboring poses without clipping tails or noses. Every
frame in a clip shares one scale, foot anchor and canvas; jumps preserve the
height already drawn in the original strip. No body deformation is applied.
"""
from pathlib import Path
from collections import deque
from statistics import median
import json
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
SOURCES = Path('C:/Users/Admin/Downloads')
CLIPS = {
    'graze': ('cow-animations/graze-source.png', (116, 100), [650, 150, 180, 350, 400, 450, 400, 700]),
    'tail': ('ChatGPT Image Oct 1, 2026, 10_32_41 PM-2.png', (116, 96), [700, 180, 180, 180, 220, 180, 180, 650]),
    'rise': ('ChatGPT Image Oct 1, 2026, 10_32_45 PM-3.png', (116, 104), [1100, 300, 260, 700, 600, 260, 300, 1100]),
    'jump': ('ChatGPT Image Oct 1, 2026, 10_32_49 PM-4.png', (116, 120), [650, 180, 160, 160, 180, 160, 180, 650]),
}

def seam(gray, center, top, bottom):
    """Find a white top-to-bottom cut through a narrow inter-frame corridor."""
    left, right = center-65, center+66
    width = right-left
    px = gray.load()
    previous = [abs(left+i-center)/250 for i in range(width)]
    history = []
    for y in range(top, bottom):
        current, row = [], []
        for i in range(width):
            parent = min(range(max(0, i-1), min(width, i+2)), key=lambda j: previous[j]+abs(i-j)*.08)
            cost = 1000 if px[left+i, y] < 140 else 0
            current.append(previous[parent]+cost+abs(left+i-center)/250+abs(i-parent)*.08)
            row.append(parent)
        previous = current
        history.append(row)
    at = min(range(width), key=previous.__getitem__)
    result = [0]*(bottom-top)
    for y in range(bottom-top-1, -1, -1):
        result[y] = left+at
        at = history[y][at]
    crossed = sum(px[result[y-top], y] < 140 for y in range(top, bottom))
    if crossed:
        raise ValueError(f'Seam at {center} crosses {crossed} ink pixels')
    return result

def components(points):
    points = set(points)
    result = []
    while points:
        first = points.pop()
        todo, region = [first], [first]
        while todo:
            x, y = todo.pop()
            for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if p in points:
                    points.remove(p);todo.append(p);region.append(p)
        result.append(region)
    return sorted(result, key=len, reverse=True)

def extract(gray, cuts, index, top, bottom):
    left = min(cuts[index]);right = max(cuts[index+1])+1
    image = Image.new('RGBA', (right-left, bottom-top))
    px = gray.load();out = image.load()
    ink = set()
    for y in range(top,bottom):
        for x in range(cuts[index][y-top],cuts[index+1][y-top]):
            if px[x,y] < 140:
                ink.add((x-left,y-top));out[x-left,y-top]=(0,0,0,255)
    # Fill only enclosed white interiors; paper outside the cow stays transparent.
    w,h=image.size
    barrier=Image.new('L',(w,h),255)
    for x,y in ink:barrier.putpixel((x,y),0)
    # Tiny gaps where the mouth meets a grass blade must not make white cheeks
    # transparent. Close gaps for the outside flood only; retain original ink.
    barrier=barrier.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
    wall=barrier.load()
    outside=set();todo=deque((x,y) for x in range(w) for y in (0,h-1))
    todo.extend((x,y) for y in range(h) for x in (0,w-1))
    while todo:
        x,y=todo.popleft()
        if not (0<=x<w and 0<=y<h) or (x,y) in outside or wall[x,y]==0:continue
        outside.add((x,y));todo.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    for y in range(h):
        for x in range(w):
            if (x,y) not in ink and (x,y) not in outside:out[x,y]=(255,255,255,255)
    body=components(ink)[0]
    floor=max(y for x,y in body)
    feet=[x for x,y in body if y>=floor-14]
    anchor=round(median(feet))
    return image,anchor

def eye_boxes(image):
    w,h=image.size
    black=(0,0,0,255);white=(255,255,255,255);px=image.load();candidates=[]
    # Eyes can touch the muzzle outline. Find long black strokes surrounded by
    # white cheeks rather than assuming every eye is a disconnected component.
    for y in range(round(h*.22),round(h*.55)):
        for x in range(round(w*.45),round(w*.95)):
            if px[x,y]!=black or px[x-1,y]!=white:continue
            bw=0
            while x+bw<w and px[x+bw,y]==black:bw+=1
            if not 2<=bw<=6 or x+bw>=w:continue
            bh=0
            while y+bh<h and px[x-1,y+bh]==white and px[x+bw,y+bh]==white and all(px[xx,y+bh]==black for xx in range(x,x+bw)):bh+=1
            if 6<=bh<=12:candidates.append((x,y,bw,bh))
    for a in sorted(candidates,key=lambda p:p[1]):
        for b in candidates:
            if a!=b and abs(a[1]-b[1])<=3 and abs(a[0]-b[0])>w*.1:return [a,b]
    return []

dest=ROOT/'cow-animations';dest.mkdir(exist_ok=True)
sprites={};clips={};preview=Image.new('RGB',(8*132,4*146),'#1c1711');draw=ImageDraw.Draw(preview)
for row,(name,(file,limit,durations)) in enumerate(CLIPS.items()):
    source=ROOT/file if file.startswith('cow-animations/') else SOURCES/file
    gray=Image.open(source).convert('L')
    bounds=gray.point(lambda v:255 if v<140 else 0).getbbox();top,bottom=bounds[1]-4,bounds[3]+4
    cuts=[[0]*(bottom-top)]+[seam(gray,gray.width*i//8,top,bottom) for i in range(1,8)]+[[gray.width]*(bottom-top)]
    originals=[extract(gray,cuts,i,top,bottom) for i in range(8)]
    max_left=max(anchor-image.getbbox()[0] for image,anchor in originals)
    max_right=max(image.getbbox()[2]-anchor for image,anchor in originals)
    ratio=min(.44,(limit[0]-6)/(max_left+max_right),(limit[1]-6)/(bottom-top))
    width=round((max_left+max_right)*ratio)+6;height=round((bottom-top)*ratio)+6
    anchor_x=round(max_left*ratio)+3
    keys=[]
    for index,(image,anchor) in enumerate(originals):
        box=image.getbbox();cutout=image.crop(box);cutout.save(dest/f'{name}-{index}-cutout.png')
        native=Image.new('RGBA',(width,height));scaled=cutout.resize((round(cutout.width*ratio),round(cutout.height*ratio)),Image.Resampling.NEAREST)
        native.paste(scaled,(anchor_x+round((box[0]-anchor)*ratio),3+round(box[1]*ratio)))
        native.save(dest/f'{name}-{index}.png')
        key=f'anim-{name}-{index}';keys.append(key)
        rows=[''.join('.' if native.getpixel((x,y))[3]==0 else '#' if native.getpixel((x,y))[0]==0 else 'o' for x in range(width)) for y in range(height)]
        sprites[key]={'w':width,'h':height,'rows':rows,'eyes':eye_boxes(native) if name=='tail' else [],'source':file,'frame':index}
        preview.paste(native,(index*132+6,row*146+9),native);draw.text((index*132+6,row*146+130),f'{name} {index+1}',fill='#f4ebd6')
    clips[name]={'frames':keys,'durations':durations,'w':width,'h':height,'source':file,'anchorX':anchor_x,'scale':round(ratio,5)}
    print(name,width,height,'seams preserve all ink; blink frames',sum(bool(sprites[k]['eyes']) for k in keys))
(ROOT/'remora-cow-animations.js').write_text('// User-provided animation strips, registered and sampled into integer masks.\nObject.assign(window.RemoraCowSprites,'+json.dumps(sprites,separators=(',',':'))+');\nwindow.RemoraCowAnimations='+json.dumps(clips,separators=(',',':'))+';\n',encoding='utf-8')
preview.save(ROOT.parent/'previews/cow-animation-frames.png')
