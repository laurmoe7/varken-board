// The pig: the header character, the pictures in empty lists and the app icon. A round squishy "mochi" blob
// with a seedling on his head. In the header he also holds a sticky note, and the seedling grows with how
// many things you checked off today (bud, leaves, flower). It changes mood with the board.

const PIG_INK = '#2d1633';

// The plant on his head grows every 3 tasks done today: 0 a bud, 3 two leaves, 6 a flower bud, 9 in full bloom.
function sproutSvg(stage) {
  const stem = (top) => `<path d="M60 34 Q60 ${top + 12} 58 ${top}" fill="none" stroke="#5fd3a0" stroke-width="3.4" stroke-linecap="round"/>`;
  const leaves = (y) => `<path d="M59 ${y} Q42 ${y - 6} 36 ${y + 4} Q48 ${y + 10} 59 ${y} Z" fill="#8ff0c8"/><path d="M60 ${y + 2} Q77 ${y - 6} 85 ${y + 4} Q71 ${y + 12} 60 ${y + 2} Z" fill="#6fe2b4"/>`;
  if (stage <= 0) return '<path d="M60 34 Q60 28 60 24" fill="none" stroke="#5fd3a0" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="60" cy="21" rx="4" ry="5.5" fill="#8ff0c8"/>';
  if (stage === 1) return stem(14) + '<path d="M58 16 Q42 8 36 18 Q48 26 58 16 Z" fill="#8ff0c8"/><path d="M59 20 Q76 10 84 20 Q70 30 59 20 Z" fill="#6fe2b4"/>';
  if (stage === 2) return stem(12) + leaves(26) + '<ellipse cx="58" cy="9" rx="5" ry="7" fill="#ff9ec7"/><path d="M53 12 Q58 16 63 12 Q61 17 58 17 Q55 17 53 12 Z" fill="#6fe2b4"/>';
  return (
    stem(10) +
    leaves(26) +
    '<g transform="translate(58 8)"><circle r="3.4" fill="#ffe29a"/><g fill="#ff9ec7"><circle cy="-6.6" r="3.9"/><circle cx="6.3" cy="-2" r="3.9"/><circle cx="3.9" cy="5.3" r="3.9"/><circle cx="-3.9" cy="5.3" r="3.9"/><circle cx="-6.3" cy="-2" r="3.9"/></g><circle r="3.4" fill="#ffe29a"/></g>' +
    '<path d="M76 8 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="#ffe29a"/><path d="M40 12 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z" fill="#ffe29a"/>'
  );
}

const NIGHTCAP = `<g class="nightcap"><path d="M32 44 Q36 16 66 14 Q92 14 98 30 Q104 40 108 56 Q100 50 94 50 Q80 44 62 44 Q44 44 32 44 Z" fill="#b9a4ff"/>
    <path d="M32 44 Q50 38 64 40 Q84 40 96 48" fill="none" stroke="#d8ccff" stroke-width="5" stroke-linecap="round"/><circle cx="109" cy="58" r="6.5" fill="#fff4de"/>
    <path d="M62 24 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4z" fill="#ffe29a"/></g>`;

