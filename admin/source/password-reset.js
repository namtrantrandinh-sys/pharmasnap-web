import {createClient} from '@supabase/supabase-js';

// Recovery has its own memory-only session. It cannot open owner tools or set roles.
const RESET_URL = 'https://pharmasnap.app/admin/reset.html';
const $ = id => document.getElementById(id);
const message = text => { $('message').textContent = text; };
if (window.top !== window.self) {
  document.body.textContent = 'Open password recovery directly in its own page.';
  throw new Error('Framed recovery refused');
}
// Only a one-time recovery fragment is accepted. Remove it before any network call.
const fragment = new URLSearchParams(window.location.hash.slice(1));
window.history.replaceState(null, '', window.location.pathname);
const config = __OWNER_PUBLIC_CONFIG__;
const client = createClient(config.url, config.anon, {
  global: {fetch: (url, init = {}) => fetch(url, {...init, cache: 'no-store', credentials: 'omit'})},
  auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit'},
});
let recoveryReady = false;
let recoveryFactor = null;
let needsMfa = false;
let generation = 0;
let busy = false;
const clearPasswords = () => { $('newPassword').value = ''; $('repeatPassword').value = ''; };
function clear() {
  generation++;
  recoveryReady = false;
  recoveryFactor = null;
  needsMfa = false;
  clearPasswords();
  $('recoveryCode').value = '';
  $('mfaSection').hidden = true;
  $('reset').hidden = true;
  $('requestSection').hidden = false;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  const g = generation;
  for (const b of document.querySelectorAll('button')) b.disabled = true;
  try { await fn(g); }
  catch { if (g === generation) message('This request did not complete. Check your connection and try again.'); }
  finally {
    busy = false;
    for (const b of document.querySelectorAll('button')) b.disabled = false;
  }
}
$('request').onsubmit = e => {
  e.preventDefault();
  void run(async g => {
    const email = $('email').value.trim();
    if (!$('email').checkValidity() || !email) {
      message('Enter the email you use for PharmaSNAP.');
      return;
    }
    const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: RESET_URL});
    if (g !== generation) return;
    message(error
      ? 'The reset email could not be requested. Wait a moment and try again.'
      : 'If this email belongs to a PharmaSNAP account, a reset link will arrive shortly. Check your inbox and spam folder, then open the link to choose a new password.');
  });
};
$('reset').onsubmit = e => {
  e.preventDefault();
  void run(async g => {
    if (!recoveryReady) {
      clearPasswords();
      message('Open a fresh password-reset email before choosing a password.');
      return;
    }
    if (needsMfa) {
      const {data, error} = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (g !== generation) return;
      if (error || data.currentLevel !== 'aal2') {
        clearPasswords();
        recoveryReady = false;
        $('reset').hidden = true;
        $('mfaSection').hidden = false;
        message('Enter a current code from your existing authenticator before changing your password.');
        return;
      }
    }
    const password = $('newPassword').value;
    const repeated = $('repeatPassword').value;
    clearPasswords();
    if (password.length < 8 || password !== repeated) {
      message('Use at least 8 characters and enter the same new password twice.');
      return;
    }
    const {error} = await client.auth.updateUser({password});
    if (g !== generation) return;
    if (error) {
      message('The password could not be saved. Use a different password or request a fresh reset link. If your account has an authenticator, keep it available.');
      return;
    }
    clear();
    $('requestSection').hidden = true;
    await client.auth.signOut({scope: 'local'});
    message('Password saved. Use it in PharmaSNAP and the owner sign-in. Owner access still requires your authenticator.');
  });
};
$('recoveryMfa').onsubmit = e => {
  e.preventDefault();
  void run(async g => {
    const code = $('recoveryCode').value.trim();
    $('recoveryCode').value = '';
    if (!recoveryFactor || !/^[0-9]{6}$/.test(code)) {
      message('Enter the six-digit code from your existing authenticator.');
      return;
    }
    const {error} = await client.auth.mfa.challengeAndVerify({factorId: recoveryFactor, code});
    if (g !== generation) return;
    if (error) { message('The authenticator code was not accepted. Try a current code.'); return; }
    const {data, error: assuranceError} = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (g !== generation) return;
    if (assuranceError || data.currentLevel !== 'aal2') {
      message('The second sign-in step did not complete. Try a current authenticator code.');
      return;
    }
    recoveryReady = true;
    $('mfaSection').hidden = true;
    $('reset').hidden = false;
    message('Choose your new PharmaSNAP password. Keep it out of chat.');
    $('newPassword').focus();
  });
};
const allowed = new Set(['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'type']);
const hasCallback = [...fragment.keys()].length > 0;
if (hasCallback) {
  const keys = [...fragment.keys()];
  const valid = keys.every(key => allowed.has(key) && fragment.getAll(key).length === 1)
    && fragment.get('type') === 'recovery'
    && fragment.get('token_type') === 'bearer'
    && fragment.get('access_token')?.length > 0
    && fragment.get('refresh_token')?.length > 0;
  if (!valid) message('This reset link is incomplete or has expired. Request a fresh link below.');
  else void run(async g => {
    const access_token = fragment.get('access_token');
    const refresh_token = fragment.get('refresh_token');
    for (const key of keys) fragment.delete(key);
    const {data, error} = await client.auth.setSession({access_token, refresh_token});
    if (g !== generation) { await client.auth.signOut({scope: 'local'}); return; }
    if (error || !data.session) {
      await client.auth.signOut({scope: 'local'});
      message('This reset link could not be opened. Request a fresh link below.');
      return;
    }
    const {data: userData, error: userError} = await client.auth.getUser();
    if (g !== generation) return;
    if (userError || !userData.user) {
      await client.auth.signOut({scope: 'local'});
      message('This reset link could not be opened. Request a fresh link below.');
      return;
    }
    const {data: factors, error: factorError} = await client.auth.mfa.listFactors();
    if (g !== generation) return;
    if (factorError) {
      message('The account’s authenticator details could not be loaded. Request a fresh link and try again.');
      return;
    }
    const verified = factors.all.filter(f => f.status === 'verified');
    needsMfa = verified.length > 0;
    recoveryFactor = factors.totp.find(f => f.status === 'verified')?.id ?? null;
    if (needsMfa) {
      $('requestSection').hidden = true;
      if (!recoveryFactor) {
        message('This account needs its existing second sign-in method. Use PharmaSNAP’s sign-in recovery or contact support.');
        return;
      }
      $('mfaSection').hidden = false;
      message('Enter a code from your existing authenticator. Recovery keeps your second sign-in step.');
      $('recoveryCode').focus();
      return;
    }
    recoveryReady = true;
    $('requestSection').hidden = true;
    $('reset').hidden = false;
    message('Choose your new PharmaSNAP password. Keep it out of chat.');
    $('newPassword').focus();
  });
}
window.addEventListener('pagehide', () => {
  clear();
  $('email').value = '';
  void client.auth.signOut({scope: 'local'});
});
