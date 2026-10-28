const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.PHARMASNAP_SCREENSHOTS_DIR;
if (output) fs.mkdirSync(output,{recursive:true});
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'demo-samples.js'),'utf8'),context);
const {samples,locales}=context.window.PharmaSnapSamples;
const languages=Object.keys(locales);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'audio/manifest.json'),'utf8')).recordings;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [mode,translations] of Object.entries(samples)) {
  assert.deepEqual(Object.keys(translations),languages,`Every ${mode} sample has every language`);
  for(const language of languages) {
    const name=`${mode}-${language}.mp3`,record=manifest[name];
    assert(record,`Audio manifest includes ${name}`);
    assert.equal(record.script_sha256,hash(translations[language].response),`Recording script matches text: ${name}`);
    assert.equal(record.audio_sha256,hash(fs.readFileSync(path.join(root,'audio',name))),`Recording bytes match manifest: ${name}`);
    assert.equal(record.voice,locales[language].voice);
  }
}
assert.equal(Object.keys(manifest).length,languages.length*Object.keys(samples).length);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const filename=path.join(root,pathname==='/'?'index.html':pathname);
  fs.readFile(filename,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':data.length});res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const size of [{width:1440,height:1000},{width:820,height:1000},{width:390,height:844},{width:320,height:750}]) {
      await page.setViewportSize(size);await page.goto(base);await page.locator('.hero-shot img').evaluate(img=>img.decode());
      assert((await page.locator('.lede').textContent()).includes('medicines and health documents'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await page.locator('.hero-shot img').getAttribute('src'),'/img/features/hero-medicine-world-mobile-960.webp');
      const image=await page.locator('.hero-shot').boundingBox(),copy=await page.locator('.hero-copy').boundingBox();assert(image.width>=size.width-1);if(size.width<=1068) assert(image.y>=copy.y+copy.height-1);
      assert((await page.locator('#ingredients').textContent()).includes('Choose several allergens'));
      assert((await page.locator('#ingredients').textContent()).includes('enter your own name'));
      assert.equal(await page.locator('.feature-overview li').count(),6);
      assert((await page.locator('#health-details').textContent()).includes('current Cabinet medicines'));
      assert((await page.locator('.feature-overview').textContent()).includes('not a complete check of every interaction'));
      assert((await page.locator('#saved-chats').textContent()).includes('With your permission'));
      assert((await page.locator('#save-medicines').textContent()).includes('custom medicine'));
      assert.equal(await page.locator('#pharmacy-search').count(),0,'Old Google pharmacy search is removed');
      assert((await page.locator('#pharmacies').textContent()).includes('Across Australia'));
      assert((await page.locator('#nearby-products').textContent()).includes('Find nearby pharmacies in Australia'));
      assert((await page.locator('#nearby-products').textContent()).includes('Listings do not guarantee stock'));
      assert.equal(await page.locator('.pfs-preview-documents').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).transform==='none')),true);
      if(output) await page.screenshot({path:path.join(output,`homepage-v2-${size.width}.png`)});
    }
    // Regression from the owner UI review: decorative artwork must never cover
    // sign-in copy on a small screen. No account request is allowed in this check.
    await page.route('https://rcsuzwkivqejkxdjbhks.supabase.co/**', route=>route.abort());
    for(const colorScheme of ['light','dark']) for(const width of [375,768,1440]) {
      await page.emulateMedia({colorScheme});
      await page.setViewportSize({width,height:1000});
      await page.goto(`${base}/admin/index.html`);
      assert(await page.locator('#login').isVisible());
      assert(await page.locator('#tools').isHidden());
      assert(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).display==='none'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert(await page.locator('.auth-intro').evaluate(el=>{
        const art=el.querySelector('.auth-illustration').getBoundingClientRect();
        return !art.width||!art.height||Array.from(el.querySelectorAll('h1,p')).every(t=>{
          const r=t.getBoundingClientRect();
          return !(art.left<r.right&&art.right>r.left&&art.top<r.bottom&&art.bottom>r.top);
        });
      }),`Owner sign-in artwork must not cover copy: ${width}/${colorScheme}`);
      assert(await page.locator('#password').evaluate(el=>el.getBoundingClientRect().height>=48));
    }
    await page.emulateMedia({colorScheme:'light'});
    // The current public preview is intentionally silent and has two sample
    // screens. Retired recordings above remain integrity-checked assets, not
    // evidence of audio playback or features in the current preview.
    await page.setViewportSize({width:1050,height:1100});
    const requests=[];
    page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/preview.html#conversation`);
    assert.equal(await page.locator('#answer-language option').count(),2);
    assert.equal(await page.locator('#voice-language option').count(),2);
    assert.equal(await page.locator('audio, video, input[type="file"]').count(),0);
    assert((await page.locator('.demo-intro').textContent()).includes('Sample screens only'));
    for(const language of ['en','vi']) {
      await page.selectOption('#answer-language',language);
      await page.click('#play-conversation');
      assert(await page.locator('#play-conversation').isDisabled());
      assert(await page.locator('#stop-conversation').isVisible());
      await page.waitForFunction(expected=>document.querySelector('#conversation-title').textContent===expected,language==='vi'?'Đang nghe…':'Listening…');
      await page.waitForFunction(expected=>document.querySelector('#conversation-title').textContent===expected,language==='vi'?'Đang suy nghĩ…':'Thinking…');
      await page.waitForFunction(expected=>document.querySelector('#conversation-title').textContent===expected,language==='vi'?'Đang nói…':'Speaking…');
      assert((await page.locator('.demo-orbit').getAttribute('class')).includes('is-active'));
      await page.waitForFunction(()=>document.querySelector('#conversation-title').textContent==='Preview complete');
      assert(await page.locator('#stop-conversation').isHidden());
      assert(await page.locator('#play-conversation').isEnabled());
    }
    await page.selectOption('#voice-language','vi');
    assert((await page.locator('#language-note').textContent()).includes('No speech is generated'));
    await page.click('#play-conversation');await page.click('#stop-conversation');
    assert.equal(await page.locator('#conversation-title').textContent(),'Preview stopped');
    await page.click('#play-conversation');await page.selectOption('#answer-language','en');
    assert(await page.locator('#stop-conversation').isHidden());
    await page.click('#play-conversation');await page.locator('.demo-tabs a[href="#documents"]').click();
    await page.waitForFunction(()=>!document.querySelector('#documents').hidden);
    assert(await page.locator('#documents').isVisible());
    assert(await page.locator('#conversation').isHidden());
    assert.equal(await page.locator('.demo-orbit.is-active').count(),0);
    for(const name of ['Medicine pack','Blood test']) await page.uncheck(`input[value="${name}"]`);
    assert(await page.locator('#ask-documents').isDisabled());
    assert.equal(await page.locator('#document-count').textContent(),'0 sample items selected');
    await page.check('input[value="Hospital report"]');
    assert(await page.locator('#ask-documents').isEnabled());
    assert.equal(await page.locator('#document-count').textContent(),'1 sample item selected');
    await page.click('#ask-documents');
    await page.waitForFunction(()=>!document.querySelector('#conversation').hidden);
    assert((await page.locator('.demo-transcript').textContent()).includes('Hospital report'));
    assert((await page.locator('.demo-transcript').textContent()).includes('not your health records'));
    await page.goto(`${base}/preview.html#unknown`);assert(await page.locator('#conversation').isVisible());
    await page.click('#play-conversation');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.locator('#conversation-title').textContent(),'Preview paused');
    assert(await page.locator('#stop-conversation').isHidden());
    for(const mode of ['conversation','documents']) for(const width of [1440,820,390,320]) {
      await page.setViewportSize({width,height:844});await page.goto(`${base}/preview.html#${mode}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`No preview overflow: ${mode}/${width}`);
    }
    assert.equal(requests.some(url=>!url.startsWith(base)),false,'Preview uses no external AI or upload requests');
    assert.equal(requests.some(url=>/\/audio\//.test(url)),false,'Silent design preview requests no speech asset');
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${Object.keys(manifest).length} retired recording/script hashes; current homepage claims and four viewports; owner sign-in geometry/light/dark; silent EN/VI preview states, completion/cancellation, selected documents, privacy and routing.`);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