// moods: happy (default), sleep (nothing to do), worry (too many Nows), sniff (nothing matches).
// opts: note (hold the sticky note, header only), stage (the plant, default leaves), cap (a nightcap instead of the plant).
function pigSvg(mood, cls, opts) {
  const m = mood || 'happy';
  const o = opts || {};
  const stage = o.stage == null ? 1 : o.stage;
  const look = LOOK_DEFS[o.look] || {};
  const eye = (x, dx) => `<ellipse cx="${x}" cy="62" rx="4.4" ry="5.2" fill="${PIG_INK}"/><circle cx="${x - 1.4 + dx}" cy="60" r="1.9" fill="#fff"/>`;
  const eyes = {
    happy: eye(45, 0) + eye(75, 0),
    sleep: `<path d="M39.5 63 q5.5 5 11 0 M69.5 63 q5.5 5 11 0" fill="none" stroke="${PIG_INK}" stroke-width="2.6" stroke-linecap="round"/>
      <g class="peek"><ellipse cx="75" cy="62" rx="5.4" ry="5.8" fill="#ffb8cf"/>${eye(75, 1.6)}</g>`,
    worry: eye(45, 0) + eye(75, 0) + `<path d="M38 55 l11 -3.5 M82 55 l-11 -3.5" fill="none" stroke="${PIG_INK}" stroke-width="2" stroke-linecap="round"/>`,
    sniff: eye(45, 1.6) + eye(75, 1.6),
  }[m];
  const extra = {
    happy: '<text class="day-note" x="96" y="46" font-size="13" font-weight="800" fill="#ffd1e6">♪</text>'
      + '<g class="day-fly"><path d="M0 0 q-5 -7 -7 -2 q0 5 7 2 q5 3 7 -2 q-2 -5 -7 2z" fill="#ffe29a" stroke="#ffc46b" stroke-width=".8"/></g>'
      + (o.morning ? '<g class="day-sun"><circle cx="16" cy="18" r="6" fill="#ffe29a"/><g class="day-rays" stroke="#ffe29a" stroke-width="2" stroke-linecap="round"><path d="M16 6v3M16 27v3M4 18h3M25 18h3M7.5 9.5l2 2M22.5 24.5l2 2M24.5 9.5l-2 2M9.5 24.5l-2 2"/></g></g>' : ''),
    sleep: '<text x="92" y="40" font-size="14" font-weight="800" fill="#b9a4ff">z</text><text x="102" y="28" font-size="10" font-weight="800" fill="#b9a4ff">z</text>',
    worry: '<path d="M98 36 q5 6 0 10.5 q-5 -4.5 0 -10.5z" fill="#8fd3ff"/>',
    sniff: '<circle cx="100" cy="30" r="7" fill="#b9a4ff33" stroke="#b9a4ff" stroke-width="2.6"/><path d="M105 35 l7 7" stroke="#b9a4ff" stroke-width="3.6" stroke-linecap="round"/>',
  }[m];
  const note = o.note
    ? `<g class="note-grp"><g transform="rotate(-6 60 92)"><rect x="32" y="82" width="56" height="34" rx="5" fill="#ffe29a"/><path d="M32 106 q10 -2 18 4 l-18 6 z" fill="#f0cc78"/>
    <path d="M40 92 h26 M40 99 h18" stroke="#c9a24a" stroke-width="2.4" stroke-linecap="round"/><path d="M70 90 l4 4 8 -9" fill="none" stroke="#ff6f9f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <ellipse cx="30" cy="92" rx="7" ry="9" transform="rotate(-24 30 92)" fill="#ffa6c4"/><ellipse cx="90" cy="92" rx="7" ry="9" transform="rotate(24 90 92)" fill="#ffa6c4"/></g>`
    : '<ellipse cx="14" cy="80" rx="7" ry="10" transform="rotate(20 14 80)" fill="#ffa6c4"/><ellipse cx="106" cy="80" rx="7" ry="10" transform="rotate(-20 106 80)" fill="#ffa6c4"/>';
  return `<svg class="pig ${cls || ''} pig-${m}${o.morning ? ' pig-morning' : ''}${o.look ? ' look-' + o.look : ''}" viewBox="0 0 120 120" aria-hidden="true"><g class="pig-all">
    <ellipse cx="44" cy="104" rx="10" ry="6" fill="#ff9fbc"/><ellipse cx="76" cy="104" rx="10" ry="6" fill="#ff9fbc"/>
    <g class="ear ear-l"><path d="M26 44 Q20 22 36 20 Q50 22 54 36 Z" fill="#ffa6c4"/></g><g class="ear ear-r"><path d="M94 44 Q100 22 84 20 Q70 22 66 36 Z" fill="#ffa6c4"/></g>
    <ellipse cx="60" cy="70" rx="46" ry="38" fill="#ffb8cf"/><ellipse cx="60" cy="82" rx="30" ry="20" fill="#ffd3e2" opacity=".55"/>
    ${look.earmuffs && !o.cap ? EARMUFFS : ''}
    ${o.cap ? NIGHTCAP : look.hat ? HATS[look.hat] : `<g class="sprout-slot">${sproutSvg(stage)}</g>`}
    <g class="pig-eyes">${eyes}</g>
    ${look.shades && !o.cap ? SHADES : ''}
    <ellipse cx="33" cy="74" rx="8" ry="5" fill="#ff8cb4" opacity=".85"/><ellipse cx="87" cy="74" rx="8" ry="5" fill="#ff8cb4" opacity=".85"/>
    <ellipse cx="60" cy="74" rx="8" ry="5.6" fill="#f2709f"/><ellipse cx="57" cy="74" rx="1.1" ry="1.7" fill="${PIG_INK}"/><ellipse cx="63" cy="74" rx="1.1" ry="1.7" fill="${PIG_INK}"/>
    ${note}
    ${look.fall ? FALLS[look.fall] : ''}
    ${m === 'sleep' ? '<g class="snot"><circle cx="64" cy="76" r="4.5" fill="#d9ecff88" stroke="#fff" stroke-width="1.2"/><circle cx="62.6" cy="74.4" r="1.2" fill="#fff"/></g>' : ''}
    </g>${extra}
  </svg>`;
}

