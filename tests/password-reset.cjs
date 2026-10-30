const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const api = 'https://rcsuzwkivqejkxdjbhks.supabase.co';
const user = {id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@example.test',app_metadata:{},user_metadata:{},created_at:'2026-10-28T00:00:00Z'};
const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,iss:api+'/auth/v1',aud:'authenticated',role:'authenticated',aal:'aal1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),Buffer.from('SYNTHETIC_NOT_A_SIGNATURE').toString('base64url')].join('.');
const jwtAal2=[jwt.split('.')[0],Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')),aal:'aal2'})).toString('base64url'),jwt.split('.')[2]].join('.');
const factor={id:'00000000-0000-4000-8000-000000000002',factor_type:'totp',status:'verified'};
const fragment = '#access_token='+jwt+'&refresh_token=SYNTHETIC_REFRESH&type=recovery&token_type=bearer&expires_in=3600';
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = path.join(root,pathname.endsWith('/')?pathname+'index.html':pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,raw)=>{
    if(error){res.writeHead(404);return res.end();}
    const type = {'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'text/plain';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(raw);
  });
});
const luminance=css=>{const channels=css.match(/[0-9.]+/g).slice(0,3).map(v=>{const s=Number(v)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
const rows=[];
const check = (name,fn)=>{fn();rows.push(name);};
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const requests=[]; let mode='normal'; let releaseRecover; let releaseUser; let releaseOtp;
    await context.route('**/*',async route=>{
      const request=route.request(),url=request.url();
      if(url.startsWith(base+'/'))return route.continue();
      assert(url.startsWith(api+'/auth/v1/'),'Only expected Auth origin may receive a request');
      requests.push({url,method:request.method(),body:request.postData(),headers:request.headers()});
      const reply=(status,data)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','x-supabase-api-version':'2024-01-01','Access-Control-Expose-Headers':'x-supabase-api-version'},body:JSON.stringify(data)});
      if(request.method()==='OPTIONS')return reply(200,{});
      if(url.includes('/recover')){
        if(mode==='delayRecover')await new Promise(resolve=>releaseRecover=resolve);
        return mode==='recoverError'?reply(429,{message:'synthetic throttle'}):reply(200,{});
      }
      const responseUser=mode.startsWith('mfa')?{...user,factors:[factor]}:user;
      if(new URL(url).pathname==='/auth/v1/verify'){
        if(mode==='delayOtp')await new Promise(resolve=>releaseOtp=resolve);
        const body=JSON.parse(request.postData());
        if(mode==='otpExpired')return reply(403,{code:'otp_expired',message:'SYNTHETIC_PRIVATE_ERROR_NOT_FOR_UI'});
        if(mode==='otpUnknown')return reply(403,{code:'user_not_found',message:'SYNTHETIC_ACCOUNT_EXISTENCE_NOT_FOR_UI'});
        if(mode==='otpNoSession')return reply(200,{user:responseUser});
        if(mode==='otpError'||body.email!==user.email)return reply(403,{message:'synthetic invalid recovery code'});
        assert.equal(body.type,'recovery');assert.equal(typeof body.token,'string');
        return reply(200,{access_token:jwt,refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:responseUser});
      }
      if(url.endsWith('/factors/'+factor.id+'/challenge'))return reply(200,{id:'synthetic-challenge',type:'totp',expires_at:9999999999});
      if(url.endsWith('/factors/'+factor.id+'/verify'))return mode==='mfaReject'?reply(400,{message:'synthetic wrong code'}):reply(200,{access_token:mode==='mfaAal1'?jwt:jwtAal2,refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user:responseUser});
      if(url.endsWith('/user')&&request.method()==='GET'){
        if(mode==='delayUser')await new Promise(resolve=>releaseUser=resolve);
        return mode==='expired'?reply(401,{message:'synthetic expired'}):reply(200,responseUser);
      }
      if(url.endsWith('/reauthenticate'))return mode==='reauthSendError'?reply(429,{code:'over_email_send_rate_limit',message:'PRIVATE'}):reply(200,{});
      if(url.endsWith('/user')&&request.method()==='PUT'&&mode.startsWith('reauth')){
        const body=JSON.parse(request.postData());
        if(!body.nonce)return reply(422,{code:'reauthentication_needed',message:'PRIVATE'});
        if(body.nonce!=='12345678')return reply(422,{code:'reauthentication_not_valid',message:'PRIVATE'});
        return reply(200,responseUser);
      }
      if(url.endsWith('/user')&&request.method()==='PUT')return mode==='saveError'?reply(422,{message:'synthetic rejected'}):reply(200,responseUser);
      if(url.includes('/logout'))return reply(204,{});
      throw Error('Unexpected Auth operation: '+new URL(url).pathname);
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/admin/');
    await page.getByRole('link',{name:'Forgot password?',exact:true}).click();
    await page.waitForURL('**/admin/reset.html');
    check('visible owner recovery link; no automatic auth call',()=>{assert.equal(requests.length,0);});
    await page.getByLabel('PharmaSNAP email',{exact:true}).fill('synthetic@example.test');
    await page.getByRole('button',{name:'Send reset code',exact:true}).click();
    await page.getByText('If this email belongs to a PharmaSNAP account,',{exact:false}).waitFor();
    check('request uses fixed HTTPS callback and public existing client',()=>{
      const r=requests.find(r=>r.url.includes('/recover'));const u=new URL(r.url);assert.equal(u.searchParams.get('redirect_to'),'https://pharmasnap.app/admin/reset.html');assert.equal(JSON.parse(r.body).email,user.email);
      const payload=JSON.parse(Buffer.from(r.headers.apikey.split('.')[1],'base64url'));assert.equal(payload.role,'anon');
    });
    assert(await page.locator('#emailCodeSection').isVisible());assert(await page.locator('#reset').isHidden());
    rows.push('request leads directly to email code form, never a false password-ready state');
    await page.locator('#emailResetCode').fill('123456');
    await page.getByRole('button',{name:'Continue with code',exact:true}).click();
    await page.locator('#reset').waitFor({state:'visible'});
    check('actual SDK exchanges exact email and code with fixed recovery type',()=>{
      const r=requests.find(r=>new URL(r.url).pathname==='/auth/v1/verify');
      assert.deepEqual(JSON.parse(r.body),{email:user.email,token:'123456',type:'recovery',gotrue_meta_security:{}});
    });
    assert.equal(await page.locator('#emailResetCode').inputValue(),'');rows.push('email code cleared before awaiting recovery');
    await page.goto('about:blank');await page.goto(base+'/admin/reset.html');
    await page.getByRole('button',{name:'I already have a code',exact:true}).click();
    assert(await page.locator('#emailCodeSection').isVisible());assert(await page.locator('#requestSection').isHidden());rows.push('fresh page can use existing code without another email request');
    await page.locator('#codeEmail').fill(user.email);await page.locator('#emailResetCode').fill('999999');mode='otpError';
    const beforeWrong=requests.filter(r=>r.method==='PUT').length;
    await page.getByRole('button',{name:'Continue with code',exact:true}).click();await page.getByText('The code could not be used.',{exact:false}).waitFor();
    assert(await page.locator('#reset').isHidden());assert.equal(await page.locator('#emailResetCode').inputValue(),'');assert.equal(requests.filter(r=>r.method==='PUT').length,beforeWrong);rows.push('wrong or expired code fails without exposing password form');
    for(const [testMode,helpCode]of [['otpExpired','OTP_EXPIRED (HTTP 403)'],['otpUnknown','RESET_REJECTED (HTTP 403)'],['otpNoSession','RESET_NO_SESSION']]){
      mode=testMode;await page.locator('#codeEmail').fill(user.email);await page.locator('#emailResetCode').fill('123456');await page.getByRole('button',{name:'Continue with code',exact:true}).click();await page.getByText('Support reference: '+helpCode+'.',{exact:false}).waitFor();
      const msg=await page.locator('#message').innerText();assert(!msg.includes('SYNTHETIC_'));assert(!msg.includes('user_not_found'));assert(await page.locator('#reset').isHidden());assert.equal(await page.locator('#emailResetCode').inputValue(),'');rows.push('safe actionable help code without private error data '+testMode);
    }
    const errorModule=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'admin/source/recovery-error.js')).toString('base64'));
    const poisoned={code:'otp_expired',status:403,get message(){throw Error('Private message must never be read');},toJSON(){throw Error('Error serialization must never happen');}};
    check('diagnostics never read or serialize private error messages',()=>assert(errorModule.recoveryProblem(poisoned).includes('OTP_EXPIRED (HTTP 403)')));
    check('untrusted code and status cannot reach recovery UI',()=>{const x=errorModule.recoveryProblem({code:'<img src=x onerror=alert(1)>',status:999,message:'PRIVATE'});assert(!x.includes('<img'));assert(!x.includes('999'));assert(!x.includes('PRIVATE'));assert(x.includes('RESET_REJECTED'));});
    for(const [code,status,help]of [['over_request_rate_limit',429,'RESET_TRY_LATER'],['over_email_send_rate_limit',429,'RESET_TRY_LATER'],['validation_failed',422,'RESET_FORMAT'],['captcha_failed',400,'RESET_SECURITY_CHECK']])check('allowlisted help mapping '+code,()=>assert(errorModule.recoveryProblem({code,status}).includes(help+' (HTTP '+status+')')));
    mode='normal';await page.locator('#codeEmail').fill('other@example.test');await page.locator('#emailResetCode').fill('123456');await page.getByRole('button',{name:'Continue with code',exact:true}).click();await page.getByText('The code could not be used.',{exact:false}).waitFor();assert(await page.locator('#reset').isHidden());rows.push('code for a different email cannot recover account');
    await page.getByRole('button',{name:'Send another code',exact:true}).click();assert(await page.locator('#requestSection').isVisible());assert.equal(await page.locator('#email').inputValue(),'other@example.test');assert.equal(await page.locator('#emailResetCode').inputValue(),'');rows.push('resend returns to clean request form with email only');
    for(const suffix of ['?code=SYNTHETIC_QUERY','?error=access_denied&error_description=SYNTHETIC_ERROR','?token_hash=SYNTHETIC_HASH&type=recovery']){
      const before=requests.length;await page.goto('about:blank');await page.goto(base+'/admin/reset.html'+suffix);await page.getByText('This link did not complete recovery.',{exact:false}).waitFor();
      assert.equal(new URL(page.url()).search,'');assert.equal(requests.length,before);assert(await page.locator('#reset').isHidden());rows.push('query callback visibly explains fresh code route '+rows.length);
    }
    for(const suffix of ['#access_token=x&type=signup','#access_token=x&type=recovery&type=recovery','#access_token=x&refresh_token=y&type=recovery&token_type=bearer&next=https://evil.test']){
      const before=requests.length;await page.goto('about:blank');await page.goto(base+'/admin/reset.html'+suffix);await page.getByText('This reset link is incomplete',{exact:false}).waitFor();
      check('invalid/duplicate/nonrecovery fragment refused '+rows.length,()=>{assert.equal(requests.length,before);assert.equal(new URL(page.url()).hash,'');});
      assert(await page.locator('#reset').isHidden());
    }
    mode='recoverError';await page.getByLabel('PharmaSNAP email',{exact:true}).fill('synthetic@example.test');await page.getByRole('button',{name:'Send reset code',exact:true}).click();await page.getByText('The reset email could not be requested.',{exact:false}).waitFor();rows.push('request failures actionable, not false success');
    mode='normal';await page.goto('about:blank');await page.goto(base+'/admin/reset.html?redirect_to=https://evil.test'+fragment);
    try{await page.locator('#reset').waitFor({state:'visible'});}catch(e){console.error(JSON.stringify({message:await page.locator('#message').innerText(),authPaths:requests.map(r=>({path:new URL(r.url).pathname,method:r.method})),errors}));throw e;}
    check('actual SDK validates recovery session, scrubs URL, no owner RPC',()=>{assert.equal(new URL(page.url()).hash,'');assert.equal(new URL(page.url()).search,'');assert(requests.some(r=>r.url.endsWith('/user')&&r.method==='GET'));assert(requests.every(r=>!r.url.includes('/rest/')));});
    const activeStorage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}));check('active recovery session never persisted',()=>assert.deepEqual(activeStorage,{local:[],session:[]}));
    assert.equal(await page.locator('#newPassword').inputValue(),'');
    await page.getByLabel('New password',{exact:true}).fill('SyntheticPasswordOnly1!');await page.getByLabel('Enter the new password again',{exact:true}).fill('DifferentSyntheticOnly1!');const beforeMismatch=requests.length;await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Use at least 15 characters and enter the same new password twice.',{exact:true}).waitFor();
    check('mismatch refused, both inputs cleared',()=>assert.equal(requests.length,beforeMismatch));assert.equal(await page.locator('#newPassword').inputValue(),'');assert.equal(await page.locator('#repeatPassword').inputValue(),'');
    mode='saveError';await page.locator('#newPassword').fill('SyntheticPasswordOnly1!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly1!');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('The password could not be saved.',{exact:false}).waitFor();assert.equal(await page.locator('#newPassword').inputValue(),'');rows.push('save failure retained as failure; no credential echoed');
    mode='normal';await page.locator('#newPassword').fill('SyntheticPasswordOnly1!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly1!');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Password saved.',{exact:false}).waitFor();
    check('valid change sends exact synthetic password to Auth only',()=>{const puts=requests.filter(r=>r.method==='PUT');assert.equal(puts.length,2);assert.deepEqual(JSON.parse(puts[1].body),{password:'SyntheticPasswordOnly1!',code_challenge:null,code_challenge_method:null});});
    assert(await page.locator('#reset').isHidden());assert.equal(await page.locator('#newPassword').inputValue(),'');assert.equal(await page.locator('#repeatPassword').inputValue(),'');assert(!(await page.locator('body').innerText()).includes('SyntheticPasswordOnly1!'));
    const storage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}));check('no tokens, passwords or sessions persisted',()=>{assert.deepEqual(storage,{local:[],session:[]});});
    await page.getByRole('link',{name:'Back to owner sign-in',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/admin/');rows.push('return requires normal owner password and authenticator');
    mode='reauth';await page.goto('about:blank');await page.goto(base+'/admin/reset.html'+fragment);await page.locator('#reset').waitFor({state:'visible'});
    assert.equal(await page.locator('#newPassword').getAttribute('minlength'),'15');
    assert.equal(await page.locator('#repeatPassword').getAttribute('minlength'),'15');
    await page.locator('#newPassword').fill('short-password');await page.locator('#repeatPassword').fill('short-password');const beforeShort=requests.filter(r=>r.method==='PUT').length;
    await page.locator('#reset').dispatchEvent('submit');await page.getByText('Use at least 15 characters and enter the same new password twice.',{exact:true}).waitFor();assert.equal(requests.filter(r=>r.method==='PUT').length,beforeShort);rows.push('browser and programmatic password minimum15 match live policy');
    await page.locator('#newPassword').fill('SyntheticPasswordOnly3!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly3!');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.locator('#securitySection').waitFor({state:'visible'});
    assert.equal(requests.filter(r=>r.url.endsWith('/reauthenticate')).length,0);assert.equal(await page.locator('#newPassword').inputValue(),'');rows.push('old session requests explicit security step without sending email automatically');
    await page.getByRole('button',{name:'Send security code',exact:true}).click();await page.getByText('A security code was requested',{exact:false}).waitFor();const afterSend=requests.filter(r=>r.url.endsWith('/reauthenticate')).length;
    await page.locator('#sendSecurityCode').dispatchEvent('click');assert.equal(requests.filter(r=>r.url.endsWith('/reauthenticate')).length,afterSend);rows.push('explicit security email has local cooldown');
    await page.locator('#newPassword').fill('SyntheticPasswordOnly3!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly3!');await page.locator('#securityCode').fill('87654321');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Request a fresh security code',{exact:false}).waitFor();assert.equal(await page.locator('#securityCode').inputValue(),'');assert(!await page.locator('#reset').isHidden());rows.push('rejected nonce clears code/password without success');
    await page.locator('#newPassword').fill('SyntheticPasswordOnly3!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly3!');await page.locator('#securityCode').fill('12345678');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Password saved.',{exact:false}).waitFor();assert.equal(JSON.parse(requests.filter(r=>r.method==='PUT').at(-1).body).nonce,'12345678');assert(await page.locator('#securitySection').isHidden());rows.push('actual SDK sends one fresh nonce, then clears recovery session');
    mode='expired';await page.goto('about:blank');await page.goto(base+'/admin/reset.html'+fragment);await page.getByText('This reset link could not be opened.',{exact:false}).waitFor();assert(await page.locator('#reset').isHidden());rows.push('expired link cannot reveal password change form');
    mode='delayRecover';await page.locator('#email').fill(user.email);await page.getByRole('button',{name:'Send reset code',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#request button').disabled);const beforeDouble=requests.filter(r=>r.url.includes('/recover')).length;await page.locator('#request').dispatchEvent('submit');assert.equal(requests.filter(r=>r.url.includes('/recover')).length,beforeDouble);releaseRecover();await page.getByText('If this email belongs',{exact:false}).waitFor();rows.push('pending request disables button and rejects duplicate submit');
    mode='mfaReject';await page.goto('about:blank');await page.goto(base+'/admin/reset.html');await page.getByRole('button',{name:'I already have a code',exact:true}).click();await page.locator('#codeEmail').fill(user.email);await page.locator('#emailResetCode').fill('12345678');await page.getByRole('button',{name:'Continue with code',exact:true}).click();await page.locator('#mfaSection').waitFor({state:'visible'});assert(await page.locator('#reset').isHidden());
    const mfaStorage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}));check('active MFA recovery session never persisted',()=>assert.deepEqual(mfaStorage,{local:[],session:[]}));
    const beforeMfa=requests.filter(r=>r.method==='PUT').length;await page.locator('#reset').dispatchEvent('submit');await page.getByText('Use your email reset code',{exact:false}).waitFor();assert.equal(requests.filter(r=>r.method==='PUT').length,beforeMfa);rows.push('enrolled owner cannot change password before existing MFA');
    await page.locator('#recoveryCode').fill('123456');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByText('The authenticator code was not accepted.',{exact:false}).waitFor();assert.equal(await page.locator('#recoveryCode').inputValue(),'');assert(await page.locator('#reset').isHidden());rows.push('wrong existing authenticator code refused and cleared');
    mode='mfaAal1';await page.locator('#recoveryCode').fill('234567');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByText('The second sign-in step did not complete.',{exact:false}).waitFor();assert(await page.locator('#reset').isHidden());rows.push('success response without AAL2 cannot unlock password form');
    mode='mfaGood';await page.locator('#recoveryCode').fill('345678');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#reset').waitFor({state:'visible'});assert(await page.locator('#mfaSection').isHidden());assert.equal(await page.locator('#recoveryCode').inputValue(),'');
    await page.locator('#newPassword').fill('SyntheticPasswordOnly2!');await page.locator('#repeatPassword').fill('SyntheticPasswordOnly2!');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Password saved.',{exact:false}).waitFor();
    check('existing-factor MFA earns AAL2; never enrolls or removes factors',()=>{const last=requests.filter(r=>r.method==='PUT').at(-1);assert.equal(JSON.parse(Buffer.from(last.headers.authorization.split(' ')[1].split('.')[1],'base64url')).aal,'aal2');assert(requests.filter(r=>r.url.includes('/factors')).every(r=>r.method==='POST'&&(r.url.endsWith('/challenge')||r.url.endsWith('/verify'))));});
    mode='delayUser';releaseUser=null;await page.goto('about:blank');await page.goto(base+'/admin/reset.html'+fragment);for(let n=0;n<100&&!releaseUser;n++)await new Promise(r=>setTimeout(r,20));assert(releaseUser);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));releaseUser();await page.waitForTimeout(250);assert(await page.locator('#reset').isHidden());assert(await page.locator('#mfaSection').isHidden());assert(await page.locator('#requestSection').isVisible());rows.push('late callback after leaving page cannot revive recovery form');
    mode='delayOtp';releaseOtp=null;await page.goto('about:blank');await page.goto(base+'/admin/reset.html');await page.getByRole('button',{name:'I already have a code',exact:true}).click();await page.locator('#codeEmail').fill(user.email);await page.locator('#emailResetCode').fill('1234567890');await page.getByRole('button',{name:'Continue with code',exact:true}).click();for(let n=0;n<100&&!releaseOtp;n++)await new Promise(r=>setTimeout(r,20));assert(releaseOtp);
    const otpCount=requests.filter(r=>new URL(r.url).pathname==='/auth/v1/verify').length;await page.locator('#emailCodeForm').dispatchEvent('submit');assert.equal(requests.filter(r=>new URL(r.url).pathname==='/auth/v1/verify').length,otpCount);rows.push('pending OTP disables duplicate exchange');
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));releaseOtp();await page.waitForTimeout(250);assert(await page.locator('#reset').isHidden());assert(await page.locator('#mfaSection').isHidden());assert.equal(await page.locator('#emailResetCode').inputValue(),'');rows.push('late OTP after leaving page cannot revive password form');
    mode='normal';await page.goto('about:blank');await page.goto(base+'/admin/reset.html');for(const theme of ['light','dark']){await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width:320,height:750});const colors=await page.getByRole('link',{name:'Back to owner sign-in',exact:true}).evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el.closest('section')).backgroundColor}));const l=[luminance(colors.fg),luminance(colors.bg)].sort((a,b)=>b-a);check('recovery link contrast '+theme,()=>assert((l[0]+.05)/(l[1]+.05)>=4.5));rows.push('no horizontal clipping '+theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const b=await page.getByRole('button',{name:'Send reset code',exact:true}).boundingBox();assert(b.height>=44);}
    if(process.env.PHARMASNAP_SCREENSHOTS_DIR){fs.mkdirSync(process.env.PHARMASNAP_SCREENSHOTS_DIR,{recursive:true});await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});await page.screenshot({path:path.join(process.env.PHARMASNAP_SCREENSHOTS_DIR,'password-recovery-mobile.png')});}
    check('no script errors; auth and public pages only',()=>assert.deepEqual(errors,[]));
    await context.close();console.log(JSON.stringify({status:'PASS',checks:rows.length,rows,actualEmailsSent:0,actualPasswordsChanged:0,actualOwnerAccessChanges:0}));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
