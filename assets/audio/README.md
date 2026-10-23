# Active cat audio: six single-meow excerpts

Source selected by the user: [Suara Pikat Kucing Ampuh Auto Nyamperin / Suara Kucing Memanggil Temannya](https://www.youtube.com/watch?v=_SNIchho6kM).

| File | Source time (seconds) | Duration |
| --- | --- | --- |
| `meow-01.wav` | 4.02–5.09 | 1.07 s |
| `meow-02.wav` | 6.30–7.30 | 1.00 s |
| `meow-03.wav` | 8.17–8.99 | 0.82 s |
| `meow-04.wav` | 10.56–11.57 | 1.01 s |
| `meow-05.wav` | 12.35–13.12 | 0.77 s |
| `meow-06.wav` | 13.37–14.45 | 1.08 s |

Cuts use separate voice envelopes with a short quiet margin; they exclude the surrounding meows. Processing: mono PCM16 at 22,050 Hz, 70 Hz high-pass / 9,500 Hz low-pass, 15 ms onset / 35 ms ending fades, peak normalization to 80%. Pitch and timing are preserved. The original downloaded audio is retained at `../../tmp/remora-cat-video.webm`; run `../prepare-meow-samples.py` to rebuild the clips and embedded sample bank.

`../remora-meow-sample.js` embeds all six clips for local `file://` playback. Each MEOW picks a random clip excluding the previous one; decoded buffers are cached, and a new press stops the previous meow voice. Master/SFX controls apply normally. These excerpts come from the user-selected YouTube source; the CC0 metadata below applies only to the old archived Commons recording.

## Archived previous recording (not played)

- Title: **Maullido de gata hembra joven** (young female cat meowing).
- Creator: **George Miquilena**.
- Original: https://commons.wikimedia.org/wiki/File:Maullido_de_gata_hembra_joven.ogg
- Licence: **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/
- Licence and author were checked against Wikimedia Commons `imageinfo` / `extmetadata` on 16 October 2026.

`cat-meow-source.ogg` is the original recording. `cat-meow.wav` is a mono 22,050 Hz, 16-bit version with a 70 Hz high-pass filter, short edge fades and peak normalization to 80%.

The original Commons recording retains CC0 status. Sound synthesis is still used for the other effects and menu music.
