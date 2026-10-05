const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const L = require('../logic.js');

// A tiny stand-in for GitHub's contents API: files by path, sha = a counter.
function fakeGithub(files) {
  let n = 0;
  const calls = [];
  const fetch = async (url, opt) => {
    const path = url.split('/contents/')[1];
    const method = (opt && opt.method) || 'GET';
    calls.push(method + ' ' + path);
    assert.match(opt.headers.Authorization, /^Bearer tok$/);
    const f = files.get(path);
    const json = (status, body) => ({ ok: status < 300, status, json: async () => body, blob: async () => new Blob([Buffer.from(body.content, 'base64')]) });
    if (method === 'GET') {
      if (!f) return json(404, {});
      if (opt.headers.Accept.includes('raw')) return { ok: true, status: 200, blob: async () => new Blob([Buffer.from(f.content, 'base64')]) };
      return json(200, { content: f.content, sha: f.sha });
    }
    const b = JSON.parse(opt.body);
    if (f && b.sha !== f.sha) return json(409, {});
    files.set(path, { content: b.content, sha: 's' + ++n });
    return json(201, {});
  };
  return { fetch, calls };
}

function load(files) {
  const store = {};
  const gh = fakeGithub(files);
  const ctx = {
    BoardLogic: L, fetch: gh.fetch, TextEncoder, TextDecoder, btoa, atob, Blob, Uint8Array, Error, JSON, Set, Array,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] },
    FileReader: class {
      readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = 'data:x;base64,' + Buffer.from(b).toString('base64'); this.onload(); }); }
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../sync.js', 'utf8') + '\nthis.Sync = Sync;', ctx);
  ctx.Sync.setConfig({ repo: 'me/data', token: 'tok' });
  return { Sync: ctx.Sync, gh };
}

const text = (files, p) => Buffer.from(files.get(p).content, 'base64').toString('utf8');
const imgs = () => {
  const local = new Map();
  return { local, hooks: { hasImage: async (id) => local.has(id), getImage: async (id) => local.get(id), putImage: async (id, b) => local.set(id, b) } };
};

test('first sync into an empty repo writes data.json, BOARD.md and images', async () => {
  const files = new Map();
  const { Sync, gh } = load(files);
  const s = L.defaultState();
  s.items = [L.createItem({ id: 'a', title: 'Glow ✨ café', project: 'funfx', images: ['pic1'] })];
  const { local, hooks } = imgs();
  local.set('pic1', new Blob([Buffer.from('JPEGDATA')]));
  await Sync.run(s, hooks);
  assert.strictEqual(JSON.parse(text(files, 'data.json')).items[0].title, 'Glow ✨ café');
  assert.match(text(files, 'BOARD.md'), /Glow ✨ café/);
  assert.strictEqual(text(files, 'images/pic1.jpg'), 'JPEGDATA');
  gh.calls.length = 0;
  await Sync.run(s, hooks);
  assert.ok(!gh.calls.some((c) => c.startsWith('PUT')), 'an unchanged second sync writes nothing');
});

test('sync merges remote edits and downloads missing images', async () => {
  const files = new Map();
  const { Sync } = load(files);
  const remote = L.defaultState();
  remote.items = [L.createItem({ id: 'r', title: 'from other machine', images: ['pic2'], updated: 50 })];
  files.set('data.json', { content: Buffer.from(JSON.stringify(remote)).toString('base64'), sha: 's0' });
  files.set('images/pic2.jpg', { content: Buffer.from('REMOTEPIC').toString('base64'), sha: 's9' });
  const local = L.defaultState();
  local.items = [L.createItem({ id: 'l', title: 'local only', updated: 60 })];
  const { local: store, hooks } = imgs();
  const merged = await Sync.run(local, hooks);
  assert.deepStrictEqual(merged.items.map((i) => i.id).sort(), ['l', 'r']);
  assert.ok(store.has('pic2'));
  assert.deepStrictEqual(JSON.parse(text(files, 'data.json')).items.map((i) => i.id).sort(), ['l', 'r']);
});

test('a deletion on one side wins when it is newer', async () => {
  const files = new Map();
  const { Sync } = load(files);
  const remote = L.defaultState();
  remote.items = [L.createItem({ id: 'x', title: 't', updated: 10 })];
  files.set('data.json', { content: Buffer.from(JSON.stringify(remote)).toString('base64'), sha: 's0' });
  const local = L.defaultState();
  local.items = [L.createItem({ id: 'x', title: 't', updated: 20, deleted: true })];
  const merged = await Sync.run(local, imgs().hooks);
  assert.strictEqual(merged.items[0].deleted, true);
});
