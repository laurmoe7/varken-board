// Annotate: draw on an attached picture (pen, arrow, circle, box) and save it back to the item.
const ANNOT_COLORS = ['#ff5c8a', '#ffe29a', '#8ff0c8', '#8fd3ff', '#ffffff', '#1b1630'];
const ann = { target: null, id: null, img: null, strokes: [], cur: null, tool: 'pen', color: ANNOT_COLORS[0], thick: false };

function drawStroke(ctx, s, lw) {
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const a = s.pts[0];
  const b = s.pts[s.pts.length - 1];
  if (s.tool === 'pen') {
    if (s.pts.length < 2) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, lw / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    s.pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  } else if (s.tool === 'arrow') {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = lw * 5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(ang - 0.45), b.y - head * Math.sin(ang - 0.45));
    ctx.lineTo(b.x - head * Math.cos(ang + 0.45), b.y - head * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  } else if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.tool === 'box') {
    ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  }
}

// Draws the picture and every stroke (the one being drawn too) onto a canvas.
function paintAnnot(ctx) {
  const c = ctx.canvas;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(ann.img, 0, 0);
  const base = Math.max(3, Math.round(Math.max(c.width, c.height) / 220));
  (ann.cur ? ann.strokes.concat(ann.cur) : ann.strokes).forEach((s) => drawStroke(ctx, s, base * (s.thick ? 2 : 1)));
}
const repaintAnnot = () => paintAnnot($('#aCanvas').getContext('2d'));

function annotColors() {
  $('#aColors').innerHTML = ANNOT_COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === ann.color ? 'on' : ''}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('');
}
function annotTool(tool) {
  ann.tool = tool;
  document.querySelectorAll('#aTools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
}

async function openAnnotate(target, id) {
  const blob = await Store.getImage(id);
  if (!blob) { toast('That picture is still downloading'); return; }
  ann.img = await createImageBitmap(blob);
  Object.assign(ann, { target, id, strokes: [], cur: null });
  const c = $('#aCanvas');
  c.width = ann.img.width;
  c.height = ann.img.height;
  ann.thick = false;
  $('#aThick').classList.remove('on');
  annotColors();
  annotTool(ann.tool);
  repaintAnnot();
  $('#annotDlg').showModal();
}

async function saveAnnot(asCopy) {
  const dlg = $('#annotDlg');
  if (!ann.strokes.length) { dlg.close(); return; }
  pigSay('draw', { p: 0.5 });
  const c = document.createElement('canvas');
  c.width = ann.img.width;
  c.height = ann.img.height;
  paintAnnot(c.getContext('2d'));
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const id = L.uid();
  await Store.putImage(id, blob);
  state.images[id] = { name: 'drawn on', added: Date.now() };
  const t = ann.target;
  const at = t.images.indexOf(ann.id);
  if (at < 0) t.images.push(id);
  else if (asCopy) t.images.splice(at + 1, 0, id);
  else t.images[at] = id;
  if (t !== ui.draftItem) touch(t);
  save();
  renderImages();
  renderList();
  dlg.close();
}

(function wireAnnotate() {
  const canvas = $('#aCanvas');
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    ann.cur = { tool: ann.tool, color: ann.color, thick: ann.thick, pts: [p] };
    if (ann.tool !== 'pen') ann.cur.pts.push(p);
    repaintAnnot();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ann.cur) return;
    const p = pos(e);
    if (ann.tool === 'pen') ann.cur.pts.push(p);
    else ann.cur.pts[1] = p;
    repaintAnnot();
  });
  const finish = () => {
    if (!ann.cur) return;
    const [a, b] = [ann.cur.pts[0], ann.cur.pts[ann.cur.pts.length - 1]];
    const tiny = ann.cur.tool !== 'pen' && Math.hypot(b.x - a.x, b.y - a.y) < 4;
    if (!tiny) ann.strokes.push(ann.cur);
    ann.cur = null;
    repaintAnnot();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  $('#aTools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) annotTool(b.dataset.tool); });
  $('#aColors').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) { ann.color = b.dataset.color; annotColors(); } });
  $('#aThick').onclick = () => { ann.thick = !ann.thick; $('#aThick').classList.toggle('on', ann.thick); };
  const undo = () => { ann.strokes.pop(); repaintAnnot(); };
  $('#aUndo').onclick = undo;
  $('#aClear').onclick = () => { ann.strokes = []; repaintAnnot(); };
  $('#aCancel').onclick = () => $('#annotDlg').close();
  $('#aSave').onclick = () => saveAnnot(false);
  $('#aCopy').onclick = () => saveAnnot(true);
  $('#annotDlg').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tool = { p: 'pen', a: 'arrow', c: 'circle', b: 'box' }[e.key.toLowerCase()];
    if (tool) annotTool(tool);
  });
})();
