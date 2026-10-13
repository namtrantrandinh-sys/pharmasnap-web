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
      assert((await page.locator('.lede').textContent()).includes('skin condition'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await page.locator('.hero-shot img').getAttribute('src'),'/img/bottle-2k.webp');
      if(size.width>734) {const image=await page.locator('.hero-shot').boundingBox(),copy=await page.locator('.hero-copy').boundingBox();assert(image.x>=copy.x+copy.width-1);assert(image.width<=size.width/2);}
      assert((await page.locator('#ingredients').textContent()).includes('coeliac'));
      assert((await page.locator('#ingredients').textContent()).includes('Look up the brand'));
      assert.equal(await page.locator('#pharmacy-search').count(),0,'Old Google pharmacy search is removed');
      assert((await page.locator('#pharmacy-finder').textContent()).includes('Take a photo or type'));
      assert.equal(await page.locator('.pfs-preview-documents').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).transform==='none')),true);
      if(output) await page.screenshot({path:path.join(output,`homepage-v2-${size.width}.png`)});
    }
    await page.setViewportSize({width:1050,height:1100});
    const trigger=async mode=>{
      if(mode==='pharmacies'){await page.fill('#stock-product','paracetamol');await page.locator('#stock-sample-form button').click();}
      else await page.click({conversation:'#play-conversation',documents:'#ask-documents',ingredients:'#check-ingredients'}[mode]);
    };
    // Every written translation and every spoken recording, with cross-language pairs.
    for(const mode of Object.keys(samples)) for(const [index,spoken] of languages.entries()) {
      const written=languages[(index+1)%languages.length];
      await page.goto(`${base}/preview.html#${mode}`);
      assert.equal(await page.locator('#answer-language option').count(),languages.length);
      await page.selectOption('#answer-language',written);await page.selectOption('#voice-language',spoken);
      await trigger(mode);
      await page.waitForFunction(()=>{const a=document.querySelector('#sample-audio');return !a.paused&&a.currentTime>0.08;});
      await page.waitForFunction(()=>Number.isFinite(document.querySelector('#sample-audio').duration));
      const media=await page.locator('#sample-audio').evaluate(a=>({src:a.getAttribute('src'),duration:a.duration}));
      assert.equal(media.src,`/audio/${mode}-${spoken}.mp3`);assert(media.duration>4&&media.duration<65, `${mode}/${spoken}: ${media.duration}s`);
      assert.equal(await page.locator(`#${mode}-answer .demo-response`).textContent(),samples[mode][written].response);
      assert.equal(await page.locator(`#${mode}-answer .demo-spoken-text`).textContent(),samples[mode][spoken].response);
      assert.equal(await page.locator(`#${mode}-answer`).getAttribute('dir'),locales[written].direction);
      if(mode==='ingredients'){assert.equal(await page.locator('[data-ingredient] mark').count(),3);assert.equal(await page.locator('.demo-findings li').count(),3);}
      if(mode==='pharmacies'){assert.equal(await page.locator('.demo-stock-card').count(),3);assert(await page.locator('[data-stock-state="unknown"]').isVisible());}
      await page.click('#stop-conversation');assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    }
    await page.goto(`${base}/preview.html#ingredients`);await page.selectOption('#answer-language','en');await page.selectOption('#voice-language','en');await page.click('#check-ingredients');
    assert.equal(await page.locator('#ingredients-answer .demo-spoken-text').count(),0,'No redundant same-language transcript');
    await page.selectOption('#answer-language','ar');assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    assert.equal(await page.locator('#ingredients-answer').getAttribute('dir'),'rtl');
    await page.fill('#brand-query','   ');await page.locator('#brand-lookup button').click();assert(await page.locator('#brand-result').isHidden());
    await page.fill('#brand-query','Example Brand vitamin D & calcium');await page.locator('#brand-lookup button').click();
    const url=new URL(await page.locator('#brand-result').getAttribute('href'));
    assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('q'),'Example Brand vitamin D & calcium official manufacturer ingredients allergens gluten vegan');
    await page.fill('#brand-query','Another product');assert(await page.locator('#brand-result').isHidden());
    if(output) await page.locator('.demo-phone').screenshot({path:path.join(output,'ingredient-v2-arabic.png')});
    await page.goto(`${base}/preview.html#pharmacies`);await page.click('#stock-photo-button');
    await page.waitForFunction(()=>document.querySelector('#sample-audio').currentTime>0.08);
    assert(await page.locator('#stock-photo').isVisible());assert(await page.locator('[data-stock-state="out"]').isVisible());
    assert((await page.locator('#stock-results').textContent()).includes('FICTIONAL'));
    if(output) await page.locator('.demo-phone').screenshot({path:path.join(output,'stock-v2-photo.png')});
    await page.fill('#stock-product','<img src=x onerror=alert(1)>');assert(await page.locator('#stock-results').isHidden());
    await page.locator('#stock-sample-form button').click();assert.equal(await page.locator('.demo-stock-card').count(),0);assert((await page.locator('#stock-message').textContent()).includes('No live stock search'));
    await page.fill('#stock-product','Paracetamol 500 mg tablets');await page.locator('#stock-product').press('Enter');assert.equal(await page.locator('.demo-stock-card').count(),3);
    await page.locator('.demo-tabs a[href="#documents"]').click();await page.waitForFunction(()=>!document.querySelector('#documents').hidden);assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    await page.uncheck('input[value="medicine"]');await page.uncheck('input[value="blood"]');assert(await page.locator('#ask-documents').isDisabled());
    await page.check('input[value="hospital"]');await page.selectOption('#answer-language','vi');await page.click('#ask-documents');
    assert((await page.locator('#documents-answer .demo-note').textContent()).includes('Báo cáo bệnh viện'));
    await page.check('input[value="medicine"]');assert(await page.locator('#documents-answer').isHidden());assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    await page.goto(`${base}/preview.html#unknown`);assert(await page.locator('#conversation').isVisible());
    await page.click('#play-conversation');await page.click('#play-conversation');await page.waitForFunction(()=>document.querySelector('#sample-audio').currentTime>0.08);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    await page.goto(`${base}/preview.html`);await page.route('**/audio/**',route=>route.abort());await page.click('#play-conversation');
    await page.waitForFunction(message=>document.querySelector('#playback-status').textContent===message,locales.en.failed);assert(await page.locator('#stop-conversation').isHidden());assert(await page.locator('#conversation-answer .demo-response').isVisible());await page.unroute('**/audio/**');
    await page.goto(`${base}/preview.html#ingredients`);await page.selectOption('#answer-language','vi');await page.selectOption('#voice-language','vi');await page.click('#check-ingredients');await page.waitForFunction(()=>document.querySelector('#sample-audio').currentTime>0.08);
    if(output) await page.locator('.demo-phone').screenshot({path:path.join(output,'ingredient-v2-vietnamese.png')});
    await page.locator('#sample-audio').evaluate(a=>{a.playbackRate=4;});await page.waitForFunction(message=>document.querySelector('#playback-status').textContent===message,locales.vi.complete,{timeout:25000});assert(await page.locator('#stop-conversation').isHidden());
    for(const mode of Object.keys(samples)) {await page.setViewportSize({width:320,height:750});await page.goto(`${base}/preview.html#${mode}`);await page.selectOption('#answer-language','ar');await trigger(mode);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`No mobile overflow: ${mode}`);await page.click('#stop-conversation');}
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${languages.length} languages; ${Object.keys(manifest).length} neural recordings/script hashes; real playback in all four modes; translations/RTL; ingredient flags and brand lookup; typed/photo stock samples; cancellation, errors and four viewport layouts.`);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
