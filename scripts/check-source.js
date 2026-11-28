const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', '.vercel']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}
walk(root);

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  process.stdout.write('✓ ' + path.relative(root, file) + '\n');
}

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'pw-supabase.js'), 'utf8');
const ai = fs.readFileSync(path.join(root, 'api/ai.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const contracts = [
  ['stable UUID validator', /\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}/i.test(adapter)],
  ['local/cloud project reconciliation', adapter.includes('cloudProjectsById')],
  ['awaited generated project save', app.includes('await Projects.save([p,...Projects.all()])')],
  ['visible visual section editor', app.includes('pw-section-editor')],
  ['working 3D model upload handler', app.includes('uploadAsset(file,S.id)') && app.includes('data-three-model')],
  ['Studio design/media/history panels', ['themePanel','mediaPanel','historyPanel'].every(x => app.includes(x))],
  ['service-card media management', app.includes("key:'itemImage'") && app.includes("d.mediaKey==='itemImage'")],
  ['Supabase Storage uploads', adapter.includes("storage.from('primewebs-media').upload") && app.includes('data-media-upload')],
  ['Storage migration tracked', fs.existsSync(path.join(root, 'supabase/migrations/20261126230521_create_primewebs_media_bucket.sql'))],
  ['valid Anthropic fallback model', ai.includes('claude-sonnet-5') && !ai.includes('claude-sonnet-5-5')],
  ['no automatic gallery by default', app.includes('const needsGallery=explicitImageRequest||!!(gallery&&')],
  ['automotive gets one dedicated garage scene', ai.includes('dedicated interactive garage3D experience')],
  ['scroll-driven 3D renderer', app.includes('data-pw-scroll3d') && app.includes('scrollJourney')],
  ['AI preserves scroll-driven 3D mode', ai.includes('scrollMode: b.scrollMode === true') && ai.includes('scrollMode:boolean')],
  ['Lenis smooth-scroll runtime with native fallback', app.includes('lenis@1.3.29') && app.includes('pw-native-scroll-fallback') && app.includes('syncTouch:false')],
  ['GSAP ScrollTrigger syncs scroll scenes', app.includes('gsap@3.15.0/ScrollTrigger') && app.includes('ScrollTrigger.update') && app.includes('pw-scroll3d')],
  ['scroll motion respects reduced-motion preference', app.includes("matchMedia('(prefers-reduced-motion: reduce)')") && app.includes('if(reduced||(!level&&!cinematic))return;')],
  ['versioned production assets', ['app.js','pw-supabase.js','styles.css'].every(x => index.includes(x + '?v='))]
];

let failed = false;
for (const [name, ok] of contracts) {
  process.stdout.write((ok ? '✓ ' : '✗ ') + name + '\n');
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
else process.stdout.write('All source checks passed.\n');
