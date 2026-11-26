const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'pw-supabase.js'), 'utf8');
const userId = '11111111-1111-4111-8111-111111111111';
const cloudId = '22222222-2222-4222-8222-222222222222';
const offlineId = '33333333-3333-4333-8333-333333333333';
const newId = '44444444-4444-4444-8444-444444444444';

const tables = {
  profiles: [{ id: userId, email: 'owner@test.invalid', role: 'owner' }],
  projects: [{
    id: cloudId, user_id: userId, name: 'Cloud project', status: 'draft',
    site: { blocks: [] }, history: [], future: [], chat: [],
    created_at: '2026-11-26T20:00:00Z', updated_at: '2026-11-26T20:00:00Z'
  }],
  customers: [],
  user_settings: [{ user_id: userId, settings: { finance: [], leads: [], images: {} } }],
  credit_accounts: [{ user_id: userId, balance: 50, unlimited: false }],
  credit_transactions: [],
  booking_requests: []
};

const localData = {
  'pw.projects': JSON.stringify([
    { id: cloudId, _userId: userId, ownerId: userId, name: 'Cloud project', status: 'draft', site: { blocks: [] }, history: [], future: [], chat: [], updatedAt: Date.parse('2026-11-26T20:00:00Z') },
    { id: offlineId, ownerId: userId, name: 'Offline project', status: 'draft', site: { blocks: [{ type: 'hero', title: 'Saved locally' }] }, history: [], future: [], chat: [], updatedAt: Date.now() }
  ])
};

let uploadedPath = null;
let uuidCounter = 0;
const client = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: userId, email: 'owner@test.invalid' } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
  },
  from(table) {
    const query = {
      filters: [], action: 'select',
      select() { this.action = 'select'; return this; },
      eq(key, value) {
        if (this.action === 'delete') {
          const rows = tables[table] || [];
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i][key] === value) rows.splice(i, 1);
          }
          return Promise.resolve({ error: null });
        }
        this.filters.push([key, value]);
        return this;
      },
      maybeSingle() {
        const row = (tables[table] || []).find(item => this.filters.every(([key, value]) => item[key] === value)) || null;
        return Promise.resolve({ data: row, error: null });
      },
      upsert(payload) {
        const rows = tables[table] || (tables[table] = []);
        for (const item of (Array.isArray(payload) ? payload : [payload])) {
          const key = item.id !== undefined ? 'id' : 'user_id';
          const index = rows.findIndex(row => row[key] === item[key]);
          if (index >= 0) rows[index] = { ...rows[index], ...item };
          else rows.push({ ...item });
        }
        return Promise.resolve({ error: null });
      },
      delete() { this.action = 'delete'; return this; },
      in(key, values) { return Promise.resolve({ error: null }); },
      then(resolve, reject) {
        const data = (tables[table] || []).filter(item => this.filters.every(([key, value]) => item[key] === value));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      }
    };
    return query;
  },
  storage: {
    from(bucket) {
      return {
        upload: async (filePath, file, options) => { uploadedPath = filePath; return { data: { path: filePath }, error: null }; },
        getPublicUrl: filePath => ({ data: { publicUrl: 'https://kovinmyvsjzunymapxxm.supabase.co/storage/v1/object/public/' + bucket + '/' + filePath } })
      };
    }
  },
  rpc: async () => ({ data: { success: true, balance: 50, unlimited: false }, error: null })
};

const window = {
  supabase: { createClient: () => client },
  render() {},
  loginScreen() {},
  location: { origin: 'https://test.invalid' }
};
const localStorage = {
  getItem: key => localData[key] ?? null,
  setItem: (key, value) => { localData[key] = value; }
};
const fetch = async () => ({
  ok: true,
  json: async () => ({ configured: true, supabaseUrl: 'https://test.supabase.co', supabasePublishableKey: 'test-publishable-key' })
});
const crypto = { randomUUID: () => '55555555-5555-4555-8555-' + String(++uuidCounter).padStart(12, '0') };

vm.runInNewContext(source, { window, localStorage, fetch, crypto, console, Date, JSON, Map, Set, Promise, Error, Math, String, Array, Object, RegExp, Number });
(async () => {
  await window.PWDB.ready;

  const cached = JSON.parse(localData['pw.projects']);
  assert.deepEqual(cached.map(p => p.id), [cloudId, offlineId], 'valid UUIDs must remain stable');
  assert.ok(tables.projects.some(p => p.id === offlineId), 'offline project must merge even when cloud already contains projects');

  const created = { id: newId, ownerId: userId, name: 'New generated project', status: 'draft', site: { blocks: [] }, history: [], future: [], chat: [], updatedAt: Date.now() };
  await window.PWDB.persistKey('pw.projects', [...cached, created]);
  await window.PWDB.flush();
  assert.ok(tables.projects.some(p => p.id === newId), 'new project must be upserted');
  assert.ok(tables.projects.every(p => p.user_id === userId), 'project owner IDs must remain correct');

  await window.PWDB.persistKey('pw.invoices', [{ id: 'invoice-1', number: 'PW-001', total: 500 }]);
  await window.PWDB.persistKey('pw.invoiceDraft', { customer: 'Test customer' });
  await window.PWDB.persistKey('pw.invoiceDraftLines', [{ description: 'Website', qty: 1, price: 500 }]);
  await window.PWDB.flush();
  const settings = tables.user_settings[0].settings;
  assert.equal(settings.invoices[0].id, 'invoice-1');
  assert.equal(settings.invoiceDraft.customer, 'Test customer');
  assert.equal(settings.invoiceDraftLines[0].description, 'Website');

  const publicUrl = await window.PWDB.uploadAsset({ name: 'workshop.webp', type: 'image/webp' }, newId);
  assert.ok(uploadedPath.startsWith(userId + '/' + newId + '/'), 'uploaded files must be scoped to the signed-in user and project');
  assert.ok(publicUrl.includes('/primewebs-media/'), 'upload must return a public asset URL');

  await window.PWDB.deleteProject(newId);
  assert.ok(!tables.projects.some(p => p.id === newId), 'explicit project delete must target the selected project');

  process.stdout.write('Cloud persistence, stable IDs, workspace data and Storage upload checks passed.\n');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
