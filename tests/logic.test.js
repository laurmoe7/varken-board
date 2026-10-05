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

test('sortItems goes by priority, then dragged order, then doing first, then newest', () => {
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

test('dragged order beats doing-first, and never-dragged items come first', () => {
  const items = [
    L.createItem({ title: 'a', priority: 'soon', order: 1, created: 1 }),
    L.createItem({ title: 'b', priority: 'soon', order: 0, status: 'doing', created: 2 }),
    L.createItem({ title: 'c', priority: 'soon', order: 2, created: 3 }),
    L.createItem({ title: 'fresh', priority: 'soon', created: 9 }),
  ];
  assert.deepStrictEqual(L.sortItems(items).map((i) => i.title), ['fresh', 'b', 'a', 'c']);
});

test('reorder moves within a group and across groups', () => {
  const a = L.createItem({ id: 'a', priority: 'soon' });
  const b = L.createItem({ id: 'b', priority: 'soon' });
  const c = L.createItem({ id: 'c', priority: 'soon' });
  const x = L.createItem({ id: 'x', priority: 'now' });
  // c before a: c, a, b
  assert.deepStrictEqual(L.reorder([a, b, c], c, 'a', 'soon'), [{ id: 'c', order: 0 }, { id: 'a', order: 1 }, { id: 'b', order: 2 }]);
  // to the end
  assert.deepStrictEqual(L.reorder([a, b, c], a, null, 'soon').map((r) => r.id), ['b', 'c', 'a']);
  // x from Now into the Soon group before b: a, x, b, c and x becomes Soon
  const r = L.reorder([a, b, c], x, 'b', 'soon');
  assert.deepStrictEqual(r.find((i) => i.id === 'x'), { id: 'x', order: 1, priority: 'soon' });
  // nothing changes when dropped where it already is
  const d = L.createItem({ id: 'd', priority: 'soon', order: 0 });
  const e = L.createItem({ id: 'e', priority: 'soon', order: 1 });
  assert.deepStrictEqual(L.reorder([d, e], d, 'e', 'soon'), []);
});

test('gallery items stay out of the to-do list, counts and copy text', () => {
  const s = state();
  s.items = [
    L.createItem({ title: 'bow tie', project: 'petshopper', gallery: true, priority: 'now' }),
    L.createItem({ title: 'fix hat', project: 'petshopper', priority: 'now' }),
  ];
  assert.deepStrictEqual(L.filterItems(s.items, { project: 'all', status: 'active' }).map((i) => i.title), ['fix hat']);
  assert.deepStrictEqual(L.filterItems(s.items, { project: 'petshopper', status: 'all', gallery: true }).map((i) => i.title), ['bow tie']);
  assert.strictEqual(L.countOpen(s.items, 'petshopper'), 1);
  assert.strictEqual(L.countNow(s.items), 1);
  assert.strictEqual(L.countGallery(s.items, 'petshopper'), 1);
  assert.doesNotMatch(L.copyForClaude(s, 'petshopper'), /bow tie/);
  assert.match(L.copyForClaude(s, 'petshopper', true), /Open cosmetics ideas for Pet Shopper:\n\n1\. bow tie/);
});

test('sortGallery puts your order first and new pictures at the top', () => {
  const items = [
    L.createItem({ title: 'old', order: 1, created: 1 }),
    L.createItem({ title: 'first', order: 0, created: 2 }),
    L.createItem({ title: 'new', created: 9 }),
  ];
  assert.deepStrictEqual(L.sortGallery(items).map((i) => i.title), ['new', 'first', 'old']);
});

test('boardMarkdown lists the gallery with its picture files', () => {
  const s = state();
  s.items = [L.createItem({ id: 'g1', title: 'Star wand', project: 'petshopper', gallery: true, images: ['p1'], notes: 'sparkly' })];
  const md = L.boardMarkdown(s, 'today');
  assert.match(md, /### Cosmetics gallery/);
  assert.match(md, /Star wand\*\* `g1`/);
  assert.match(md, /images\/p1\.jpg/);
});

test('parseSlots trims, drops repeats and empties', () => {
  assert.deepStrictEqual(L.parseSlots(' Hat, Neck ,hat,, Feet '), ['Hat', 'Neck', 'Feet']);
  assert.deepStrictEqual(L.parseSlots(''), []);
});

test('slotCounts lists the project order first, then others, only for live gallery items', () => {
  const items = [
    L.createItem({ project: 'petshopper', gallery: true, slot: 'Neck' }),
    L.createItem({ project: 'petshopper', gallery: true, slot: 'Hat' }),
    L.createItem({ project: 'petshopper', gallery: true, slot: 'Hat' }),
    L.createItem({ project: 'petshopper', gallery: true, slot: 'Wings' }),
    L.createItem({ project: 'petshopper', gallery: true, slot: 'Feet', deleted: true }),
    L.createItem({ project: 'petshopper', slot: 'Feet' }),
    L.createItem({ project: 'funfx', gallery: true, slot: 'Hat' }),
  ];
  assert.deepStrictEqual(L.slotCounts(items, 'petshopper', 'Hat, Face, Neck, Feet'), [
    { slot: 'Hat', count: 2 }, { slot: 'Neck', count: 1 }, { slot: 'Wings', count: 1 },
  ]);
});

test('the slot filter and the gallery text use the slot', () => {
  const s = state();
  s.items = [
    L.createItem({ title: 'cap', project: 'petshopper', gallery: true, slot: 'Hat' }),
    L.createItem({ title: 'scarf', project: 'petshopper', gallery: true, slot: 'Neck' }),
  ];
  const f = { project: 'petshopper', status: 'all', gallery: true };
  assert.deepStrictEqual(L.filterItems(s.items, Object.assign({ slot: 'Hat' }, f)).map((i) => i.title), ['cap']);
  assert.strictEqual(L.filterItems(s.items, Object.assign({ slot: 'all' }, f)).length, 2);
  assert.match(L.copyForClaude(s, 'petshopper', true), /\[Hat\] cap/);
  assert.match(L.boardMarkdown(s, 'today'), /\*\*cap\*\* \[Hat\]/);
});

test('findUnusedImages keeps used, drafted and brand-new pictures', () => {
  const s = state();
  const now = 1000000;
  s.items = [
    L.createItem({ images: ['used'] }),
    L.createItem({ images: ['ofDeleted'], deleted: true }),
  ];
  s.images = { fresh: { added: now - 60000 }, old: { added: now - 3600000 } };
  const known = ['used', 'ofDeleted', 'drafted', 'fresh', 'old', 'noMeta', 'used'];
  assert.deepStrictEqual(L.findUnusedImages(s, known, ['drafted'], now), ['noMeta', 'ofDeleted', 'old']);
});

test('~effort shorthand sets the effort, and the effort filter and copy text use it', () => {
  const r = L.parseQuick('fix glow ~hard !now', state().projects);
  assert.deepStrictEqual([r.effort, r.title], ['hard', 'fix glow']);
  assert.strictEqual(L.parseQuick('plain', state().projects).effort, '');
  assert.strictEqual(L.stripToken('fix ~easy glow', state().projects, 'effort'), 'fix glow');
  const items = [L.createItem({ title: 'a', project: 'funfx', effort: 'easy' }), L.createItem({ title: 'b', project: 'funfx' })];
  assert.deepStrictEqual(L.filterItems(items, { status: 'active', effort: 'easy' }).map((i) => i.title), ['a']);
  const s = Object.assign(state(), { items });
  assert.match(L.copyForClaude(s, 'funfx'), /\[Idea, soon, easy\] a/);
  assert.match(L.boardMarkdown(s), /\*\*a\*\* _\(easy\)_/);
});
