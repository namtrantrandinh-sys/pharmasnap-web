"""Generate the fixed website examples with neural voices; never processes user records.
Requires edge-tts 7.2.8. Run from the repository root after editing demo-samples.js.
"""
import asyncio, hashlib, json, subprocess
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
async def main():
    js="const fs=require('node:fs'),vm=require('node:vm'),c={window:{}};vm.runInNewContext(fs.readFileSync('demo-samples.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.PharmaSnapSamples));"
    data=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT))
    available={v['ShortName'] for v in await edge_tts.list_voices()}
    manifest={}; gate=asyncio.Semaphore(3)
    previous=json.loads((ROOT/'audio'/'manifest.json').read_text()).get('recordings',{}) if (ROOT/'audio'/'manifest.json').exists() else {}
    def save_manifest():
        (ROOT/'audio'/'manifest.json').write_text(json.dumps({'engine':'Microsoft Edge neural speech','recordings':dict(sorted(manifest.items()))},ensure_ascii=False,indent=2)+'\n')
    async def generate(mode,language,sample):
        voice=data['locales'][language]['voice']
        assert voice in available, f'Voice unavailable: {voice}'
        file=f'{mode}-{language}.mp3'; final=ROOT/'audio'/file
        temp=final.with_suffix('.tmp.mp3')
        script_hash=hashlib.sha256(sample['response'].encode()).hexdigest()
        old=previous.get(file,{})
        if final.exists() and old.get('voice')==voice and old.get('rate')=='-3%' and old.get('script_sha256')==script_hash and old.get('audio_sha256')==hashlib.sha256(final.read_bytes()).hexdigest():
            manifest[file]=old
            save_manifest()
            print(f'Reused current recording {file}',flush=True)
            return
        async with gate:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(sample['response'],voice=voice,rate='-3%').save(str(temp))
                    assert temp.stat().st_size>10000, f'Empty or short recording: {file}'
                    temp.replace(final)
                    break
                except Exception:
                    if attempt==2: raise
                    await asyncio.sleep(2)
        manifest[file]={'voice':voice,'rate':'-3%','script_sha256':hashlib.sha256(sample['response'].encode()).hexdigest(),'audio_sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
        save_manifest()
        print(f'Generated {file}',flush=True)
    results=await asyncio.gather(*(generate(mode,language,sample) for mode,languages in data['samples'].items() for language,sample in languages.items()),return_exceptions=True)
    errors=[str(result) for result in results if isinstance(result,Exception)]
    if errors: raise RuntimeError('Some recordings failed: '+ '; '.join(errors))
    (ROOT/'audio'/'manifest.json').write_text(json.dumps({'engine':'Microsoft Edge neural speech','recordings':dict(sorted(manifest.items()))},ensure_ascii=False,indent=2)+'\n')
    print(f'Completed {len(manifest)} neural recordings.',flush=True)
asyncio.run(main())
