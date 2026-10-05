const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

const state = () => L.defaultState();

test('parseQuick reads project, priority and type', () => {
  const r = L.parseQuick('#funfx glow looks flat !now :bug', state().projects);
  assert.deepStrictEqual([r.project, r.priority, r.type, r.title], ['funfx', 'now', 'bug', 'glow looks flat']);
});

test('parseQuick matches a project by the start of its name', () => {
  assert.strictEqual(L.parseQuick('#pet new hat', state().projects).project, 'petshopper');
  assert.strictEqual(L.parseQuick('#path fix dice', state().projects).project, 'pathfinder');
});

test('parseQuick keeps unknown tags and uses the defaults', () => {
  const r = L.parseQuick('#nope hello !later', state().projects, { project: 'funfx', type: 'fix' });
  assert.strictEqual(r.title, '#nope hello !later');
  assert.deepStrictEqual([r.project, r.type, r.priority], ['funfx', 'fix', 'soon']);
});

test('filterItems hides done and deleted by default and searches text', () => {
  const items = [
    L.createItem({ title: 'a', project: 'funfx' }),
    L.createItem({ title: 'b', project: 'funfx', status: 'done' }),
    L.createItem({ title: 'c', project: 'petshopper', notes: 'Hat clips' }),
    L.createItem({ title: 'd', project: 'funfx', deleted: true }),
  ];
  assert.deepStrictEqual(L.filterItems(items, { project: 'all', status: 'active' }).map((i) => i.title), ['a', 'c']);
  assert.deepStrictEqual(L.filterItems(items, { project: 'funfx', status: 'done' }).map((i) => i.title), ['b']);
  assert.deepStrictEqual(L.filterItems(items, { project: 'all', status: 'all', q: 'hat' }).map((i) => i.title), ['c']);
});

test('sortItems goes by priority, then doing first, then newest', () => {
  const items = [
    L.createItem({ title: 'soon-old', priority: 'soon', created: 1 }),
    L.createItem({ title: 'now-open', priority: 'now', created: 2 }),
    L.createItem({ title: 'soon-doing', priority: 'soon', status: 'doing', created: 0 }),
    L.createItem({ title: 'soon-new', priority: 'soon', created: 5 }),
  ];
  assert.deepStrictEqual(L.sortItems(items).map((i) => i.title), ['now-open', 'soon-doing', 'soon-new', 'soon-old']);
});

test('countNow counts only live Now items', () => {
  const items = [
    L.createItem({ priority: 'now' }),
    L.createItem({ priority: 'now', status: 'done' }),
    L.createItem({ priority: 'now', deleted: true }),
    L.createItem({ priority: 'soon' }),
  ];
  assert.strictEqual(L.countNow(items), 1);
});

test('mergeStates keeps the newer copy and carries deletions', () => {
  const a = state();
  const b = JSON.parse(JSON.stringify(a));
  a.items = [L.createItem({ id: 'x', title: 'old', updated: 1 }), L.createItem({ id: 'y', title: 'only-local', updated: 1 })];
  b.items = [L.createItem({ id: 'x', title: 'new', updated: 2 }), L.createItem({ id: 'z', title: 'gone', updated: 3, deleted: true })];
  const m = L.mergeStates(a, b);
  const byId = Object.fromEntries(m.items.map((i) => [i.id, i]));
  assert.strictEqual(byId.x.title, 'new');
  assert.ok(byId.y);
  assert.strictEqual(byId.z.deleted, true);
});

test('validateState rejects junk and repairs items', () => {
  assert.strictEqual(L.validateState({}), null);
  const s = L.validateState({ projects: [{ id: 'p', name: 'P' }], items: [{ id: 'i', title: 't' }] });
  assert.deepStrictEqual([s.items[0].priority, s.items[0].images], ['soon', []]);
});

test('fitSize shrinks big images and leaves small ones', () => {
  assert.deepStrictEqual(L.fitSize(3200, 1600), { w: 1600, h: 800 });
  assert.deepStrictEqual(L.fitSize(800, 600), { w: 800, h: 600 });
});

test('copyForClaude lists open items with notes, build and images', () => {
  const s = state();
  s.items = [
    L.createItem({ title: 'Hat clips', project: 'petshopper', type: 'bug', priority: 'now', build: '212', notes: 'left ear', images: ['a1'] }),
    L.createItem({ title: 'Done one', project: 'petshopper', status: 'done' }),
  ];
  const t = L.copyForClaude(s, 'petshopper');
  assert.match(t, /1\. \[Bug, now\] Hat clips/);
  assert.match(t, /Seen in build 212/);
  assert.match(t, /images\/a1\.jpg/);
  assert.doesNotMatch(t, /Done one/);
  assert.strictEqual(L.copyForClaude(s, 'funfx'), 'Nothing open for funFX.');
});

test('boardMarkdown groups by project and priority', () => {
  const s = state();
  s.items = [L.createItem({ id: 'abc', title: 'Glow', project: 'funfx', priority: 'now' })];
  const md = L.boardMarkdown(s, 'today');
  assert.match(md, /## ✨ funFX/);
  assert.match(md, /### Now/);
  assert.match(md, /\*\*Glow\*\* `abc`/);
});

test('stripToken removes only the shorthand for one field', () => {
  const ps = state().projects;
  assert.strictEqual(L.stripToken('#funfx glow !now :bug', ps, 'priority'), '#funfx glow :bug');
  assert.strictEqual(L.stripToken('#funfx glow !now :bug', ps, 'project'), 'glow !now :bug');
  assert.strictEqual(L.stripToken('glow :bug ', ps, 'type'), 'glow ');
  assert.strictEqual(L.stripToken('#nope stays !later', ps, 'project'), '#nope stays !later');
  assert.strictEqual(L.stripToken('', ps, 'type'), '');
});
