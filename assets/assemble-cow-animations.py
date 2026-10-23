"""Package the four real simulator menus into an animated native preview."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent/'previews'
frames=[Image.open(path) for path in sorted((root/'cow-animation').glob('*.png'))]
frames[0].save(root/'remora-cow-animations.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,optimize=True)
print('Saved remora-cow-animations.gif')
