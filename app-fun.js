// Little rewards: a soft chime and pastel confetti when something is checked off. Both can be switched off
// in Options (kept in localStorage `varken-fun`); confetti is skipped when the computer asks for less motion.
const fun = { on: true };
try { fun.on = localStorage.getItem('varken-fun') !== 'off'; } catch { /* default on */ }

let audioCtx;
const NOTES = [784, 880, 988, 1175, 1319, 1568]; // a happy pentatonic run, in Hz
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const start = Math.floor(Math.random() * 3);
    [0, 1, 2].forEach((step, i) => {
      const t = audioCtx.currentTime + i * 0.085;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = NOTES[start + step];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch { /* no audio available */ }
}

const CONFETTI = ['#ff9ec7', '#b9a4ff', '#8ff0c8', '#ffe29a', '#ffb38a', '#8fd3ff'];
function confetti(x, y) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth;
  c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const bits = Array.from({ length: 44 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 3 + Math.random() * 6;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, col: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], heart: Math.random() < 0.18 };
  });
  const born = performance.now();
  (function frame(now) {
    const age = now - born;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = Math.max(0, 1 - age / 1400);
    for (const b of bits) {
      b.vy += 0.28;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = b.col;
      if (b.heart) { ctx.font = '14px sans-serif'; ctx.fillText('♥', -6, 5); } else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (age < 1400) requestAnimationFrame(frame);
    else c.remove();
  })(born);
}

// Called when something gets checked off; `el` is the card, so the confetti pops out of its tick.
function celebrate(el, allClear) {
  pigCheer(allClear); // the pig cheers even with sound off
  if (!fun.on) return;
  chime();
  const box = el && (el.querySelector('.check') || el).getBoundingClientRect();
  if (box) confetti(box.left + box.width / 2, box.top + box.height / 2);
}

const funBox = $('#funOn');
funBox.checked = fun.on;
funBox.onchange = () => {
  fun.on = funBox.checked;
  try { localStorage.setItem('varken-fun', fun.on ? 'on' : 'off'); } catch { /* ignore */ }
  if (fun.on) chime();
};
