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
function confetti(x, y, count, lifeMs) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth;
  c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const life = lifeMs || 2400;
  const bits = Array.from({ length: count || 44 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 3.6;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, col: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], heart: Math.random() < 0.18 };
  });
  const born = performance.now();
  (function frame(now) {
    const age = now - born;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = Math.max(0, Math.min(1, (life - age) / (life * 0.6)));
    for (const b of bits) {
      b.vy += 0.1;
      b.vx *= 0.975;
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
    if (age < life) requestAnimationFrame(frame);
    else c.remove();
  })(born);
}

// A louder, triumphant fanfare for every fifth finished thing of the day: a rising run, a big chord, a cymbal.
function fanfare() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const voice = (freq, t, len, gain) => {
      [['sawtooth', 0], ['square', 6]].forEach(([type, detune]) => {
        const o = audioCtx.createOscillator();
        const lp = audioCtx.createBiquadFilter();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = detune;
        lp.type = 'lowpass';
        lp.frequency.value = 2600;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.setValueAtTime(gain, t + len * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(lp).connect(g).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + len + 0.05);
      });
    };
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => voice(f, t0 + i * 0.1, i === 6 ? 0.9 : 0.18, 0.05));
    [523, 659, 784, 1047].forEach((f) => voice(f, t0 + 0.72, 1.0, 0.045)); // the big final chord
    const len = Math.floor(audioCtx.sampleRate * 0.9); // a cymbal crash: filtered noise
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const n = audioCtx.createBufferSource();
    const hp = audioCtx.createBiquadFilter();
    const ng = audioCtx.createGain();
    n.buffer = buf;
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    ng.gain.value = 0.16;
    n.connect(hp).connect(ng).connect(audioCtx.destination);
    n.start(t0 + 0.72);
  } catch { /* no audio available */ }
}

// A little oink for when you poke the pig: a short rising "oi" and a falling, gruff "nk".
function oink() {
  if (!fun.on) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const bp = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    const wob = audioCtx.createOscillator();
    const wg = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190, t);
    o.frequency.linearRampToValueAtTime(330, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.3);
    wob.frequency.value = 38; // the gruffness
    wg.gain.value = 22;
    wob.connect(wg).connect(o.frequency);
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(bp).connect(g).connect(audioCtx.destination);
    o.start(t); wob.start(t);
    o.stop(t + 0.4); wob.stop(t + 0.4);
  } catch { /* no audio available */ }
}

// Called when something gets checked off; `el` is the card, so the confetti pops out of its tick.
// `party` is the number finished today when it is a multiple of 5, else 0: then everything is bigger.
function celebrate(el, allClear, party) {
  pigCheer(allClear, party); // the pig cheers even with sound off
  if (!fun.on) return;
  const box = el && (el.querySelector('.check') || el).getBoundingClientRect();
  if (party) {
    fanfare();
    confetti(innerWidth * 0.2, innerHeight * 0.85, 80, 4200);
    setTimeout(() => confetti(innerWidth * 0.8, innerHeight * 0.85, 80, 4200), 180);
    setTimeout(() => confetti(innerWidth * 0.5, innerHeight * 0.55, 90, 4400), 360);
    return;
  }
  chime();
  if (box) confetti(box.left + box.width / 2, box.top + box.height / 2);
}

const funBox = $('#funOn');
funBox.checked = fun.on;
funBox.onchange = () => {
  fun.on = funBox.checked;
  try { localStorage.setItem('varken-fun', fun.on ? 'on' : 'off'); } catch { /* ignore */ }
  if (fun.on) chime();
};
