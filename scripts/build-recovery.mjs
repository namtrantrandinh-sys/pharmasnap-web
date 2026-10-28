import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const config = JSON.parse(readFileSync(new URL('../admin/public-config.json', import.meta.url)));
if (config.url !== 'https://rcsuzwkivqejkxdjbhks.supabase.co') throw Error('Unexpected public origin');
const claims = JSON.parse(Buffer.from(config.anon.split('.')[1], 'base64url'));
if (claims.role !== 'anon') throw Error('Only an existing public anon key may enter the browser build');
await build({entryPoints: ['admin/source/password-reset.js'], outfile: 'admin/password-reset.js', bundle: true, platform: 'browser', format: 'iife', minify: true, define: {__OWNER_PUBLIC_CONFIG__: JSON.stringify(config)}});
console.log('Recovery built using public client configuration only.');
