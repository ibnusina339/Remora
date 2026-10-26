"""Exercise the public OTA transport with the same headers as REMORA."""
from pathlib import Path
import argparse,hashlib,json,os,ssl,struct,urllib.request

parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);parser.add_argument('--api',default='https://api.github.com/repos/ibnusina339/Remora/releases/latest');args=parser.parse_args()
dest=Path(args.out);dest.mkdir(parents=True,exist_ok=True)
HEADERS={'User-Agent':'Remora-ESP32C6'}
def get(url,limit):
 headers=dict(HEADERS)
 headers['Accept']='application/vnd.github+json' if url.startswith('https://api.github.com/') else 'application/octet-stream'
 # CI may authenticate metadata requests to avoid shared-runner rate limits.
 if url.startswith('https://api.github.com/') and os.environ.get('OTA_FIXTURE_TOKEN'):headers['Authorization']='Bearer '+os.environ['OTA_FIXTURE_TOKEN']
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45,context=ssl.create_default_context()) as response:
  body=response.read(limit+1)
  assert response.status==200 and response.url.startswith('https://')
  assert len(body)<=limit,'Response exceeds firmware limit'
  return body,response.url
release,_=get(args.api,24576);r=json.loads(release);assert not r.get('draft') and not r.get('prerelease')
assets={a['name']:a['browser_download_url'] for a in r['assets']};prefix='https://github.com/ibnusina339/Remora/releases/download/'+r['tag_name']+'/'
assert assets['manifest.json']==prefix+'manifest.json';assert assets['remora-esp32c6.bin']==prefix+'remora-esp32c6.bin'
manifest,murl=get(assets['manifest.json'],4096);m=json.loads(manifest)
assert m['board']=='esp32c6-supermini-k2' and m['asset']=='remora-esp32c6.bin'
assert m['version']==r['tag_name'].removeprefix('v')
image,final=get(assets['remora-esp32c6.bin'],0x1e0000)
assert len(image)==m['size'] and len(image)<=0x1e0000
assert hashlib.sha256(image).hexdigest()==m['sha256']
assert image[0]==0xe9 and struct.unpack_from('<I',image,32)[0]==0xabcd5432
assert image[48:80].split(b'\0')[0].decode()==m['version']
assert image[80:112].split(b'\0')[0]==b'Remora'
(dest/'release.json').write_bytes(release);(dest/'manifest.json').write_bytes(manifest);(dest/'firmware.bin').write_bytes(image)
report={'tag':r['tag_name'],'size':len(image),'sha256':m['sha256'],'api_bytes':len(release),'manifest_https_redirect':murl.startswith('https://'),'binary_https_redirect':final.startswith('https://'),'metadata_authenticated':bool(os.environ.get('OTA_FIXTURE_TOKEN'))}
(dest/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