// What the pig says in the header, by what the board looks like. Several lines each; one stays until you
// poke the pig or the board changes.
const SAYINGS = {
  birthday: ['Happy birthday, Lauren! 🎂', 'It is your day! Do nothing. Or one tiny task.', 'Varken nummer één has a birthday!', 'Gefeliciteerd! I got you a hat. You are welcome.', 'Cake first, tasks later. Pig rules.'],
  night: ['Hrrrrng.. it is late. Go to bed.', 'Shh. Even the plant is asleep.', 'Excuse me, some of us are sleeping. hehe', 'Zzz.. one more task and then bed.. zzz..', 'It is the middle of the night. I judge you lovingly.'],
  gallery: ['Pretty things to make! ✨', 'Ooh, what will they wear next?', 'Every little hat counts.', 'Sparkly ideas only, please.', 'Fashion emergency! I need a hat.', 'I demand a tiny crown. Just saying. hehe', 'Make me look fabulous, no pressure.', 'Obviously I will wear all of them. hehe'],
  gallery0: ['No ideas yet. Feed me a picture?', 'Paste a picture, I will wait.', 'My wardrobe is empty. Rude.', 'Naked pig, no ideas. Help! hehe'],
  notes: ['Jot it down, sort it later.', 'Loose thoughts are welcome here.', 'No categories, no pressure. 🌸', 'Ooh, what are you thinking about?', 'Write it down before it escapes!', 'Brain dump time. I will not judge. Much.', 'Half-baked ideas are my favourite.'],
  notes0: ['A blank page. Write me something!', 'Nothing yet. Even tiny thoughts count.', 'So empty. Say something clever.'],
  many: ['Oink! So many ASAPs. Which ones are really ASAP?', 'Deep breath. Which one matters most?', 'Not everything is ASAP, friend.', 'Everything is urgent? Sure it is. 🙄 hehe', 'That is not a list, that is a cry for help. hehe', 'Bold of you to call all of these ASAP. hehe', 'I am sweating. Please demote some. hehe'],
  clear: ['All clear. Snout up, nap time.', 'Nothing to do. You earned it. 💤', 'Zzz... good job... zzz...', 'Empty list. Who even are you? hehe', 'Do not wake me. I am dreaming of snacks.', 'Done already? Show-off. hehe'],
  one: ['Just one thing. You can do it!', 'One little task. Easy peasy.', 'Only one left. Almost there!', 'One task. I have seen you do worse.', 'Just one. Do it, or I will stare. hehe', 'One! Even I could do that. (I will not.)'],
  some: ['Oink! {n} things. One at a time.', 'You are doing great, truly. 💗', 'Small steps still get you there.', 'I believe in you! {n} to go.', 'Tiny wins add up. Go go go!', 'Take a sip of water, then the next one.', 'You make it look easy.', '{n} things. I will supervise from here.', 'Procrastinating? I can tell. 👀', 'Stop reading me and do a task!', 'I am cheering extremely quietly. Do not test me.', 'Ooh, {n} tasks. Ambitious. I like it.', 'Pick the easy one first. I will not tell.', 'You are one task away from feeling smug.', 'Less staring at the pig, more doing.'],
};
let sayKey = '', sayText = '', sayN = 0;
let sayHold = { text: '', until: 0 };
function heroSay(gp, open, now, poke) {
  if (Date.now() < sayHold.until && !poke) return sayHold.text;
  const key = L.holidayOf() === 'birthday' ? 'birthday' : L.isNight() ? 'night' : gp === 'notes' ? (open ? 'notes' : 'notes0') : gp ? (open ? 'gallery' : 'gallery0') : now > L.NOW_CAP ? 'many' : !open ? 'clear' : open === 1 ? 'one' : 'some';
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
  const night = L.isNight(); // from 10 pm to 6 am he sleeps in his nightcap, whatever the list looks like
  const mood = night ? 'sleep' : gp ? (gp === 'notes' && !open ? 'sleep' : 'happy') : now > L.NOW_CAP ? 'worry' : open ? 'happy' : 'sleep';
  const hr = new Date().getHours();
  const morning = !night && hr >= 6 && hr < 11; // a little sun and a stretch until eleven
  const look = currentLook();
  const cap = night && !looks.preview; // a look being previewed shows even at night
  const key = mood + (cap ? '-night' : '') + (morning ? '-morning' : '') + '-' + look;
  const done = L.doneToday(state.items, Date.now(), 'all');
  const stage = Math.min(3, Math.floor(done / 3)); // the plant grows on the 3rd, 6th and 9th task of the day
  if (key !== heroMood) {
    $('#heroPig').innerHTML = pigSvg(mood, '', { note: true, stage, cap, morning, look });
    heroMood = key;
    heroStage = stage;
  } else if (stage !== heroStage) {
    const svg = $('#heroPig svg'); // swap only the plant so a running action isn't cut
    const slot = svg.querySelector('.sprout-slot');
    if (slot) slot.innerHTML = sproutSvg(stage);
    if (slot && stage > heroStage) { svg.classList.add('grew'); setTimeout(() => svg.classList.remove('grew'), 900); }
    heroStage = stage;
  }
  $('#heroSay').textContent = heroSay(gp, open, now, poke);
}

