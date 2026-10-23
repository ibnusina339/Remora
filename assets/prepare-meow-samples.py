"""Build six isolated meows from the user-selected video audio.

Usage: python assets/prepare-meow-samples.py [downloaded-source.webm]
"""
from pathlib import Path
import base64
import json
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'tmp/remora-cat-video.webm'
DEST = ROOT / 'audio'
URL = 'https://www.youtube.com/watch?v=_SNIchho6kM'
# Separate calls, with short quiet margins around each voice envelope.
REGIONS = [(4.02, 5.09), (6.30, 7.30), (8.17, 8.99),
           (10.56, 11.57), (12.35, 13.12), (13.37, 14.45)]
samples = []
for i, (start, end) in enumerate(REGIONS, 1):
    destination = DEST / f'meow-{i:02d}.wav'
    duration = end - start
    filters = ('highpass=f=70,lowpass=f=9500,'
               f'afade=t=in:st=0:d=0.015,afade=t=out:st={duration-.035:.3f}:d=0.035')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-ss', str(start), '-i', str(SOURCE), '-t', str(duration),
                    '-ac', '1', '-ar', '22050', '-af', filters, '-c:a', 'pcm_s16le',
                    str(destination)], check=True)
    with wave.open(str(destination), 'rb') as wav:
        rate = wav.getframerate()
        pcm = wav.readframes(wav.getnframes())
    # Normalize each single meow to the same headroom without changing its pitch.
    import array
    values = array.array('h', pcm)
    if sys.byteorder != 'little':
        values.byteswap()
    peak = max(abs(v) for v in values)
    normalized = array.array('h', (round(v * (.8 * 32767 / peak)) for v in values))
    if sys.byteorder != 'little':
        normalized.byteswap()
    pcm = normalized.tobytes()
    with wave.open(str(destination), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm)
    samples.append({'id': f'meow-{i:02d}', 'sampleRate': rate,
                    'sourceStart': start, 'sourceEnd': end,
                    'pcm16': base64.b64encode(pcm).decode('ascii')})
(ROOT / 'remora-meow-sample.js').write_text(
    '// Six single-meow excerpts from the user-selected video; embedded for file:// playback.\n'
    'window.RemoraMeowSamples = ' + json.dumps(samples, separators=(',', ':')) + ';\n', encoding='utf-8')
(DEST / 'meow-segments.json').write_text(json.dumps({
    'source': URL, 'segments': [{k: v for k, v in sample.items() if k != 'pcm16'} for sample in samples]
}, indent=2) + '\n', encoding='utf-8')
print('Exported six single-meow WAVs and embedded PCM bank.')
