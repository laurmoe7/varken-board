// The pig: the header character and the pictures in empty lists. It changes mood with the board.

// moods: happy (default), sleep (nothing to do), worry (too many Nows), sniff (nothing matches).
// Drawn like a sticker: a wide round head, thick dark outline, floppy pointed ears, small wide-set eyes with
// big shines, a small snout and hatched blush. viewBox is 80 x 64.
const PIG_INK = '#2d1633';
function pigSvg(mood, cls) {
  const m = mood || 'happy';
  const line = `stroke="${PIG_INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  const eye = (x, dx) => `<ellipse cx="${x}" cy="38" rx="3.8" ry="4.4" fill="${PIG_INK}"/><circle cx="${x - 1.2 + dx}" cy="36.2" r="1.7" fill="#fff"/><circle cx="${x + 1.3 + dx}" cy="40" r=".8" fill="#fff"/>`;
  const brows = (a, b) => `<path d="M${25} ${a} q4 ${b} 8 0 M${47} ${a} q4 ${-b} 8 0" fill="none" ${line} stroke-width="1.6"/>`;
  const eyes = {
    happy: eye(29, 0) + eye(51, 0) + `<path d="M27 30 q2 -1.4 4 0 M49 30 q2 -1.4 4 0" fill="none" ${line} stroke-width="1.2"/>`,
    sleep: `<path d="M24.5 38 q4.5 4.5 9 0 M46.5 38 q4.5 4.5 9 0" fill="none" ${line}/>`,
    worry: eye(29, 0) + eye(51, 0) + `<path d="M26.5 30.5 l4.5 -2 M53.5 30.5 l-4.5 -2" fill="none" ${line} stroke-width="1.2"/>`,
    sniff: eye(29, 1.4) + eye(51, 1.4) + `<path d="M27 30 q2 -1.4 4 0 M49 30 q2 -1.4 4 0" fill="none" ${line} stroke-width="1.2"/>`,
  }[m];
  const extra = {
    happy: '',
    sleep: '<text x="62" y="13" font-size="10" font-weight="800" fill="#b9a4ff">z</text><text x="69" y="7" font-size="7" font-weight="800" fill="#b9a4ff">z</text>',
    worry: '<path d="M62 14 q4 5 0 8.5 q-4 -3.5 0 -8.5z" fill="#8fd3ff"/>',
    sniff: '<circle cx="68" cy="47" r="5" fill="#b9a4ff33" stroke="#b9a4ff" stroke-width="2.2"/><path d="M71.5 50.5 l4.5 4.5" stroke="#b9a4ff" stroke-width="3" stroke-linecap="round"/>',
  }[m];
  const mouth = m === 'sleep' ? '' : `<path d="M38.8 53.6 q1.2 1.2 2.4 0" fill="none" ${line} stroke-width="1.2"/>`;
  return `<svg class="pig ${cls || ''} pig-${m}" viewBox="0 0 80 66" aria-hidden="true">
    <g class="ear ear-l"><path d="M11 30 Q3 15 11 4 Q28 5 38 22 Z" fill="#ffa6c4" stroke="#ffa6c4" stroke-width="2" stroke-linejoin="round"/><path d="M14 25 Q9 14 14 9 Q24 11 30 20 Z" fill="#ff8fae"/></g>
    <g class="ear ear-r"><path d="M69 30 Q77 15 69 4 Q52 5 42 22 Z" fill="#ffa6c4" stroke="#ffa6c4" stroke-width="2" stroke-linejoin="round"/><path d="M66 25 Q71 14 66 9 Q56 11 50 20 Z" fill="#ff8fae"/></g>
    <ellipse cx="40" cy="38" rx="36" ry="27" fill="#ffb8cf"/>
    <g transform="translate(40 40) scale(1.12) translate(-40 -40)">
    <ellipse cx="17" cy="45" rx="7" ry="4.6" fill="#ff8cb4" opacity=".9"/>
    <ellipse cx="63" cy="45" rx="7" ry="4.6" fill="#ff8cb4" opacity=".9"/>
    <path d="M13.5 43 l2 4 M17.5 42.5 l2 4 M21.5 43 l2 4 M56.5 43 l2 4 M60.5 42.5 l2 4 M64.5 43 l2 4" stroke="${PIG_INK}" stroke-width="1.5" stroke-linecap="round"/>
    <g class="pig-eyes">${eyes}</g>
    <path d="M35 43.4 Q40 40.4 45 43.4 Q46 49.6 40 49.8 Q34 49.6 35 43.4 Z" fill="#f2709f"/>
    <ellipse cx="38.2" cy="45.6" rx=".8" ry="1.2" fill="${PIG_INK}"/><ellipse cx="41.8" cy="45.6" rx=".8" ry="1.2" fill="${PIG_INK}"/>
    ${mouth}
    </g>
    ${extra}
  </svg>`;
}

// What the pig says in the header, by what the board looks like. Several lines each; one stays until you
// poke the pig or the board changes.
const SAYINGS = {
  gallery: ['Pretty things to make! ✨', 'Ooh, what will they wear next?', 'Every little hat counts.', 'Sparkly ideas only, please.'],
  gallery0: ['No ideas yet. Feed me a picture?', 'Paste a picture, I will wait.'],
  many: ['Oink! So many Nows. Pick the real few.', 'Deep breath. Which one matters most?', 'Not everything is a Now, friend.'],
  clear: ['All clear. Snout up, nap time.', 'Nothing to do. You earned it. 💤', 'Zzz... good job... zzz...'],
  one: ['Just one thing. You can do it!', 'One little task. Easy peasy.', 'Only one left. Almost there!'],
  some: ['Oink! {n} things. One at a time.', 'You are doing great, truly. 💗', 'Small steps still get you there.', 'I believe in you! {n} to go.', 'Tiny wins add up. Go go go!', 'Take a sip of water, then the next one.', 'You make it look easy.'],
};
let sayKey = '', sayText = '', sayN = 0;
function heroSay(gp, open, now, poke) {
  const key = gp ? (open ? 'gallery' : 'gallery0') : now > L.NOW_CAP ? 'many' : !open ? 'clear' : open === 1 ? 'one' : 'some';
  if (key !== sayKey || poke) {
    const list = SAYINGS[key];
    let pick = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && pick === sayText.replace(/\d+/, '{n}')) pick = list[(list.indexOf(pick) + 1) % list.length];
    sayKey = key;
    sayText = pick;
  }
  return sayText.replace('{n}', open);
}

function paintHero(gp, open, now, poke) {
  const mood = gp ? 'happy' : now > L.NOW_CAP ? 'worry' : open ? 'happy' : 'sleep';
  $('#heroPig').innerHTML = pigSvg(mood);
  $('#heroSay').textContent = heroSay(gp, open, now, poke);
}

// A friendly empty list: the pig, a headline, a hint.
function emptyHtml(mood, title, hint) {
  return `<div class="empty">${pigSvg(mood, 'big')}<b>${esc(title)}</b>${esc(hint)}</div>`;
}

// Poking the pig makes it say something new.
$('#heroPig').addEventListener('click', () => renderHead(true));

// The little pig by the name in the sidebar.
$('#logoPig').innerHTML = pigSvg('happy', 'logo');
