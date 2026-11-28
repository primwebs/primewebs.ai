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
  ['automotive keeps its dedicated 3D garage renderer', app.includes('data-pw-garage') && app.includes('pwGarageExperienceVersion')],
  ['automotive keeps immersive scroll animation enabled', app.includes("level:'immersive',scroll:true,floatingImages:true,threeD:true,animatedText:true") && !app.includes("level:'none',scroll:false,floatingImages:false,threeD:false,animatedText:false")],
  ['automotive preserves existing 3D scenes and galleries', app.includes("const rest=blocks.filter(b=>b&&b.type!=='garage3D');") && !app.includes("site.blocks=site.blocks.filter(x=>x&&x.type!=='threeD'&&x.type!=='garage3D'&&x.type!=='gallery')")],
  ['scroll-driven 3D renderer', app.includes('data-pw-scroll3d') && app.includes('scrollJourney')],
  ['AI preserves scroll-driven 3D mode', ai.includes('scrollMode: b.scrollMode === true') && ai.includes('scrollMode:boolean')],
  ['Lenis smooth-scroll runtime with native fallback', app.includes('lenis@1.3.29') && app.includes('pw-native-scroll-fallback') && app.includes('syncTouch:false')],
  ['GSAP ScrollTrigger syncs scroll scenes', app.includes('gsap@3.15.0/ScrollTrigger') && app.includes('ScrollTrigger.update') && app.includes('pw-scroll3d')],
  ['scroll motion respects reduced-motion preference', app.includes("matchMedia('(prefers-reduced-motion: reduce)')") && app.includes('if(reduced||(!level&&!cinematic))return;')],
  ['3D-first generator rule is mandatory', ai.includes('3D-FIRST DESIGN — NON-NEGOTIABLE PRODUCT RULE') && ai.includes('at least one real threeD block on the homepage') && ai.includes('Never generate a plain, flat, generic template website')],
  ['sanitizer inserts a scroll-driven 3D scene when AI omits one', ai.includes('Guarantee a cinematic, scroll-driven 3D focal scene on every generated page') && ai.includes('block.scrollMode = !firstThreeD') && ai.includes('out.blocks.splice')],
  ['immersive animation flags cannot be disabled by AI output', ai.includes('animation: { level: "immersive", scroll: true, floatingImages: true, threeD: true, animatedText: true }')],
  ['renderer always applies immersive motion, including garage sites', app.includes("const animLevel='immersive';")],
  ['scroll parallax targets content images across all pages', app.includes("main#pw-home img:not([data-no-parallax]),.pw-page-view img:not([data-no-parallax])")],
  ['3D shape library includes painters and lighting trades', ai.includes('"paint-roller", "paint-bucket", "work-lamp", "ceiling-lamp"')],
  ['industry-specific 3D model selection is mapped', ai.includes('/maler|painter|painting|decorator/') && ai.includes('/electric|elektriker|lighting|belysning|lamp/')],
  ['distinct visual blueprint prevents generic template repetition', ai.includes('DESIGN BLUEPRINT — make each site feel art-directed, not templated') && ai.includes('Do not make every business look like the same purple orb template')],
  ['versioned production assets', ['app.js','pw-supabase.js','styles.css'].every(x => index.includes(x + '?v='))]
];

let failed = false;
for (const [name, ok] of contracts) {
  process.stdout.write((ok ? '✓ ' : '✗ ') + name + '\n');
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
else process.stdout.write('All source checks passed.\n');
