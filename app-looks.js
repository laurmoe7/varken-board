// The pig's seasonal and holiday clothes. Loads before app-pig.js, which draws them (pigSvg opts.look).
// A look is a season (winter earmuffs, summer shades, falling petals or a leaf) or a holiday (a hat plus something falling).
// A hat replaces the plant for those few days; at night the nightcap still wins, unless a look is being previewed.
const party = (body, trim, dots) => `<g class="hat"><g transform="rotate(-9 60 46)"><path d="M43 46 L60 4 L77 46 Z" fill="${body}"/>${dots}<path d="M43 46 Q60 52 77 46" fill="none" stroke="${trim}" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="4" r="5.5" fill="${trim}"/></g></g>`;
const heart = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-6 -4 -12 4 0 12 C12 4 6 -4 0 4Z" fill="${f}"/>`;
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
  birthday: party('#ff9ec7', '#ffe29a', '<circle cx="56" cy="28" r="2.4" fill="#fff4b0"/><circle cx="64" cy="36" r="2.4" fill="#b9a4ff"/><circle cx="55" cy="40" r="2" fill="#8fd3ff"/><circle cx="62" cy="20" r="1.8" fill="#fff"/>'),
  newyear: party('#3a2f86', '#ffd35a', '<path d="M56 30 l1.3 2.8 3 .3 -2.2 2 .7 3 -2.8 -1.6 -2.8 1.6 .7 -3 -2.2 -2 3 -.3z" fill="#ffd35a"/><circle cx="64" cy="22" r="1.6" fill="#ffd35a"/>'),
  sinterklaas: `<g class="hat"><path d="M40 46 Q42 22 60 4 Q78 22 80 46 Z" fill="#e63950"/>
    <rect x="39" y="40" width="42" height="8" rx="3" fill="#ffd35a"/><rect x="58.4" y="12" width="3.2" height="16" fill="#ffd35a"/><rect x="53" y="17.5" width="14" height="3.2" fill="#ffd35a"/></g>`,
  carnival: `<g class="hat"><path d="M36 46 Q30 28 31 14 Q44 22 54 36 Z" fill="#ff9a3d"/><path d="M48 38 Q54 20 60 6 Q66 20 72 38 Z" fill="#b57bff"/><path d="M66 36 Q76 22 89 14 Q90 28 84 46 Z" fill="#ff9a3d"/>
    <path d="M36 46 Q60 38 84 46" fill="none" stroke="#ffe29a" stroke-width="5" stroke-linecap="round"/><circle cx="31" cy="14" r="4" fill="#ffd35a"/><circle cx="60" cy="6" r="4" fill="#ffd35a"/><circle cx="89" cy="14" r="4" fill="#ffd35a"/></g>`,
  valentine: `<g class="hat"><path d="M34 44 Q60 34 86 44" fill="none" stroke="#ff7fa6" stroke-width="4.5" stroke-linecap="round"/><path d="M44 40 Q40 32 42 24 M76 40 Q80 32 78 24" fill="none" stroke="#ff7fa6" stroke-width="2.4" stroke-linecap="round"/>${heart(42, 12, 1, '#ff4f7d')}${heart(78, 12, 1, '#ffb3cf')}</g>`,
  stpatrick: `<g class="hat"><path d="M46 42 L48 12 H72 L74 42 Z" fill="#4ec98a"/><ellipse cx="60" cy="43" rx="30" ry="6.5" fill="#3aa06b"/><rect x="47" y="33" width="26" height="8" fill="#2a7a52"/><rect x="56" y="32" width="8" height="10" rx="1.5" fill="none" stroke="#ffd35a" stroke-width="2.2"/>
    <circle cx="57" cy="22" r="3.2" fill="#c6f7da"/><circle cx="63" cy="22" r="3.2" fill="#c6f7da"/><circle cx="60" cy="18" r="3.2" fill="#c6f7da"/></g>`,
  fourth: `<g class="hat"><path d="M46 42 L48 10 H72 L74 42 Z" fill="#fffaf5"/><path d="M48 12 h4 l1 30 h-4z M56 11 h4 v31 h-4z M64 11 h4 v31 h-4z M70 12 h2 l1.5 30 h-3z" fill="#ff6b82"/>
    <rect x="46" y="30" width="28" height="12" fill="#4a5fd0"/><path d="M52 36 l1 2 2 .2 -1.5 1.4 .5 2 -2 -1 -2 1 .5 -2 -1.5 -1.4 2 -.2z M66 36 l1 2 2 .2 -1.5 1.4 .5 2 -2 -1 -2 1 .5 -2 -1.5 -1.4 2 -.2z" fill="#fffaf5" transform="scale(.9) translate(6 3.5)"/>
    <ellipse cx="60" cy="43" rx="31" ry="6.5" fill="#3a47a8"/><ellipse cx="60" cy="10" rx="12" ry="3" fill="#ff8aa0"/></g>`,
  bunny: `<g class="hat"><path d="M38 40 Q28 6 42 3 Q54 4 54 38 Z" fill="#fff4f8"/><path d="M42 36 Q36 10 43 8 Q50 9 49 35 Z" fill="#ffb3cf"/>
    <path d="M82 40 Q92 6 78 3 Q66 4 66 38 Z" fill="#fff4f8"/><path d="M78 36 Q84 10 77 8 Q70 9 71 35 Z" fill="#ffb3cf"/>
    <path d="M34 44 Q60 36 86 44" fill="none" stroke="#d9a6ff" stroke-width="5" stroke-linecap="round"/></g>`,
};
// Falling bits: one piece per colour, each with its own start, speed and delay so they never move in step.
const petalPath = (f, s) => `<path transform="scale(${s || 1})" d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="${f}"/>`;
const starPath = (f) => `<path d="M0 -3 l.9 2 2.1 .2 -1.6 1.4 .5 2.2 -1.9 -1.1 -1.9 1.1 .5 -2.2 -1.6 -1.4 2.1 -.2z" fill="${f}"/>`;
const fallPieces = (shape, colors) => colors.map((c, i) => `<g class="fall" style="--x:${-84 + i * (96 / Math.max(1, colors.length - 1)) | 0}px;--t:${14 + (i % 3) * 3}s;--d:${(i * 2.9) % 12}s">${shape(c, i)}</g>`).join('');
const FALLS = {
  petal: fallPieces((c) => petalPath(c, 1.2), ['#ffc6dc', '#fff0f6', '#ffa6c4', '#e9d8ff', '#ffe0ec', '#ffb3cf']),
  orange: fallPieces((c) => petalPath(c, 1.2), ['#ffa94d', '#ff8a3d', '#ffd9a8', '#fffaf0', '#ffc27a', '#ff9a3d']),
  leaf: fallPieces((c) => petalPath(c, 1.5), ['#ffb26b', '#e8624a', '#ffd35a', '#c9794a', '#ff9a3d', '#d9a066', '#f2784b']),
  snow: fallPieces((c, i) => `<circle r="${[2.8, 2, 3.2, 1.8, 2.5, 2.2][i % 6]}" fill="${c}"/>`, ['#ffffff', '#e6f1ff', '#ffffff', '#d4e8ff', '#ffffff', '#f0f7ff']),
  hearts: fallPieces((c) => heart(0, 0, .45, c), ['#ff7fa6', '#ffb3cf', '#ff4f7d', '#ffd0e0', '#ff9ec7', '#e0457b']),
  clover: fallPieces((c) => `<circle cx="-1.6" r="1.8" fill="${c}"/><circle cx="1.6" r="1.8" fill="${c}"/><circle cy="-2" r="1.8" fill="${c}"/>`, ['#4ec98a', '#8ff0c8', '#3aa06b', '#b8f5d0', '#5fd3a0', '#6ee0a8']),
  stars: fallPieces((c) => starPath(c), ['#ffe29a', '#fffaf0', '#ff8aa0', '#8fb4ff', '#ffd35a', '#ffffff']),
  nuts: fallPieces((c) => `<circle r="1.9" fill="${c}"/><circle cx="4" cy="3" r="1.4" fill="${c}"/>`, ['#d9a066', '#c68a4f', '#e8b878', '#b97a46', '#f0c890']),
  confetti: fallPieces((c, i) => `<rect width="5" height="2.4" fill="${c}" transform="rotate(${i * 37})"/>`, ['#ff7fa6', '#8fd3ff', '#ffe29a', '#b9a4ff', '#8ff0c8', '#ffa94d', '#ff6b82']),
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
  easter: { label: '🐰 Easter (Good Friday to Monday)', hat: 'bunny', fall: 'petal' },
  birthday: { label: '🎂 Lauren\'s birthday (10 May)', hat: 'birthday', fall: 'confetti' },
  sinterklaas: { label: '🎁 Sinterklaas (3-5 Dec)', hat: 'sinterklaas', fall: 'nuts' },
  newyear: { label: '🎆 New Year (30 Dec-1 Jan)', hat: 'newyear', fall: 'confetti' },
  carnival: { label: '🎭 Carnival', hat: 'carnival', fall: 'confetti' },
  valentine: { label: '💘 Valentine (12-14 Feb)', hat: 'valentine', fall: 'hearts' },
  stpatrick: { label: '☘️ St Patrick (17 Mar)', hat: 'stpatrick', fall: 'clover' },
  fourth: { label: '🎆 4th of July (3-4 Jul)', hat: 'fourth', fall: 'stars' },
};