// A friendly empty list: the pig, a headline, a hint.
function emptyHtml(mood, title, hint) {
  return `<div class="empty">${pigSvg(mood, 'big')}<b>${esc(title)}</b>${esc(hint)}</div>`;
}

// Things he says about what you just did. Never spammy: each event has a chance (`p`), and there is a cooldown
// between any two. A line is a string or { t: text, act: action }. The poke lines are his catchphrases.
const REACT = {
  done: ['Bigg could not have done that. Not even with snacks. 🐷 hehe', 'Ding! Look at you.', 'One down. Smug mode: on.', { t: 'Varken nummer één!', act: 'dance' }, 'Hrrrrng.. productive.', 'Acceptable. 👌', 'Do it again, I dare you. hehe', 'Crossed off! Delicious.'],
  add: ['Another one?! You are insatiable.', 'Noted. Ominously.', 'Added. Future-you says thanks. Or ugh.', 'Bold of you to assume I will remember that. hehe', 'Ooh, a new one. Excuse me, where will it sit?'],
  delete: ['Excuse me! That was important. Maybe. hehe', 'Gone. Poof. No regrets.', 'Hrrrrng.. fine, bye.', 'Deleted! Undo is right there, coward. hehe'],
  open: ['Nosy. hehe', 'Peeking at the details, are we?', 'Excuse me, I was reading that.', 'Look all you want.'],
  view: ['Bigg got lost on a page like this once. Cute.', 'New page, who dis?', 'Change of scenery! Same pig.', 'Hrrrrng.. wake me when we get there.', 'Wandering around, hm?'],
  sync: ['Synced. I feel so safe. 💗', 'Cloud nap complete.', 'Backed up! Dramatic.'],
  syncfail: ['Sync is being a drama queen.', 'The internet ate it. Rude.', 'Hrrrrng.. offline again?'],
  settings: ['Poking the settings. Brave.', 'Do not touch anything important.', 'Excuse me, private area!'],
  image: ['Ooh, a picture!', 'Is that for me? It is for me.', 'Excuse me, who is that handsome one?'],
  note: ['Thoughts! Delicious.', 'Hrrrrng.. interesting.', 'Jot it, do not lose it.'],
  promote: ['Promotion! Look at that note go.', 'From thought to task. Terrifying.', { t: 'Varken nummer één! (that idea, I mean)', act: 'dance' }],
  reorder: ['Excuse me! Careful with the merchandise.', 'Rearranging the furniture again?', 'Priorities! Spicy.'],
  draw: ['Artist at work! 🎨', 'Is that a masterpiece? It is a masterpiece.'],
  help: ['Need a hint? Me too, honestly.', 'Cheat sheet! Smart.'],
  clean: ['Spring cleaning! Hrrrrng.. exhausting.', 'Bye-bye, mystery pictures.'],
  search: ['Looking for something? Check the snacks.', 'Hrrrrng.. seek and ye shall find.'],
  pick: ['Start with this one. Trust me.', 'Easy one first. I will not tell.', 'This one looks scared of you. Go!', 'Eeny, meeny, miny... this!'],
  bigg: ['Bigg could never finish this many. He gets distracted by snacks. hehe', 'Little Bigg looks up to me. Obviously.', 'I taught Bigg everything he knows. Which is nothing. hehe', 'Bigg says hi! (He did not. I am lying. He is asleep.) hehe', 'Hrrrrng.. Bigg is snoring in the next room again. Rude. Cute.'],
  copy: ['Copied! Go bother Claude.', 'Off to Claude it goes.', 'Excuse me, I wrote that. Credit please.'],
  poke: [
    { t: 'Excuse me!', act: 'hop' }, { t: 'Hrrrrng..', act: 'wiggle' }, { t: 'Varken nummer één!', act: 'dance' }, 'Hey! Personal space!', 'Boop received. Boop returned.',
    'Are you going to feed me or just poke me?', 'I am working here! (I am not.) hehe', { t: 'Hrrrrng.. five more minutes.', act: 'sprout' }, 'Do I look like a button? Do not answer that. hehe',
    { t: 'Excuse me, I have a schedule!', act: 'note' }, 'Tickles!', { t: 'Varken nummer één, reporting for duty!', act: 'dance' },
    'Bigg would have poked me back. Slowly. He is slow. 🐷', 'Bigg asked me for advice once. I charged him one snack. hehe', 'Bigg still thinks he can out-nap me. Adorable. hehe',
    { t: 'Excuse me, I am the BIGGER pig. Bigg is the smaller one. Confusing, I know.', act: 'wiggle' },
  ],
};
let lastReact = 0, lastReactLine = '';
// Puts `text` in his bubble for a while, then lets the usual line come back.
function holdSay(text, ms) {
  sayHold = { text, until: Date.now() + ms };
  $('#heroSay').textContent = text;
  setTimeout(() => { if (Date.now() >= sayHold.until) renderHead(); }, ms + 100);
}
function pigSay(key, opts) {
  const o = opts || {};
  const now = Date.now();
  if (now < sayHold.until && !o.force) return; // a celebration is on show
  if (!o.force && (now - lastReact < 9000 || Math.random() > (o.p == null ? 0.3 : o.p))) return;
  const list = REACT[key];
  if (!list || !$('#heroSay')) return;
  let line = list[Math.floor(Math.random() * list.length)];
  if ((line.t || line) === lastReactLine && list.length > 1) line = list[(list.indexOf(line) + 1) % list.length];
  const text = line.t || line;
  lastReact = now;
  lastReactLine = text;
  holdSay(text, 4500);
  if (line.act || o.force) pigAct(line.act || ACTS[Math.floor(Math.random() * ACTS.length)]);
}

