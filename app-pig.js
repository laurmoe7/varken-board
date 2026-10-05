// The pig: the header character and the pictures in empty lists. It changes mood with the board.

// moods: happy (default), sleep (nothing to do), worry (too many Nows), sniff (nothing matches).
function pigSvg(mood, cls) {
  const m = mood || 'happy';
  const eyes = {
    happy: '<path d="M18.5 31 q4.5 -6 9 0 M36.5 31 q4.5 -6 9 0" fill="none" stroke="#3a1d3a" stroke-width="2.6" stroke-linecap="round"/>',
    sleep: '<path d="M19 30 q4 4 8 0 M37 30 q4 4 8 0" fill="none" stroke="#3a1d3a" stroke-width="2.6" stroke-linecap="round"/>',
    worry: '<circle cx="23" cy="30" r="4.4" fill="#fff"/><circle cx="41" cy="30" r="4.4" fill="#fff"/><circle cx="23.6" cy="31" r="2.2" fill="#3a1d3a"/><circle cx="40.4" cy="31" r="2.2" fill="#3a1d3a"/><path d="M17 23 l9 2 M47 23 l-9 2" stroke="#3a1d3a" stroke-width="2" stroke-linecap="round"/>',
    sniff: '<circle cx="23" cy="30" r="3.2" fill="#3a1d3a"/><circle cx="41" cy="30" r="3.2" fill="#3a1d3a"/><circle cx="21.8" cy="31" r="1" fill="#fff"/><circle cx="39.8" cy="31" r="1" fill="#fff"/>',
  }[m];
  const extra = {
    happy: '<path d="M52 8 l1.6 3.4 3.6.4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4z" fill="#ffe29a"/>',
    sleep: '<text x="47" y="14" font-size="11" font-weight="800" fill="#b9a4ff">z</text><text x="54" y="8" font-size="8" font-weight="800" fill="#b9a4ff">z</text>',
    worry: '<path d="M53 14 q3 4 0 7 q-3 -3 0 -7z" fill="#8fd3ff"/>',
    sniff: '<circle cx="53" cy="12" r="5" fill="none" stroke="#b9a4ff" stroke-width="2"/><path d="M57 16 l4 4" stroke="#b9a4ff" stroke-width="2.4" stroke-linecap="round"/>',
  }[m];
  return `<svg class="pig ${cls || ''} pig-${m}" viewBox="0 0 64 64" aria-hidden="true">
    <g class="ear ear-l"><ellipse cx="13" cy="17" rx="9" ry="11" fill="#ff8fbb" transform="rotate(-28 13 17)"/></g>
    <g class="ear ear-r"><ellipse cx="51" cy="17" rx="9" ry="11" fill="#ff8fbb" transform="rotate(28 51 17)"/></g>
    <circle cx="32" cy="36" r="24" fill="#ffb3d1"/>
    <ellipse cx="19" cy="40" rx="5" ry="3.5" fill="#ff7aa8" opacity=".5"/>
    <ellipse cx="45" cy="40" rx="5" ry="3.5" fill="#ff7aa8" opacity=".5"/>
    <ellipse cx="32" cy="42" rx="10" ry="7.5" fill="#ff8fbb"/>
    <circle cx="28.5" cy="42" r="1.8" fill="#6b2a4a"/><circle cx="35.5" cy="42" r="1.8" fill="#6b2a4a"/>
    <g class="pig-eyes">${eyes}</g>
    ${extra}
  </svg>`;
}

// What the pig says in the header, by what the board looks like.
function heroSay(gp, open, now) {
  if (gp) return open ? 'Pretty things to make! ✨' : 'No ideas yet. Feed me a picture?';
  if (now > L.NOW_CAP) return 'Oink! So many Nows. Pick the real few.';
  if (!open) return 'All clear. Snout up, nap time.';
  if (open === 1) return 'Just one thing. You can do it!';
  return 'Oink! ' + open + ' things. One at a time.';
}

function paintHero(gp, open, now) {
  const mood = gp ? 'happy' : now > L.NOW_CAP ? 'worry' : open ? 'happy' : 'sleep';
  $('#heroPig').innerHTML = pigSvg(mood);
  $('#heroSay').textContent = heroSay(gp, open, now);
}

// A friendly empty list: the pig, a headline, a hint.
function emptyHtml(mood, title, hint) {
  return `<div class="empty">${pigSvg(mood, 'big')}<b>${esc(title)}</b>${esc(hint)}</div>`;
}
