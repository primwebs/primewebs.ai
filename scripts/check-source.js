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
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const contracts = [
  ['stable UUID validator', /\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}/i.test(adapter)],
  ['local/cloud project reconciliation', adapter.includes('cloudProjectsById')],
  ['awaited generated project save', app.includes('await Projects.save([p,...Projects.all()])')],
  ['visible visual section editor', app.includes('pw-section-editor')],
  ['working 3D model upload handler', app.includes('new FileReader()') && app.includes('data-three-model')],
  ['Studio design/media/history panels', ['themePanel','mediaPanel','historyPanel'].every(x => app.includes(x))],
  ['versioned production assets', ['app.js','pw-supabase.js','styles.css'].every(x => index.includes(x + '?v='))]
];

let failed = false;
for (const [name, ok] of contracts) {
  process.stdout.write((ok ? '✓ ' : '✗ ') + name + '\n');
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
else process.stdout.write('All source checks passed.\n');