// The first time you open the board each day he says hello.
const GREET = {
  morning: ['Good morning! Coffee first, tasks second.', 'Morning! I have been here all night. Waiting. Judging.', 'Goedemorgen! Varken nummer één is ready.', 'Good morning! Shall we do one tiny thing?'],
  afternoon: ['Good afternoon! The list missed you.', 'Oh, you remembered I exist. Good afternoon!', 'Afternoon! Snack, then tasks. In that order.'],
  evening: ['Good evening! Last push, then snacks.', 'Evening! Still working? Respect. Or concern.', 'Goedenavond! Let us be quick about it.'],
  night: ['Hrrrrng.. it is the middle of the night. Why are you up?', 'Shh. Pigs sleep now. You too, ideally.', 'Excuse me! Bedtime was hours ago.'],
};
function greetOnce() {
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem('varken-greeted') === today) return;
    localStorage.setItem('varken-greeted', today);
  } catch { return; }
  const h = new Date().getHours();
  const pool = L.isNight() ? GREET.night : h < 12 ? GREET.morning : h < 18 ? GREET.afternoon : GREET.evening;
  if (L.holidayOf() !== 'birthday') setTimeout(() => {
    holdSay(pool[Math.floor(Math.random() * pool.length)], 6500);
    pigAct(L.isNight() ? 'sprout' : 'hop');
  }, 1200);
  if (L.holidayOf() === 'birthday') {
    setTimeout(() => { celebrate(null, false, 10); holdSay('Happy birthday, Lauren!! 🎂🎉 Varken nummer één!', 12000); }, 1400);
    return;
  }
  if (new Date().getDay() === 0) setTimeout(weekWrap, 8200); // Sundays: how the week went
}
function weekWrap() {
  const w = L.weekSummary(state.items, Date.now());
  const pr = w.top && state.projects.find((x) => x.id === w.top);
  const text = w.done === 0 ? 'A quiet week. Rest counts too. 🐷'
    : w.done < 5 ? `${w.done} done this week${pr ? ', mostly ' + pr.name : ''}. Slow and steady!`
    : `${w.done} things done this week!${pr ? ' ' + pr.name + ' got the most love (' + w.topCount + ').' : ''} Varken nummer één!`;
  holdSay(text, 11000);
  pigAct(w.done >= 5 ? 'dance' : 'hop');
}

