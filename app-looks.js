// The pig's seasonal and holiday clothes. Loads before app-pig.js, which draws them (pigSvg opts.look).
// A look is a season (winter earmuffs, summer shades, falling petals or a leaf) or a holiday (a hat plus something falling).
// A hat replaces the plant for those few days; at night the nightcap still wins, unless a look is being previewed.
const EARMUFFS = `<g class="earmuffs"><path d="M17 56 Q60 -8 103 56" fill="none" stroke="#b9a4ff" stroke-width="4.5" stroke-linecap="round"/><circle cx="17" cy="58" r="9" fill="#c9b8ff"/><circle cx="103" cy="58" r="9" fill="#c9b8ff"/><circle cx="14.5" cy="55.5" r="2.4" fill="#efe8ff"/><circle cx="100.5" cy="55.5" r="2.4" fill="#efe8ff"/></g>`;
const SHADES = `<g class="shades"><rect x="36" y="44" width="20" height="11" rx="5" fill="#3a2f66"/><rect x="64" y="44" width="20" height="11" rx="5" fill="#3a2f66"/><path d="M56 48 h8" stroke="#3a2f66" stroke-width="2.4"/><path d="M39 47 l6 0 M67 47 l6 0" stroke="#b9a4ff" stroke-width="1.6" stroke-linecap="round"/></g>`;
const HATS = {
  santa: `<g class="hat"><path d="M32 44 Q36 16 66 14 Q92 14 98 30 Q104 40 108 56 Q100 50 94 50 Q80 44 62 44 Q44 44 32 44 Z" fill="#ff6b82"/>
    <path d="M30 47 Q60 36 98 50" fill="none" stroke="#fffaf5" stroke-width="9" stroke-linecap="round"/><circle cx="109" cy="58" r="7" fill="#fffaf5"/></g>`,
  witch: `<g class="hat"><path d="M40 46 Q50 30 56 8 Q58 4 64 6 Q66 14 72 22 Q80 34 84 46 Z" fill="#6b4cb0"/><ellipse cx="62" cy="46" rx="33" ry="7" fill="#553a94"/>
    <path d="M44 41 Q62 47 80 41 L82 46 Q62 52 42 46 Z" fill="#ffb26b"/><rect x="58" y="41" width="8" height="8" rx="1.5" fill="none" stroke="#ffe29a" stroke-width="2"/>
    <path d="M62 8 Q74 4 76 14" fill="none" stroke="#6b4cb0" stroke-width="5" stroke-linecap="round"/></g>`,
  crown: `<g class="hat"><path d="M36 46 L38 24 L50 35 L60 18 L70 35 L82 24 L84 46 Z" fill="#ffd35a" stroke="#f0a93a" stroke-width="2" stroke-linejoin="round"/>
    <rect x="36" y="42" width="48" height="6" rx="2" fill="#ff8a3d"/><circle cx="60" cy="33" r="3.6" fill="#ff8a3d"/><circle cx="38" cy="24" r="2.6" fill="#fffaf0"/><circle cx="82" cy="24" r="2.6" fill="#fffaf0"/><circle cx="60" cy="18" r="2.6" fill="#fffaf0"/></g>`,
  pilgrim: `<g class="hat"><path d="M45 44 L48 16 Q60 12 72 16 L75 44 Z" fill="#7a5644"/><ellipse cx="60" cy="45" rx="31" ry="6.5" fill="#5f4234"/>
    <rect x="46" y="35" width="28" height="8" fill="#3d2b24"/><rect x="55" y="33.5" width="10" height="11" rx="1.5" fill="none" stroke="#ffd35a" stroke-width="2.4"/><rect x="58" y="37" width="4" height="4" fill="#ffd35a"/></g>`,
  bunny: `<g class="hat"><path d="M38 40 Q28 6 42 3 Q54 4 54 38 Z" fill="#fff4f8"/><path d="M42 36 Q36 10 43 8 Q50 9 49 35 Z" fill="#ffb3cf"/>
    <path d="M82 40 Q92 6 78 3 Q66 4 66 38 Z" fill="#fff4f8"/><path d="M78 36 Q84 10 77 8 Q70 9 71 35 Z" fill="#ffb3cf"/>
    <path d="M34 44 Q60 36 86 44" fill="none" stroke="#d9a6ff" stroke-width="5" stroke-linecap="round"/></g>`,
};
const fallShape = (fill, extra) => `<g class="fall fall-a">${extra || `<path d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="${fill}"/>`}</g><g class="fall fall-b">${extra || `<path d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="${fill}"/>`}</g>`;
const FALLS = {
  petal: fallShape('#ffc6dc'),
  orange: fallShape('#ffa94d'),
  snow: fallShape('', '<circle r="2.6" fill="#fff"/><circle cx="1" cy="-1" r="1" fill="#e6f1ff"/>'),
  leaf: '<g class="fall fall-a"><path d="M0 0 q6 -3 9 3 q-5 5 -9 -3z M0 0 l-3 4" fill="#ffb26b" stroke="#e8893f" stroke-width=".9"/></g>',
};
const LOOK_DEFS = {
  winter: { label: '❄️ Winter', earmuffs: true },
  spring: { label: '🌸 Spring', fall: 'petal' },
  summer: { label: '😎 Summer', shades: true },
  autumn: { label: '🍂 Autumn', fall: 'leaf' },
  christmas: { label: '🎅 Christmas (18-25 Dec)', hat: 'santa', fall: 'snow' },
  halloween: { label: '🎃 Halloween (25-31 Oct)', hat: 'witch', fall: 'leaf' },
  kingsday: { label: "👑 King's Day (27 Apr)", hat: 'crown', fall: 'orange' },
  thanksgiving: { label: '🦃 Thanksgiving', hat: 'pilgrim', fall: 'leaf' },
  easter: { label: '🐰 Easter', hat: 'bunny', fall: 'petal' },
};

const looks = { on: true, preview: '' }; // preview: a look id picked in Options, until you reload
try { looks.on = localStorage.getItem('varken-looks') !== 'off'; } catch { /* default on */ }
// The look the pig wears now: a preview if one is picked, else today's look (or none when switched off).
const currentLook = () => looks.preview || (looks.on ? L.lookOf() : '');

(function wireLooks() {
  const sel = $('#lookSel'), on = $('#looksOn'), prev = $('#lookPrev');
  if (!sel) return;
  sel.innerHTML = '<option value="">Today\'s look</option><option value="none">No clothes</option>'
    + Object.keys(LOOK_DEFS).map((id) => `<option value="${id}">${LOOK_DEFS[id].label}</option>`).join('');
  on.checked = looks.on;
  const paintPrev = () => {
    const id = looks.preview === 'none' ? '' : currentLook();
    prev.innerHTML = pigSvg('happy', 'look-prev-pig', { stage: 1, look: id });
  };
  const apply = () => { renderHead(); paintPrev(); };
  sel.onchange = () => { looks.preview = sel.value; apply(); };
  on.onchange = () => {
    looks.on = on.checked;
    try { localStorage.setItem('varken-looks', looks.on ? 'on' : 'off'); } catch { /* ignore */ }
    apply();
  };
  $('#settingsBtn').addEventListener('click', paintPrev);
})();
