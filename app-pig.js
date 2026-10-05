// The pig: the header character, the pictures in empty lists and the app icon. A round squishy "mochi" blob
// with a seedling on his head. In the header he also holds a sticky note, and the seedling grows with how
// many things you checked off today (bud, leaves, flower). It changes mood with the board.

const PIG_INK = '#2d1633';
const PIG_STAGES = 3;

// The plant on his head: stage 0 a bud, 1 two leaves, 2 leaves and a flower.
function sproutSvg(stage) {
  const stem = (top) => `<path d="M60 34 Q60 ${top + 12} 58 ${top}" fill="none" stroke="#5fd3a0" stroke-width="3.4" stroke-linecap="round"/>`;
  if (stage <= 0) return '<path d="M60 34 Q60 28 60 24" fill="none" stroke="#5fd3a0" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="60" cy="21" rx="4" ry="5.5" fill="#8ff0c8"/>';
  if (stage === 1) return stem(14) + '<path d="M58 16 Q42 8 36 18 Q48 26 58 16 Z" fill="#8ff0c8"/><path d="M59 20 Q76 10 84 20 Q70 30 59 20 Z" fill="#6fe2b4"/>';
  return (
    stem(10) +
    '<path d="M59 26 Q42 20 36 30 Q48 36 59 26 Z" fill="#8ff0c8"/><path d="M60 28 Q77 20 85 30 Q71 38 60 28 Z" fill="#6fe2b4"/>' +
    '<g transform="translate(58 8)"><circle r="3.2" fill="#ffe29a"/><g fill="#ff9ec7"><circle cy="-6.2" r="3.6"/><circle cx="5.9" cy="-1.9" r="3.6"/><circle cx="3.6" cy="5" r="3.6"/><circle cx="-3.6" cy="5" r="3.6"/><circle cx="-5.9" cy="-1.9" r="3.6"/></g><circle r="3.2" fill="#ffe29a"/></g>'
  );
}

