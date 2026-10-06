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

test('copyItem describes one item with notes, build and pictures', () => {
  const s = state();
  const it = L.createItem({ title: 'Hat clips', project: 'petshopper', type: 'bug', priority: 'now', effort: 'easy', build: '212', notes: 'left ear\nonly on cats', images: ['a1'] });
  const t = L.copyItem(s, it);
  assert.match(t, /^Pet Shopper: Hat clips\n\[Bug, now, easy\]\nSeen in build 212/);
  assert.match(t, /Notes:\nleft ear\nonly on cats/);
  assert.match(t, /images\/a1\.jpg/);
  const g = L.copyItem(s, L.createItem({ title: 'cap', project: 'petshopper', gallery: true, slot: 'Hat', status: 'doing' }));
  assert.match(g, /^Pet Shopper \(Cosmetics\): cap\n\[Hat, making it\]/);
});

test('pickForMe prefers easy, then urgent, ignores gallery and done, respects the view filter', () => {
  const mk = (title, o) => L.createItem(Object.assign({ title, project: 'funfx' }, o));
  const items = [
    mk('hard now', { effort: 'hard', priority: 'now' }),
    mk('easy someday', { effort: 'easy', priority: 'someday' }),
    mk('easy now', { effort: 'easy', priority: 'now' }),
    mk('easy done', { effort: 'easy', priority: 'now', status: 'done' }),
    mk('easy gallery', { effort: 'easy', priority: 'now', gallery: true }),
    mk('other project', { effort: 'easy', priority: 'now', project: 'pathfinder' }),
  ];
  assert.strictEqual(L.pickForMe(items, { project: 'funfx' }, () => 0).title, 'easy now');
  assert.strictEqual(L.pickForMe(items, { project: 'funfx', effort: 'hard' }).title, 'hard now');
  assert.strictEqual(L.pickForMe(items, { project: 'petshopper' }), null);
  const doing = [mk('started', { status: 'doing' })];
  assert.strictEqual(L.pickForMe(doing, { project: 'all' }).title, 'started');
});

test('isNight is 10 pm to 6 am', () => {
  const at = (h) => new Date(2026, 0, 5, h, 30);
  assert.deepStrictEqual([21, 22, 23, 0, 5, 6, 12].map((h) => L.isNight(at(h))), [false, true, true, true, true, false, false]);
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
  assert.match(L.copyItem(s, s.items[0]), /\[Hat\]/);
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
  assert.match(L.copyItem(s, items[0]), /\[Idea, soon, easy\]/);
  assert.match(L.boardMarkdown(s), /\*\*a\*\* _\(easy\)_/);
});

test('doneToday counts items checked off since midnight, per project', () => {
  const now = new Date(2026, 5, 10, 15, 0).getTime();
  const at = (h, d) => new Date(2026, 5, d, h, 0).getTime();
  const items = [
    L.createItem({ project: 'a', status: 'done', doneAt: at(9, 10) }),
    L.createItem({ project: 'b', status: 'done', doneAt: at(1, 10) }),
    L.createItem({ project: 'a', status: 'done', doneAt: at(23, 9) }),
    L.createItem({ project: 'a', status: 'done' }),
    L.createItem({ project: 'a', status: 'open', doneAt: at(9, 10) }),
    L.createItem({ project: 'a', status: 'done', doneAt: at(9, 10), deleted: true }),
  ];
  assert.strictEqual(L.doneToday(items, now), 2);
  assert.strictEqual(L.doneToday(items, now, 'a'), 1);
});

test('notes: scoped, newest first, searchable, merged, validated and written to BOARD.md', () => {
  const a = L.createNote({ text: 'first idea', created: 1, updated: 1 });
  const b = L.createNote({ text: 'Second thing', created: 2, updated: 2 });
  const c = L.createNote({ text: 'hat sketch', scope: 'petshopper/gallery', created: 3, updated: 3 });
  const e = L.createNote({ text: 'room idea', scope: 'petshopper', created: 3, updated: 3 });
  const d = L.createNote({ text: 'gone', created: 4, updated: 4, deleted: true });
  const s = Object.assign(state(), { notes: [a, b, c, d, e] });
  assert.deepStrictEqual(L.liveNotes(s, '').map((n) => n.text), ['Second thing', 'first idea']);
  assert.deepStrictEqual(L.liveNotes(s, 'petshopper/gallery').map((n) => n.text), ['hat sketch']);
  assert.deepStrictEqual(L.liveNotes(s, 'petshopper').map((n) => n.text), ['room idea']);
  assert.deepStrictEqual(L.liveNotes(s, '', 'SECOND').map((n) => n.text), ['Second thing']);
  const edited = Object.assign({}, a, { text: 'first idea v2', updated: 9 });
  const m = L.mergeStates(s, { items: [], projects: [], notes: [edited, L.createNote({ text: 'remote', created: 5, updated: 5 })] });
  assert.deepStrictEqual(L.liveNotes(m, '').map((n) => n.text), ['remote', 'Second thing', 'first idea v2']);
  assert.deepStrictEqual(L.validateState({ projects: [], items: [] }).notes, []);
  assert.strictEqual(L.validateState({ projects: [], items: [], notes: [{ id: 'x', text: 'hi' }, null] }).notes.length, 1);
  const md = L.boardMarkdown(s);
  assert.match(md, /## 📝 Notes[\s\S]*- Second thing/);
  assert.match(md, /### Notes[\s\S]*- room idea/);
  assert.match(md, /Cosmetics notes[\s\S]*- hat sketch/);
  assert.doesNotMatch(md, /gone/);
});

test('weekSummary counts the last seven days and the busiest project', () => {
  const now = new Date(2026, 9, 4, 12).getTime();
  const day = 86400000;
  const it = (project, ago, over) => Object.assign({ id: Math.random() + '', project, status: 'done', doneAt: now - ago * day }, over);
  const items = [it('a', 1), it('a', 2), it('b', 3), it('b', 9), it('a', 1, { deleted: true }), it('a', 1, { status: 'open' })];
  assert.deepStrictEqual(L.weekSummary(items, now), { done: 3, top: 'a', topCount: 2 });
  assert.deepStrictEqual(L.weekSummary([], now), { done: 0, top: '', topCount: 0 });
});

test('seasonOf follows the months', () => {
  assert.strictEqual(L.seasonOf(new Date(2026, 11, 24)), 'winter');
  assert.strictEqual(L.seasonOf(new Date(2026, 0, 5)), 'winter');
  assert.strictEqual(L.seasonOf(new Date(2026, 3, 5)), 'spring');
  assert.strictEqual(L.seasonOf(new Date(2026, 6, 5)), 'summer');
  assert.strictEqual(L.seasonOf(new Date(2026, 9, 5)), 'autumn');
});
