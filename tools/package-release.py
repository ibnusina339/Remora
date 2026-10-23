from pathlib import Path
import hashlib,json,os,re,shutil
root=Path(__file__).resolve().parent.parent
version=(root/'firmware/esp32c6/VERSION').read_text().strip()
if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version):raise SystemExit('VERSION must be a stable semantic version')
tag=os.environ.get('GITHUB_REF_NAME','')
if os.environ.get('GITHUB_REF_TYPE')=='tag' and tag!='v'+version:raise SystemExit('Release tag must equal v'+version)
dest=root/'dist';dest.mkdir(exist_ok=True)
source=root/'firmware/esp32c6/build'
shutil.copyfile(source/'Remora.bin',dest/'remora-esp32c6.bin')
shutil.copyfile(source/'remora-full.bin',dest/'remora-full.bin')
payload=(dest/'remora-esp32c6.bin').read_bytes()
manifest={'version':version,'board':'esp32c6-supermini-k2','asset':'remora-esp32c6.bin','idf':'5.5.2','size':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'userdata_schema':1}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
shutil.copyfile(root/'docs/FLASHING.md',dest/'FLASHING.md')
for name in ['flasher_args.json','project_description.json']:
 if (source/name).exists():shutil.copyfile(source/name,dest/name)
print(json.dumps(manifest))
