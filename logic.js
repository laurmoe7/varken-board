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
  const COLORS = ['#ff9ec7', '#b9a4ff', '#8ff0c8', '#ffe29a', '#ffb38a', '#8fd3ff'];
  const NOW_CAP = 5;
  const MAX_IMAGE_SIDE = 1600;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ids = (list) => list.map((x) => x.id);
  const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

  function defaultState() {
    const now = Date.now();
    return {
      v: 1,
      projects: [
        { id: 'petshopper', name: 'Pet Shopper', emoji: '🐹', color: COLORS[0], repo: 'https://github.com/laurmoe7/pet-shopper', updated: now },
        { id: 'funfx', name: 'funFX', emoji: '✨', color: COLORS[1], repo: 'https://github.com/laurmoe7/funFX', updated: now },
        { id: 'pathfinder', name: 'Pathfinder sheet', emoji: '🎲', color: COLORS[2], repo: 'https://github.com/laurmoe7/pathfinder-sheet', updated: now },
      ],
      items: [],
      images: {},
    };
  }

  function createItem(fields) {
    const now = Date.now();
    return Object.assign(
      { id: uid(), project: '', type: 'idea', priority: 'soon', status: 'open', title: '', notes: '', build: '', images: [], created: now, updated: now },
      fields
    );
  }

  const liveProjects = (state) => state.projects.filter((p) => !p.deleted);

  // Which field a shorthand word sets: #project, !priority or :type. Unknown words are plain text.
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
    return null;
  }

  // "#funfx fix the glow !now :bug" -> project, priority, type, and the title left over.
  function parseQuick(text, projects, defaults) {
    const out = Object.assign({ project: '', priority: 'soon', type: 'idea' }, defaults);
    const keep = [];
    for (const word of String(text || '').trim().split(/\s+/)) {
      const t = classifyToken(word, projects);
      if (t) out[t.field] = t.value;
      else keep.push(word);
    }
    out.title = keep.join(' ');
    return out;
  }

  // Removes the shorthand for one field ('project', 'priority' or 'type') so a menu choice isn't overridden.
  function stripToken(text, projects, field) {
    const src = String(text || '');
    const words = src.trim().split(/\s+/).filter((w) => w && (classifyToken(w, projects) || {}).field !== field);
    return words.join(' ') + (words.length && /\s$/.test(src) ? ' ' : '');
  }

  const priorityRank = (p) => Math.max(0, ids(PRIORITIES).indexOf(p));
  const statusRank = (s) => (s === 'doing' ? 0 : s === 'open' ? 1 : 2);

  // Filters: project ('all' or id), type ('all' or id), status ('active' = not done, 'all', or a status), q (text).
  function filterItems(items, f) {
    const q = String((f && f.q) || '').trim().toLowerCase();
    return items.filter((it) => {
      if (it.deleted) return false;
      if (f.project && f.project !== 'all' && it.project !== f.project) return false;
      if (f.type && f.type !== 'all' && it.type !== f.type) return false;
      if (f.status === 'active' && it.status === 'done') return false;
      if (f.status && f.status !== 'active' && f.status !== 'all' && it.status !== f.status) return false;
      if (q && !(it.title + ' ' + it.notes + ' ' + it.build).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // Priority first, then doing before open before done, then newest first.
  function sortItems(items) {
    return items.slice().sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        statusRank(a.status) - statusRank(b.status) ||
        b.created - a.created
    );
  }

  function groupByPriority(items) {
    return PRIORITIES.map((p) => ({ priority: p, items: items.filter((i) => i.priority === p.id) })).filter((g) => g.items.length);
  }

  const countNow = (items) => items.filter((i) => !i.deleted && i.status !== 'done' && i.priority === 'now').length;
  const countOpen = (items, project) =>
    items.filter((i) => !i.deleted && i.status !== 'done' && (project === 'all' || i.project === project)).length;

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
    return { v: 1, projects, items, images: obj.images && typeof obj.images === 'object' ? obj.images : {} };
  }

  function fitSize(w, h, max) {
    const m = max || MAX_IMAGE_SIDE;
    const s = Math.min(1, m / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }

  const projectName = (state, id) => (state.projects.find((p) => p.id === id) || { name: 'No project' }).name;

  // A paste-ready task list for one project (or all) to hand to a Claude session.
  function copyForClaude(state, project) {
    const items = sortItems(filterItems(state.items, { project, status: 'active' }));
    const title = project === 'all' ? 'all projects' : projectName(state, project);
    if (!items.length) return 'Nothing open for ' + title + '.';
    const lines = ['Open items for ' + title + ':', ''];
    items.forEach((it, n) => {
      const bits = [typeOf(it.type).label, it.priority];
      if (it.status === 'doing') bits.push('doing');
      if (project === 'all') bits.push(projectName(state, it.project));
      lines.push(n + 1 + '. [' + bits.join(', ') + '] ' + it.title);
      if (it.build) lines.push('   Seen in build ' + it.build);
      if (it.notes) it.notes.split('\n').forEach((l) => lines.push('   ' + l));
      if (it.images.length) lines.push('   (' + it.images.length + ' image' + (it.images.length > 1 ? 's' : '') + ' on the board: ' + it.images.map((i) => 'images/' + i + '.jpg').join(', ') + ')');
    });
    return lines.join('\n');
  }

  // BOARD.md written next to data.json by the sync, so Claude can read the backlog at a glance.
  function boardMarkdown(state, when) {
    const out = ['# Varken board', '', '_Updated ' + (when || new Date().toISOString()) + '_', ''];
    for (const p of liveProjects(state)) {
      const items = sortItems(filterItems(state.items, { project: p.id, status: 'active' }));
      const done = state.items.filter((i) => !i.deleted && i.project === p.id && i.status === 'done').length;
      out.push('## ' + p.emoji + ' ' + p.name + (p.repo ? ' (' + p.repo + ')' : ''), '');
      if (!items.length) out.push('_Nothing open._');
      for (const g of groupByPriority(items)) {
        out.push('### ' + g.priority.label, '');
        for (const it of g.items) {
          out.push('- [ ] ' + typeOf(it.type).emoji + ' **' + it.title + '**' + (it.status === 'doing' ? ' _(doing)_' : '') + ' `' + it.id + '`');
          if (it.build) out.push('  - seen in build ' + it.build);
          if (it.notes) it.notes.split('\n').forEach((l) => out.push('  > ' + l));
          if (it.images.length) out.push('  - images: ' + it.images.map((i) => 'images/' + i + '.jpg').join(', '));
        }
        out.push('');
      }
      if (done) out.push('_' + done + ' done._', '');
    }
    return out.join('\n');
  }

  const api = {
    TYPES, PRIORITIES, STATUSES, COLORS, NOW_CAP, MAX_IMAGE_SIDE,
    uid, slug, typeOf, defaultState, createItem, liveProjects, parseQuick, stripToken,
    filterItems, sortItems, groupByPriority, countNow, countOpen,
    mergeStates, validateState, fitSize, projectName, copyForClaude, boardMarkdown,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BoardLogic = api;
})(typeof self !== 'undefined' ? self : this);
