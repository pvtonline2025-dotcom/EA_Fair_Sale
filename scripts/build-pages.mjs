// Deploy this existing flat static website to Cloudflare Pages.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dest = path.join(root, 'dist');
const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const key = (process.env.SUPABASE_PUBLISHABLE_KEY ?? '').trim();
const branch = (process.env.CF_PAGES_BRANCH ?? '').trim();

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  throw new Error('Set SUPABASE_URL in Cloudflare Pages environment variables.');
}
if (!key || key.startsWith('sb_secret_') || key.includes('YOUR_') || key.length < 24) {
  throw new Error('Set SUPABASE_PUBLISHABLE_KEY to a public publishable/anon key, not secret.');
}
if (key.includes('.') && key.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role !== 'anon') throw new Error('JWT role is not anon');
  } catch (e) {
    throw new Error('Invalid/unsafe legacy anon JWT: ' + e.message);
  }
}

const resources = ['index.html', 'index.js', 'index.css', 'manifest.json',
  'sw.js', 'fetch-wrapper.js', 'css', 'js', 'assets', 'images'];
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const r of resources) {
  const source = path.join(root, r);
  if (!fs.existsSync(source)) {
    if (r === 'images') continue;  // optional duplicated image directory
    throw new Error('Missing required static file or directory: ' + r);
  }
  fs.cpSync(source, path.join(dest, r), { recursive: true });
}
const config = {
  url,
  key,
  managed: true,
  environment: branch === 'main' ? 'PROD' : 'DEV'
};
fs.writeFileSync(path.join(dest, 'supabase-config.js'),
  'window.EA_SUPABASE_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n');
console.log('Built static website:', branch || 'local', '=>', config.environment, new URL(url).host);
