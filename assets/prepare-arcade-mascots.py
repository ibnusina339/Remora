"""Extract the two user-selected transparent arcade mascots; preserve other poses."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parent
DEST=ROOT/'cow-sprites'
file=ROOT/'remora-cow-sprites.js'
sprites=json.loads(file.read_text(encoding='utf-8').split('window.RemoraCowSprites = ',1)[1].strip().removesuffix(';'))
for name,source,box in [('snake','source-snake-sheet.png',(1332,82,1774,444)),('pingpong','source-pong-sheet.png',(886,493,1330,870))]:
    crop=Image.open(DEST/source).convert('RGBA').crop(box)
    alpha=crop.getchannel('A').point(lambda a:255 if a>=128 else 0)
    crop.putalpha(alpha);crop=crop.crop(alpha.getbbox())
    crop.save(DEST/f'{name}-cutout.png')
    scale=min(112/crop.width,100/crop.height)
    native=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
    rows=[]
    for y in range(native.height):
        row=''
        for x in range(native.width):
            r,g,b,a=native.getpixel((x,y))
            value='.' if a<128 else 'o' if (r+g+b)/3>=140 else '#'
            row+=value
            native.putpixel((x,y),(0,0,0,0) if value=='.' else (255,255,255,255) if value=='o' else (0,0,0,255))
        rows.append(row)
    native.save(DEST/f'{name}.png')
    sprites[name]={'w':native.width,'h':native.height,'rows':rows,'eyes':[],'source':source,'crop':box}
    print(name,native.size)
file.write_text('// Selected crops from user-provided sprite sheets; native integer pixel masks.\nwindow.RemoraCowSprites = '+json.dumps(sprites,separators=(',',':'))+';\n',encoding='utf-8')
