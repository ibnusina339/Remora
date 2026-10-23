"""Package actual simulator canvas frames into a 2x nearest pixel GIF."""
from pathlib import Path
from PIL import Image
import sys
root=Path(__file__).resolve().parent.parent/'previews'
reverse=len(sys.argv)>1 and sys.argv[1]=='reverse'
frames=[Image.open(p).resize((640,480),Image.Resampling.NEAREST) for p in sorted((root/('reverse-menu-animation' if reverse else 'menu-animation')).glob('*.png'))]
output='remora-reverse-preview.gif' if reverse else 'remora-menu-animation.gif'
frames[0].save(root/output,save_all=True,append_images=frames[1:],duration=125,loop=0,optimize=False)
print('Saved',output)