// moods: happy (default), sleep (nothing to do), worry (too many Nows), sniff (nothing matches).
// opts: note (hold the sticky note, header only), stage (the plant, default leaves).
function pigSvg(mood, cls, opts) {
  const m = mood || 'happy';
  const o = opts || {};
  const stage = o.stage == null ? 1 : o.stage;
  const eye = (x, dx) => `<ellipse cx="${x}" cy="62" rx="4.4" ry="5.2" fill="${PIG_INK}"/><circle cx="${x - 1.4 + dx}" cy="60" r="1.9" fill="#fff"/>`;
  const eyes = {
    happy: eye(45, 0) + eye(75, 0),
    sleep: `<path d="M39.5 63 q5.5 5 11 0 M69.5 63 q5.5 5 11 0" fill="none" stroke="${PIG_INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    worry: eye(45, 0) + eye(75, 0) + `<path d="M38 55 l11 -3.5 M82 55 l-11 -3.5" fill="none" stroke="${PIG_INK}" stroke-width="2" stroke-linecap="round"/>`,
    sniff: eye(45, 1.6) + eye(75, 1.6),
  }[m];
  const extra = {
    happy: '',
    sleep: '<text x="92" y="40" font-size="14" font-weight="800" fill="#b9a4ff">z</text><text x="102" y="28" font-size="10" font-weight="800" fill="#b9a4ff">z</text>',
    worry: '<path d="M98 36 q5 6 0 10.5 q-5 -4.5 0 -10.5z" fill="#8fd3ff"/>',
    sniff: '<circle cx="100" cy="30" r="7" fill="#b9a4ff33" stroke="#b9a4ff" stroke-width="2.6"/><path d="M105 35 l7 7" stroke="#b9a4ff" stroke-width="3.6" stroke-linecap="round"/>',
  }[m];
  const note = o.note
    ? `<g class="note-grp"><g transform="rotate(-6 60 92)"><rect x="32" y="82" width="56" height="34" rx="5" fill="#ffe29a"/><path d="M32 106 q10 -2 18 4 l-18 6 z" fill="#f0cc78"/>
    <path d="M40 92 h26 M40 99 h18" stroke="#c9a24a" stroke-width="2.4" stroke-linecap="round"/><path d="M70 90 l4 4 8 -9" fill="none" stroke="#ff6f9f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <ellipse cx="30" cy="92" rx="7" ry="9" transform="rotate(-24 30 92)" fill="#ffa6c4"/><ellipse cx="90" cy="92" rx="7" ry="9" transform="rotate(24 90 92)" fill="#ffa6c4"/></g>`
    : '<ellipse cx="14" cy="80" rx="7" ry="10" transform="rotate(20 14 80)" fill="#ffa6c4"/><ellipse cx="106" cy="80" rx="7" ry="10" transform="rotate(-20 106 80)" fill="#ffa6c4"/>';
  return `<svg class="pig ${cls || ''} pig-${m}" viewBox="0 0 120 120" aria-hidden="true"><g class="pig-all">
    <ellipse cx="44" cy="104" rx="10" ry="6" fill="#ff9fbc"/><ellipse cx="76" cy="104" rx="10" ry="6" fill="#ff9fbc"/>
    <g class="ear ear-l"><path d="M26 44 Q20 22 36 20 Q50 22 54 36 Z" fill="#ffa6c4"/></g><g class="ear ear-r"><path d="M94 44 Q100 22 84 20 Q70 22 66 36 Z" fill="#ffa6c4"/></g>
    <ellipse cx="60" cy="70" rx="46" ry="38" fill="#ffb8cf"/><ellipse cx="60" cy="82" rx="30" ry="20" fill="#ffd3e2" opacity=".55"/>
    <g class="sprout-slot">${sproutSvg(stage)}</g>
    <g class="pig-eyes">${eyes}</g>
    <ellipse cx="33" cy="74" rx="8" ry="5" fill="#ff8cb4" opacity=".85"/><ellipse cx="87" cy="74" rx="8" ry="5" fill="#ff8cb4" opacity=".85"/>
    <ellipse cx="60" cy="74" rx="8" ry="5.6" fill="#f2709f"/><ellipse cx="57" cy="74" rx="1.1" ry="1.7" fill="${PIG_INK}"/><ellipse cx="63" cy="74" rx="1.1" ry="1.7" fill="${PIG_INK}"/>
    ${note}
    </g>${extra}
  </svg>`;
}

// What the pig says in the header, by what the board looks like. Several lines each; one stays until you
// poke the pig or the board changes.
const SAYINGS = {
  gallery: ['Pretty things to make! ✨', 'Ooh, what will they wear next?', 'Every little hat counts.', 'Sparkly ideas only, please.', 'Fashion emergency! I need a hat.', 'I demand a tiny crown. Just saying.', 'Make me look fabulous, no pressure.', 'Obviously I will wear all of them.'],
  gallery0: ['No ideas yet. Feed me a picture?', 'Paste a picture, I will wait.', 'My wardrobe is empty. Rude.', 'Naked pig, no ideas. Help!'],
  notes: ['Jot it down, sort it later.', 'Loose thoughts are welcome here.', 'No categories, no pressure. 🌸', 'Ooh, what are you thinking about?', 'Write it down before it escapes!', 'Brain dump time. I will not judge. Much.', 'Half-baked ideas are my favourite.'],
  notes0: ['A blank page. Write me something!', 'Nothing yet. Even tiny thoughts count.', 'So empty. Say something clever.'],
  many: ['Oink! So many Nows. Pick the real few.', 'Deep breath. Which one matters most?', 'Not everything is a Now, friend.', 'Everything is urgent? Sure it is. 🙄', 'That is not a list, that is a cry for help.', 'Bold of you to call all of these Now.', 'I am sweating. Please demote some.'],
  clear: ['All clear. Snout up, nap time.', 'Nothing to do. You earned it. 💤', 'Zzz... good job... zzz...', 'Empty list. Who even are you?', 'Do not wake me. I am dreaming of snacks.', 'Done already? Show-off.'],
  one: ['Just one thing. You can do it!', 'One little task. Easy peasy.', 'Only one left. Almost there!', 'One task. I have seen you do worse.', 'Just one. Do it, or I will stare.', 'One! Even I could do that. (I will not.)'],
  some: ['Oink! {n} things. One at a time.', 'You are doing great, truly. 💗', 'Small steps still get you there.', 'I believe in you! {n} to go.', 'Tiny wins add up. Go go go!', 'Take a sip of water, then the next one.', 'You make it look easy.', '{n} things. I will supervise from here.', 'Procrastinating? I can tell. 👀', 'Stop reading me and do a task!', 'I am cheering extremely quietly. Do not test me.', 'Ooh, {n} tasks. Ambitious. I like it.', 'Pick the easy one first. I will not tell.', 'You are one task away from feeling smug.', 'Less staring at the pig, more doing.'],
};
let sayKey = '', sayText = '', sayN = 0;
let sayHold = { text: '', until: 0 };
function heroSay(gp, open, now, poke) {
  if (Date.now() < sayHold.until && !poke) return sayHold.text;
  const key = gp === 'notes' ? (open ? 'notes' : 'notes0') : gp ? (open ? 'gallery' : 'gallery0') : now > L.NOW_CAP ? 'many' : !open ? 'clear' : open === 1 ? 'one' : 'some';
  if (key !== sayKey || poke) {
    const list = SAYINGS[key];
    let pick = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && pick === sayText.replace(/\d+/, '{n}')) pick = list[(list.indexOf(pick) + 1) % list.length];
    sayKey = key;
    sayText = pick;
  }
  return sayText.replace('{n}', open);
}