const looks = { on: true, preview: '' }; // preview: a look id picked in Options, until you reload
try { looks.on = localStorage.getItem('varken-looks') !== 'off'; } catch { /* default on */ }
// The look the pig wears now: a preview if one is picked, else today's look (or none when switched off).
const currentLook = () => looks.preview || (looks.on ? L.lookOf() : '');

(function wireLooks() {
  const sel = $('#lookSel'), on = $('#looksOn'), prev = $('#lookPrev'), state0 = $('#fxState');
  if (!sel) return;
  sel.innerHTML = '<option value="">Today\'s look</option><option value="none">No clothes</option>'
    + Object.keys(LOOK_DEFS).map((id) => `<option value="${id}">${LOOK_DEFS[id].label}</option>`).join('');
  on.checked = looks.on;
  const paintPrev = () => {
    const id = looks.preview === 'none' ? '' : currentLook();
    const asleep = state0.value === 'asleep';
    prev.innerHTML = pigSvg(asleep ? 'sleep' : 'happy', 'look-prev-pig', { stage: 1, look: id, morning: state0.value === 'morning', cap: asleep && !looks.preview });
  };
  const apply = () => { renderHead(); paintPrev(); };
  sel.onchange = () => { looks.preview = sel.value; apply(); };
  state0.onchange = paintPrev;
  on.onchange = () => {
    looks.on = on.checked;
    try { localStorage.setItem('varken-looks', looks.on ? 'on' : 'off'); } catch { /* ignore */ }
    apply();
  };
  $('#settingsBtn').addEventListener('click', paintPrev);

  // The effect buttons: one-off versions of the pig's idle effects on the preview pig, or page-wide ones after closing the window.
  const FX_MS = { fall: 6500, fly: 8200, note: 5200, blink: 2000, stretch: 1900, peek: 4200, bubble: 5200 };
  let fxTimer;
  const showPage = (fn) => { $('#settingsDlg').close(); setTimeout(fn, 400); };
  $('#fxGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fx]');
    if (!b) return;
    const fx = b.dataset.fx, svg = prev.querySelector('svg');
    if (['dance', 'hop', 'wiggle'].includes(fx)) return pigAct(fx, svg);
    if (fx === 'oink') return oink();
    if (fx === 'chime') return showPage(() => celebrate($('#heroPig'), false, 0));
    if (fx === 'party') return showPage(() => celebrate($('#heroPig'), false, 5));
    if (fx === 'birthday') return showPage(birthdayHello);
    if (fx === 'wrap') return showPage(weekWrap);
    if ((fx === 'peek' || fx === 'bubble') && state0.value !== 'asleep') { state0.value = 'asleep'; state0.dispatchEvent(new Event('change')); }
    if (['stretch', 'fall', 'fly', 'note', 'blink'].includes(fx) && state0.value === 'asleep') { state0.value = 'day'; state0.dispatchEvent(new Event('change')); }
    const now = prev.querySelector('svg');
    Object.keys(FX_MS).forEach((n) => now.classList.remove('fx-' + n));
    void now.getBoundingClientRect();
    now.classList.add('fx-' + fx);
    clearTimeout(fxTimer);
    fxTimer = setTimeout(() => now.classList.remove('fx-' + fx), FX_MS[fx] || 3000);
  });
})();
