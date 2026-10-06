// BoardLogic: rules with no page code (parsing, filtering, merging, text export).
// Loaded by index.html and by the tests, so keep it free of DOM and browser APIs.
(function (root) {
  'use strict';

  const TYPES = [
    { id: 'idea', label: 'Idea', emoji: '💡' },
    { id: 'fix', label: 'Fix', emoji: '🔧' },
    { id: 'bug', label: 'Bug', emoji: '🐛' },
  ];
  const PRIORITIES = [
    { id: 'now', label: 'Now' },
    { id: 'soon', label: 'Soon' },
    { id: 'someday', label: 'Someday' },
  ];
  const STATUSES = [
    { id: 'open', label: 'Open' },
    { id: 'doing', label: 'Doing' },
    { id: 'done', label: 'Done' },
  ];
  // How hard a task is. Empty means not rated yet.
  const EFFORTS = [
    { id: 'easy', label: 'Easy', emoji: '🌱' },
    { id: 'medium', label: 'Medium', emoji: '🌿' },
    { id: 'hard', label: 'Hard', emoji: '🔥' },
  ];
  const COLORS = ['#ff9ec7', '#b9a4ff', '#8ff0c8', '#ffe29a', '#ffb38a', '#8fd3ff'];
  const NOW_CAP = 5;
  const DEFAULT_SLOTS = 'Hat, Clothes, Face, Mouth, Neck, Feet, Skin, Room, Background, Toy';
  const MIN_UNUSED_AGE = 10 * 60 * 1000; // a picture younger than this is never called unused
  const MAX_IMAGE_SIDE = 1600;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ids = (list) => list.map((x) => x.id);
  const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[0];
  const effortOf = (id) => EFFORTS.find((e) => e.id === id) || null;

  function defaultState() {
    const now = Date.now();
    return {
      v: 1,
      projects: [
        { id: 'petshopper', name: 'Pet Shopper', emoji: '🐹', color: COLORS[0], repo: 'https://github.com/laurmoe7/pet-shopper', gallery: 'Cosmetics', slots: DEFAULT_SLOTS, updated: now },
        { id: 'funfx', name: 'funFX', emoji: '✨', color: COLORS[1], repo: 'https://github.com/laurmoe7/funFX', updated: now },
        { id: 'pathfinder', name: 'Pathfinder sheet', emoji: '🎲', color: COLORS[2], repo: 'https://github.com/laurmoe7/pathfinder-sheet', updated: now },
      ],
      items: [],
      notes: [],
      images: {},
    };
  }

  function createItem(fields) {
    const now = Date.now();
    return Object.assign(
      { id: uid(), project: '', type: 'idea', priority: 'soon', status: 'open', title: '', notes: '', build: '', effort: '', doneAt: 0, images: [], gallery: false, slot: '', created: now, updated: now },
      fields
    );
  }

  // Loose notes: free text with no type or priority. `scope` is '' for the All projects page, a project id for
  // that project's notes, or '<project id>/gallery' for its gallery's notes.
  const createNote = (fields) => {
    const now = Date.now();
    return Object.assign({ id: uid(), scope: '', text: '', created: now, updated: now }, fields);
  };
  const liveNotes = (state, scope, q) => {
    const needle = String(q || '').trim().toLowerCase();
    return (state.notes || [])
      .filter((n) => !n.deleted && (n.scope || '') === (scope || '') && (!needle || n.text.toLowerCase().includes(needle)))
      .sort((a, b) => b.created - a.created);
  };

  const liveProjects = (state) => state.projects.filter((p) => !p.deleted);
// "Hat, Clothes, Face" -> ['Hat', 'Clothes', 'Face'] (trimmed, no repeats, at most 24).
const parseSlots = (str) => {
  const seen = new Set();
  return String(str || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .slice(0, 24);
};
// Projects with a picture gallery (`gallery` is its name, e.g. "Cosmetics").
const galleryProjects = (state) => liveProjects(state).filter((p) => p.gallery);

  // Which field a shorthand word sets: #project, !priority, :type or ~effort. Unknown words are plain text.
  // A #tag matches the start of a project's name without spaces.
  function classifyToken(word, projects) {
    const w = word.toLowerCase();
    let m;
    if ((m = /^#(.+)$/.exec(w))) {
      const tag = slug(m[1]);
      const hit = tag && projects.find((p) => slug(p.name).startsWith(tag) || p.id.startsWith(tag));
      return hit ? { field: 'project', value: hit.id } : null;
    }
    if ((m = /^!(.+)$/.exec(w)) && ids(PRIORITIES).includes(m[1])) return { field: 'priority', value: m[1] };
    if ((m = /^:(.+)$/.exec(w)) && ids(TYPES).includes(m[1])) return { field: 'type', value: m[1] };
    if ((m = /^~(.+)$/.exec(w)) && ids(EFFORTS).includes(m[1])) return { field: 'effort', value: m[1] };
    return null;
  }

  // "#funfx fix the glow !now :bug" -> project, priority, type, and the title left over.
  function parseQuick(text, projects, defaults) {
    const out = Object.assign({ project: '', priority: 'soon', type: 'idea', effort: '' }, defaults);
    const keep = [];
    for (const word of String(text || '').trim().split(/\s+/)) {
      const t = classifyToken(word, projects);
      if (t) out[t.field] = t.value;
      else keep.push(word);
    }
    out.title = keep.join(' ');
    return out;
  }

  // Removes the shorthand for one field ('project', 'priority', 'type' or 'effort') so a menu choice isn't overridden.
  function stripToken(text, projects, field) {
    const src = String(text || '');
    const words = src.trim().split(/\s+/).filter((w) => w && (classifyToken(w, projects) || {}).field !== field);
    return words.join(' ') + (words.length && /\s$/.test(src) ? ' ' : '');
  }

  const priorityRank = (p) => Math.max(0, ids(PRIORITIES).indexOf(p));
  const statusRank = (s) => (s === 'doing' ? 0 : s === 'open' ? 1 : 2);
  // Dragging gives items an `order`; items never dragged (new ones) come first.
  const orderKey = (it) => (it.order == null ? -Infinity : it.order);
  const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

  // Filters: project ('all' or id), type ('all' or id), status ('active' = not done, 'all', or a status), q (text).
  // Gallery items (cosmetic ideas with big pictures) are kept apart: they show only when f.gallery is set.
  function filterItems(items, f) {
    const q = String((f && f.q) || '').trim().toLowerCase();
    return items.filter((it) => {
      if (it.deleted) return false;
      if (!!it.gallery !== !!f.gallery) return false;
      if (f.slot && f.slot !== 'all' && it.slot !== f.slot) return false;
      if (f.project && f.project !== 'all' && it.project !== f.project) return false;
      if (f.type && f.type !== 'all' && it.type !== f.type) return false;
      if (f.effort && f.effort !== 'all' && it.effort !== f.effort) return false;
      if (f.status === 'active' && it.status === 'done') return false;
      if (f.status && f.status !== 'active' && f.status !== 'all' && it.status !== f.status) return false;
      if (q && !(it.title + ' ' + it.notes + ' ' + it.build).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // Priority first, then the order you dragged them into, then doing before open before done, then newest first.
  function sortItems(items) {
    return items.slice().sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        cmp(orderKey(a), orderKey(b)) ||
        statusRank(a.status) - statusRank(b.status) ||
        b.created - a.created
    );
  }

  // The gallery has no priorities: your dragged order, new pictures first.
  const sortGallery = (items) => items.slice().sort((a, b) => cmp(orderKey(a), orderKey(b)) || b.created - a.created);

  // Moving `moved` before the item `beforeId` (or to the end) in `container` (the items on show, in order).
  // Returns the changes to make: { id, order, priority? }. `priority` is only given for a move between groups.
  function reorder(container, moved, beforeId, priority) {
    const rest = container.filter((i) => i.id !== moved.id);
    const at = beforeId ? rest.findIndex((i) => i.id === beforeId) : -1;
    rest.splice(at < 0 ? rest.length : at, 0, moved);
    const changes = [];
    rest.forEach((it, order) => {
      const change = { id: it.id, order };
      if (it.id === moved.id && priority && it.priority !== priority) change.priority = priority;
      if (it.order !== order || change.priority) changes.push(change);
    });
    return changes;
  }

  function groupByPriority(items) {
    return PRIORITIES.map((p) => ({ priority: p, items: items.filter((i) => i.priority === p.id) })).filter((g) => g.items.length);
  }

  const countNow = (items) => items.filter((i) => !i.deleted && !i.gallery && i.status !== 'done' && i.priority === 'now').length;
  const countOpen = (items, project) =>
    items.filter((i) => !i.deleted && !i.gallery && i.status !== 'done' && (project === 'all' || i.project === project)).length;
  // The slot tags on a project's gallery items, with counts: the project's own list first (its order), then any others.
  function slotCounts(items, project, configured) {
    const counts = new Map();
    items.forEach((i) => i.gallery && !i.deleted && i.project === project && i.slot && counts.set(i.slot, (counts.get(i.slot) || 0) + 1));
    const order = parseSlots(configured).filter((x) => counts.has(x));
    Array.from(counts.keys()).filter((x) => !order.includes(x)).sort().forEach((x) => order.push(x));
    return order.map((slot) => ({ slot, count: counts.get(slot) }));
  }
  // How many things were checked off today (since local midnight), for one project or 'all'.
  function doneToday(items, now, project) {
    const d = new Date(now == null ? Date.now() : now);
    d.setHours(0, 0, 0, 0);
    return items.filter((i) => !i.deleted && i.status === 'done' && i.doneAt >= d.getTime() && (!project || project === 'all' || i.project === project)).length;
  }
  // Last seven days: how many finished and which project got the most.
  function weekSummary(items, now) {
    const since = (now == null ? Date.now() : now) - 7 * 86400000;
    const done = items.filter((i) => !i.deleted && i.status === 'done' && i.doneAt >= since);
    const by = {};
    for (const i of done) by[i.project] = (by[i.project] || 0) + 1;
    const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0] || '';
    return { done: done.length, top, topCount: top ? by[top] : 0 };
  }
  // winter, spring, summer or autumn (northern hemisphere, local time)
  function seasonOf(d) {
    const m = (d || new Date()).getMonth();
    return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }
  // Easter Sunday by the usual Gregorian computus.
  function easterSunday(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  // A holiday look for the day, or ''. Christmas 18-25 Dec, Halloween 25-31 Oct, King's Day 27 Apr (26 if that is
  // a Sunday), Sinterklaas 3-5 Dec, New Year 30 Dec-1 Jan, Valentine 12-14 Feb, St Patrick, 4 July, Carnival, birthday 10 May, Thanksgiving (US: 4th Thursday of Nov) and the day before, Easter from Good Friday to Easter Monday.
  function holidayOf(d) {
    const date = d || new Date(), y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
    if (m === 11 && day >= 18 && day <= 25) return 'christmas';
    if (m === 9 && day >= 25) return 'halloween';
    if (m === 3 && day === (new Date(y, 3, 27).getDay() === 0 ? 26 : 27)) return 'kingsday';
    if (m === 10) {
      const fourth = 1 + ((4 - new Date(y, 10, 1).getDay() + 7) % 7) + 21;
      if (day === fourth || day === fourth - 1) return 'thanksgiving';
    }
    if (m === 4 && day === 10) return 'birthday'; // Lauren's
    if (m === 11 && day >= 3 && day <= 5) return 'sinterklaas';
    if ((m === 11 && day >= 30) || (m === 0 && day === 1)) return 'newyear';
    if (m === 1 && day >= 12 && day <= 14) return 'valentine';
    if (m === 2 && day === 17) return 'stpatrick';
    if (m === 6 && (day === 3 || day === 4)) return 'fourth';
    const diff = Math.round((new Date(y, m, day) - easterSunday(y)) / 86400000);
    if (diff >= -50 && diff <= -47) return 'carnival'; // Saturday to Tuesday before Ash Wednesday
    return diff >= -2 && diff <= 1 ? 'easter' : '';
  }
  const lookOf = (d) => holidayOf(d) || seasonOf(d);
  const countGallery = (items, project) => items.filter((i) => !i.deleted && i.gallery && i.project === project).length;

  // Newer `updated` wins per item and per project; deletions are kept as `deleted: true` so they sync too.
  function mergeById(a, b) {
    const m = new Map();
    for (const x of (a || []).concat(b || [])) {
      const o = m.get(x.id);
      if (!o || (x.updated || 0) > (o.updated || 0)) m.set(x.id, x);
    }
    return Array.from(m.values());
  }

  function mergeStates(local, remote) {
    if (!remote || !Array.isArray(remote.items)) return local;
    return {
      v: 1,
      projects: mergeById(local.projects, remote.projects),
      items: mergeById(local.items, remote.items),
      notes: mergeById(local.notes, remote.notes),
      images: Object.assign({}, remote.images, local.images),
    };
  }

  // Accepts an export or a synced data.json; returns a clean state or null.
  function validateState(obj) {
    if (!obj || !Array.isArray(obj.projects) || !Array.isArray(obj.items)) return null;
    const projects = obj.projects.filter((p) => p && p.id && p.name);
    const items = obj.items
      .filter((i) => i && i.id)
      .map((i) => createItem(Object.assign({}, i, { images: Array.isArray(i.images) ? i.images : [] })));
    const notes = Array.isArray(obj.notes) ? obj.notes.filter((n) => n && n.id).map((n) => createNote(Object.assign({}, n, { text: String(n.text || '') }))) : [];
    return { v: 1, projects, items, notes, images: obj.images && typeof obj.images === 'object' ? obj.images : {} };
  }

  function fitSize(w, h, max) {
    const m = max || MAX_IMAGE_SIDE;
    const s = Math.min(1, m / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }

  // Pictures nobody points to: in `known` (everything stored, locally or in the data repo) but not on a live item,
  // not in `keep` (unsaved drafts, the picture being drawn on) and not brand new.
  function findUnusedImages(state, known, keep, now, minAge) {
    const used = new Set(keep || []);
    state.items.forEach((i) => !i.deleted && (i.images || []).forEach((id) => used.add(id)));
    const age = minAge == null ? MIN_UNUSED_AGE : minAge;
    return Array.from(new Set(known))
      .filter((id) => {
        if (used.has(id)) return false;
        const meta = state.images && state.images[id];
        return !(meta && meta.added && (now || Date.now()) - meta.added < age);
      })
      .sort();
  }

  const projectName = (state, id) => (state.projects.find((p) => p.id === id) || { name: 'No project' }).name;

  // A paste-ready description of one item to hand to a Claude session: where it lives, its labels, notes and pictures.
  function copyItem(state, it) {
    const bits = it.gallery ? (it.slot ? [it.slot] : []) : [typeOf(it.type).label, it.priority].concat(it.effort ? [it.effort] : []);
    if (it.status === 'doing') bits.push(it.gallery ? 'making it' : 'doing');
    const proj = state.projects.find((p) => p.id === it.project);
    const lines = [projectName(state, it.project) + (it.gallery && proj && proj.gallery ? ' (' + proj.gallery + ')' : '') + ': ' + it.title];
    if (bits.length) lines.push('[' + bits.join(', ') + ']');
    if (it.build) lines.push('Seen in build ' + it.build);
    if (it.notes) lines.push('', 'Notes:', it.notes);
    if (it.images.length) lines.push('', 'Pictures on the board: ' + it.images.map((i) => 'images/' + i + '.jpg').join(', '));
    return lines.join('\n');
  }

  // The pig's pick: an open item to start with. Easy ones first, then the most urgent; ties are picked at random.
  // `f` is the view's filter (project, type, effort, search); `rnd` is for tests.
  function pickForMe(items, f, rnd) {
    const live = filterItems(items, Object.assign({}, f, { status: 'active', gallery: false }));
    const open = live.filter((i) => i.status === 'open');
    const pool = open.length ? open : live;
    const rank = (i) => (i.effort === 'easy' ? 0 : i.effort === 'hard' ? 2 : 1) * 10 + priorityRank(i.priority);
    const best = Math.min.apply(null, pool.map(rank));
    const top = pool.filter((i) => rank(i) === best);
    return top.length ? top[Math.floor((rnd || Math.random)() * top.length)] : null;
  }

  // The pig sleeps from 10 pm to 6 am (local time).
  const isNight = (d) => {
    const h = (d || new Date()).getHours();
    return h >= 22 || h < 6;
  };

  // BOARD.md written next to data.json by the sync, so Claude can read the backlog at a glance.
  function boardMarkdown(state, when) {
    const out = ['# Varken board', '', '_Updated ' + (when || new Date().toISOString()) + '_', ''];
    for (const p of liveProjects(state)) {
      const items = sortItems(filterItems(state.items, { project: p.id, status: 'active' }));
      const done = state.items.filter((i) => !i.deleted && !i.gallery && i.project === p.id && i.status === 'done').length;
      out.push('## ' + p.emoji + ' ' + p.name + (p.repo ? ' (' + p.repo + ')' : ''), '');
      if (!items.length) out.push('_Nothing open._');
      for (const g of groupByPriority(items)) {
        out.push('### ' + g.priority.label, '');
        for (const it of g.items) {
          out.push('- [ ] ' + typeOf(it.type).emoji + ' **' + it.title + '**' + (it.effort ? ' _(' + it.effort + ')_' : '') + (it.status === 'doing' ? ' _(doing)_' : '') + ' `' + it.id + '`');
          if (it.build) out.push('  - seen in build ' + it.build);
          if (it.notes) it.notes.split('\n').forEach((l) => out.push('  > ' + l));
          if (it.images.length) out.push('  - images: ' + it.images.map((i) => 'images/' + i + '.jpg').join(', '));
        }
        out.push('');
      }
      if (done) out.push('_' + done + ' done._', '');
      if (p.gallery) {
        const pics = sortGallery(filterItems(state.items, { project: p.id, status: 'active', gallery: true }));
        out.push('### ' + p.gallery + ' gallery', '');
        if (!pics.length) out.push('_Nothing here yet._');
        for (const it of pics) {
          out.push('- 🎀 **' + it.title + '**' + (it.slot ? ' [' + it.slot + ']' : '') + (it.status === 'doing' ? ' _(making it)_' : '') + ' `' + it.id + '`');
          if (it.notes) it.notes.split('\n').forEach((l) => out.push('  > ' + l));
          if (it.images.length) out.push('  - images: ' + it.images.map((i) => 'images/' + i + '.jpg').join(', '));
        }
        out.push('');
      }
      const pnotes = liveNotes(state, p.id);
      if (pnotes.length) {
        out.push('### Notes', '');
        pnotes.forEach((n) => out.push('- ' + n.text.replace(/\n/g, '\n  ')));
        out.push('');
      }
      const gnotes = p.gallery ? liveNotes(state, p.id + '/gallery') : [];
      if (gnotes.length) {
        out.push('### ' + p.gallery + ' notes', '');
        gnotes.forEach((n) => out.push('- ' + n.text.replace(/\n/g, '\n  ')));
        out.push('');
      }
    }
    const general = liveNotes(state, '');
    if (general.length) {
      out.push('## 📝 Notes', '');
      general.forEach((n) => out.push('- ' + n.text.replace(/\n/g, '\n  ')));
      out.push('');
    }
    return out.join('\n');
  }

  const api = {
    TYPES, PRIORITIES, STATUSES, EFFORTS, COLORS, NOW_CAP, MAX_IMAGE_SIDE, DEFAULT_SLOTS,
    uid, slug, typeOf, effortOf, createNote, liveNotes, defaultState, createItem, liveProjects, galleryProjects, parseSlots, slotCounts, findUnusedImages, parseQuick, stripToken,
    filterItems, sortItems, sortGallery, reorder, groupByPriority, countNow, countOpen, countGallery, doneToday, weekSummary, seasonOf, holidayOf, lookOf,
    mergeStates, validateState, fitSize, projectName, copyItem, pickForMe, isNight, boardMarkdown,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BoardLogic = api;
})(typeof self !== 'undefined' ? self : this);