// Actions: hop, show off the note, wiggle, sway the plant, dance and cheer. The class stays on the svg until it ends.
const ACTS = ['hop', 'note', 'wiggle', 'sprout', 'dance'];
let actTimer;
function pigAct(name) {
  const svg = $('#heroPig svg');
  if (!svg) return;
  ACTS.concat('cheer').forEach((a) => svg.classList.remove('act-' + a));
  void svg.getBoundingClientRect(); // restart the animation if the same action repeats
  svg.classList.add('act-' + name);
  clearTimeout(actTimer);
  actTimer = setTimeout(() => svg.classList.remove('act-' + name), name === 'wiggle' ? 2100 : name === 'dance' ? 2700 : 1800);
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
const PARTY_SAYS = ['Varken nummer één! {n} done today!', 'HIGH FIVE! I have no hands, so imagine it.', '{n} today?! Who gave you permission to be this good.', '{n} down! You are on fire. 🔥', 'That is {n}! Someone call the newspaper.'];
function pigCheer(allClear, party) {
  if (party) {
    pigAct('dance');
    floatHearts(14);
    holdSay(PARTY_SAYS[Math.floor(Math.random() * PARTY_SAYS.length)].replace('{n}', party), 7000);
    return;
  }
  pigAct('cheer');
  if (!allClear) setTimeout(() => pigSay('done', { p: 0.3 }), 900); // after the cheer
  floatHearts(allClear ? 8 : 4);
  if (allClear) {
    sayHold = { text: CLEAR_SAYS[Math.floor(Math.random() * CLEAR_SAYS.length)], until: Date.now() + 6000 };
    $('#heroSay').textContent = sayHold.text;
    setTimeout(() => renderHead(), 6100);
  }
}
// Poking the pig makes him do something and say something new.
$('#heroPig').addEventListener('click', () => {
  oink();
  if (Math.random() < 0.65) pigSay('poke', { force: true });
  else { pigAct(ACTS[Math.floor(Math.random() * ACTS.length)]); renderHead(true); }
});
// Now and then he does something on his own.
setInterval(renderHead, 300000); // nightcap on at 10 pm, off at 6 am
setInterval(() => {
  if (document.hidden || L.isNight() || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  if (Math.random() < 0.2) pigSay('bigg', { p: 1 }); // now and then he brings up his little brother
  else pigAct(ACTS[Math.floor(Math.random() * ACTS.length)]);
}, 35000);

// The little pig by the name in the sidebar.
$('#logoPig').innerHTML = pigSvg('happy', 'logo');