let heroMood = '', heroStage = -1;
function paintHero(gp, open, now, poke) {
  const mood = gp ? (gp === 'notes' && !open ? 'sleep' : 'happy') : now > L.NOW_CAP ? 'worry' : open ? 'happy' : 'sleep';
  const done = L.doneToday(state.items, Date.now(), 'all');
  const stage = done >= 3 ? 2 : done >= 1 ? 1 : 0; // the plant grows through the day
  if (mood !== heroMood) {
    $('#heroPig').innerHTML = pigSvg(mood, '', { note: true, stage });
    heroMood = mood;
    heroStage = stage;
  } else if (stage !== heroStage) {
    const svg = $('#heroPig svg'); // swap only the plant so a running action isn't cut
    svg.querySelector('.sprout-slot').innerHTML = sproutSvg(stage);
    if (stage > heroStage) { svg.classList.add('grew'); setTimeout(() => svg.classList.remove('grew'), 900); }
    heroStage = stage;
  }
  $('#heroSay').textContent = heroSay(gp, open, now, poke);
}

// A friendly empty list: the pig, a headline, a hint.
function emptyHtml(mood, title, hint) {
  return `<div class="empty">${pigSvg(mood, 'big')}<b>${esc(title)}</b>${esc(hint)}</div>`;
}

// Actions: hop, show off the note, wiggle, sway the plant, and cheer. The class stays on the svg until it ends.
const ACTS = ['hop', 'note', 'wiggle', 'sprout'];
let actTimer;
function pigAct(name) {
  const svg = $('#heroPig svg');
  if (!svg) return;
  ACTS.concat('cheer').forEach((a) => svg.classList.remove('act-' + a));
  void svg.getBoundingClientRect(); // restart the animation if the same action repeats
  svg.classList.add('act-' + name);
  clearTimeout(actTimer);
  actTimer = setTimeout(() => svg.classList.remove('act-' + name), name === 'wiggle' ? 2100 : 1800);
}
function floatHearts(n) {
  const box = $('#heroPig');
  for (let i = 0; i < n; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = '♥';
    h.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 70) + 'px');
    h.style.animationDelay = i * 90 + 'ms';
    box.appendChild(h);
    setTimeout(() => h.remove(), 1500 + i * 90);
  }
}
// Something got checked off: the pig cheers; when the whole list is clear he says so for a while.
const CLEAR_SAYS = ['EVERYTHING done!! Who is amazing? You.', 'Empty list! I am so proud of you. 🎉', 'All clear!! Time for a snack.', 'Look at you, being all productive. Ugh, adorable.', 'Zero tasks. I am obsessed with you right now.', 'Is there anything you cannot do? Rude.', 'Done, done, DONE. Take a bow. 🎀']; // when the whole list is clear
function pigCheer(allClear) {
  pigAct('cheer');
  floatHearts(allClear ? 8 : 4);
  if (allClear) {
    sayHold = { text: CLEAR_SAYS[Math.floor(Math.random() * CLEAR_SAYS.length)], until: Date.now() + 6000 };
    $('#heroSay').textContent = sayHold.text;
    setTimeout(() => renderHead(), 6100);
  }
}
// Poking the pig makes him do something and say something new.
$('#heroPig').addEventListener('click', () => {
  pigAct(ACTS[Math.floor(Math.random() * ACTS.length)]);
  renderHead(true);
});
// Now and then he does something on his own.
setInterval(() => {
  if (!document.hidden && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) pigAct(ACTS[Math.floor(Math.random() * ACTS.length)]);
}, 35000);

// The little pig by the name in the sidebar.
$('#logoPig').innerHTML = pigSvg('happy', 'logo');
