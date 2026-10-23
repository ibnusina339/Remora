"""Pack the existing user logo as RLE RGBA for flash, matching the web crop."""
from pathlib import Path
from itertools import groupby
from PIL import Image
root=Path(__file__).resolve().parent.parent
im=Image.open(root/'assets/boot-logo-dark.png').convert('RGBA').resize((320,320),Image.Resampling.LANCZOS).crop((0,40,320,280))
runs=[]
for rgba,g in groupby(im.getdata()):
    n=sum(1 for _ in g)
    r,g,b,a=rgba
    # 4-bit components compress gradients with negligible boot-only differences.
    value=((r//17)<<12)|((g//17)<<8)|((b//17)<<4)|(a//17)
    if runs and runs[-1][1]==value and runs[-1][0]+n<65536:runs[-1]=(runs[-1][0]+n,value)
    else:runs.append((n,value))
out='#pragma once\n#include <cstdint>\nnamespace remora {\nstruct LogoRun {uint16_t count,rgba;};\ninline constexpr LogoRun BootLogo[]={\n'
out+=',\n'.join('{%d,%d}'%r for r in runs)+'\n};\n}\n'
(root/'firmware/esp32c6/components/remora_ui/include/boot_logo.hpp').write_text(out)
print(f'Boot logo: {len(runs)} runs, {len(runs)*4} bytes in flash')
