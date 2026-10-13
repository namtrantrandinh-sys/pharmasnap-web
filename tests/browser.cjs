const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.PHARMASNAP_SCREENSHOTS_DIR;
if (output) fs.mkdirSync(output, {recursive:true});
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'demo-samples.js'),'utf8'),context);
const samples = context.window.PharmaSnapSamples.samples;
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  const filename = path.join(root, pathname === '/' ? 'index.html' : pathname);
  fs.readFile(filename,(error,data) => {
    if(error) {res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(data);
  });
});
(async()=> {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    for (const size of [{width:1440,height:1000},{width:820,height:1000},{width:390,height:844},{width:320,height:750}]) {
      await page.setViewportSize(size);
      await page.goto(base);
      await page.locator('.hero-shot img').evaluate(img=>img.decode());
      assert(await page.locator('.lede').textContent().then(t=>t.includes('skin condition')));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false,`No overflow at ${size.width}`);
      if(size.width>734) {
        const copy=await page.locator('.hero-copy').boundingBox(),image=await page.locator('.hero-shot').boundingBox();
        assert(image.x>=copy.x+copy.width-1,'Photo alongside words');
        assert(image.width<=size.width/2,'Hero photo at most half screen');
        assert(Math.abs(image.width-copy.width)<2,'Equal columns');
      }
      if (output) await page.screenshot({path:path.join(output,`homepage-${size.width}.png`),fullPage: size.width===390});
    }
    // Product/location search builds safe external links without sending inputs.
    await page.goto(base);
    await page.locator('#pharmacy-finder').scrollIntoViewIfNeeded();
    await page.fill('#pharmacy-product','   ');
    await page.fill('#pharmacy-place','Ballarat VIC');
    await page.locator('#pharmacy-search button').click();
    assert(await page.locator('#pharmacy-results').isHidden());
    assert.equal(await page.locator('#pharmacy-product').evaluate(input=>input.validity.valid),false);
    const product = 'Vitamin C & zinc 500 mg';
    const place = 'Ballarat VIC 3350';
    await page.fill('#pharmacy-product',product);
    await page.fill('#pharmacy-place',place);
    await page.locator('#pharmacy-place').press('Enter');
    const maps=new URL(await page.locator('#pharmacy-maps').getAttribute('href'));
    const listings=new URL(await page.locator('#pharmacy-products').getAttribute('href'));
    assert.equal(maps.origin,'https://www.google.com');
    assert.equal(maps.searchParams.get('api'),'1');
    assert.equal(maps.searchParams.get('query'),`pharmacies near ${place}, Australia`);
    assert.equal(listings.searchParams.get('q'),`${product} pharmacy ${place} Australia`);
    assert((await page.locator('#pharmacy-summary').textContent()).includes(product));
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(output) await page.locator('#pharmacy-finder').screenshot({path:path.join(output,`pharmacy-finder-${width}.png`)});
    }
    await page.fill('#pharmacy-product','<img src=x onerror=alert(1)>');
    assert(await page.locator('#pharmacy-results').isHidden());
    await page.locator('#pharmacy-search button').click();
    assert.equal(await page.locator('#pharmacy-summary img').count(),0);
    assert((await page.locator('#pharmacy-summary').textContent()).includes('<img'));
    await page.fill('#pharmacy-place','Melbourne VIC');
    assert(await page.locator('#pharmacy-results').isHidden());
    await page.setViewportSize({width:1000,height:1000});
    for(const mode of Object.keys(samples)) {
      for (const written of ['en','vi']) for (const spoken of ['en','vi']) {
        await page.goto(`${base}/preview.html#${mode}`);
        await page.selectOption('#answer-language',written);
        await page.selectOption('#voice-language',spoken);
        const button = {conversation:'#play-conversation',documents:'#ask-documents',ingredients:'#check-ingredients'}[mode];
        await page.click(button);
        await page.waitForFunction(()=>{const a=document.querySelector('#sample-audio');return !a.paused && a.currentTime>0.1;});
        const media=await page.locator('#sample-audio').evaluate(a=>({src:a.getAttribute('src'),duration:a.duration}));
        assert.equal(media.src,`/audio/${mode}-${spoken}.m4a`);
        assert(media.duration>5 && media.duration<45,'Actual audio metadata');
        assert.equal(await page.locator(`#${mode}-answer .demo-response`).textContent(),samples[mode][written].response);
        if (spoken!==written) assert.equal(await page.locator(`#${mode}-answer .demo-spoken-text`).textContent(),samples[mode][spoken].response);
        else assert.equal(await page.locator(`#${mode}-answer .demo-spoken-text`).count(),0);
        if(mode==='ingredients') assert.equal(await page.locator('[data-ingredient] mark').count(),2);
        await page.click('#stop-conversation');
        assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
        assert(await page.locator('#stop-conversation').isHidden());
      }
    }
    // Cancellation on language change, route change, rapid clicks, and hidden page.
    await page.goto(`${base}/preview.html#conversation`);
    await page.click('#play-conversation');
    await page.selectOption('#answer-language','vi');
    assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    assert.equal(await page.locator('#conversation-answer .demo-response').textContent(),samples.conversation.vi.response);
    await page.click('#play-conversation');
    await page.locator('.demo-tabs a[href="#documents"]').click();
    await page.waitForFunction(()=>!document.querySelector('#documents').hidden);
    assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    await page.uncheck('input[value="medicine"]');
    await page.uncheck('input[value="blood"]');
    assert(await page.locator('#ask-documents').isDisabled());
    await page.check('input[value="hospital"]');
    await page.click('#ask-documents');
    assert((await page.locator('#documents-answer .demo-note').textContent()).includes('Báo cáo bệnh viện'));
    assert(!(await page.locator('#documents-answer .demo-note').textContent()).includes('Hộp thuốc'));
    await page.check('input[value="medicine"]');
    assert(await page.locator('#documents-answer').isHidden());
    assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    await page.goto(`${base}/preview.html#unknown`);
    assert(await page.locator('#conversation').isVisible());
    await page.click('#play-conversation');
    await page.click('#play-conversation');
    await page.waitForFunction(()=>document.querySelector('#sample-audio').currentTime>0.1);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert(await page.locator('#sample-audio').evaluate(a=>a.paused));
    // Error fallback keeps the translated answer visible, no stuck Stop control.
    await page.goto(`${base}/preview.html`);
    await page.route('**/audio/**',route=>route.abort());
    await page.click('#play-conversation');
    await page.waitForFunction(()=>document.querySelector('#playback-status').textContent.includes('could not play'));
    assert(await page.locator('#conversation-answer .demo-response').isVisible());
    assert(await page.locator('#stop-conversation').isHidden());
    await page.unroute('**/audio/**');
    // Real ended event restores the playback controls (wait on one complete clip).
    await page.goto(`${base}/preview.html#ingredients`);
    await page.selectOption('#answer-language','vi');
    await page.selectOption('#voice-language','vi');
    await page.click('#check-ingredients');
    await page.waitForFunction(()=>document.querySelector('#sample-audio').currentTime>0.1);
    if (output) await page.screenshot({path:path.join(output,'ingredient-sample-vietnamese.png')});
    await page.locator('#sample-audio').evaluate(a=>{a.playbackRate=4;});
    await page.waitForFunction(()=>document.querySelector('#playback-status').textContent==='Đã phát xong.',{},{timeout:20000});
    assert(await page.locator('#stop-conversation').isHidden());
    for(const mode of Object.keys(samples)) {
      await page.setViewportSize({width:390,height:844});
      await page.goto(`${base}/preview.html#${mode}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Demo no overflow: ${mode}`);
    }
    assert.deepEqual(errors,[],'No page script errors');
    console.log('PASS: product/suburb pharmacy links and validation; four viewport layouts; all 12 mode/language combinations play real audio; translation, selection, cancellation, replay, completion and error fallback.');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
