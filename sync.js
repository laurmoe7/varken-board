// Sync: optional two-way sync with a private GitHub repo through the contents API.
// Writes data.json (the state), BOARD.md (readable backlog for Claude) and images/<id>.jpg.
// The token is a fine-grained one for that repo only, kept in this browser's localStorage.
const Sync = (() => {
  const KEY = 'varken-sync';
  const UPLOADED = 'varken-uploaded';
  const L = BoardLogic;

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } };
  const config = () => read(KEY, null);
  const setConfig = (c) => (c ? localStorage.setItem(KEY, JSON.stringify(c)) : localStorage.removeItem(KEY));
  const uploaded = () => new Set(read(UPLOADED, []));
  const markUploaded = (set) => localStorage.setItem(UPLOADED, JSON.stringify(Array.from(set)));

  const toB64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const blobToB64 = (blob) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });

  async function call(cfg, path, opt) {
    const o = opt || {};
    const res = await fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + path + (o.query || ''), {
      method: o.method || 'GET',
      headers: Object.assign(
        { Authorization: 'Bearer ' + cfg.token, Accept: o.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' },
        o.body ? { 'Content-Type': 'application/json' } : {}
      ),
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    if (res.status === 404 && o.method !== 'PUT') return null;
    if (!res.ok) {
      const err = new Error(res.status === 401 || res.status === 403 ? 'GitHub refused the token (check it can read and write this repo).' : 'GitHub said ' + res.status + '.');
      err.status = res.status;
      throw err;
    }
    return o.raw ? res.blob() : res.json();
  }

  async function getText(cfg, path) {
    const f = await call(cfg, path);
    return f ? { text: fromB64(f.content), sha: f.sha } : null;
  }

  async function put(cfg, path, content, message, sha) {
    const body = { message, content };
    const known = sha === undefined ? ((await call(cfg, path)) || {}).sha : sha;
    if (known) body.sha = known;
    return call(cfg, path, { method: 'PUT', body });
  }

  // One round: pull, merge, fetch missing images, upload new ones, push if anything changed.
  // `hooks.hasImage(id)`, `hooks.getImage(id)`, `hooks.putImage(id, blob)` talk to the local store.
  async function run(state, hooks) {
    const cfg = config();
    if (!cfg) throw new Error('Sync is not set up.');
    const remote = await getText(cfg, 'data.json');
    let remoteState = null;
    try { remoteState = remote ? L.validateState(JSON.parse(remote.text)) : null; } catch { throw new Error('data.json in the data repo is not valid JSON.'); }
    const merged = L.mergeStates(state, remoteState);
    const sent = uploaded();

    const wanted = new Set();
    merged.items.forEach((i) => !i.deleted && i.images.forEach((id) => wanted.add(id)));
    for (const id of wanted) {
      if (await hooks.hasImage(id)) {
        if (!sent.has(id)) {
          await put(cfg, 'images/' + id + '.jpg', await blobToB64(await hooks.getImage(id)), 'Add image ' + id);
          sent.add(id);
        }
      } else {
        const blob = await call(cfg, 'images/' + id + '.jpg', { raw: true });
        if (blob) { await hooks.putImage(id, blob); sent.add(id); }
      }
    }
    markUploaded(sent);

    const text = JSON.stringify(merged, null, 2) + '\n';
    if (!remote || remote.text !== text) {
      await put(cfg, 'data.json', toB64(text), 'Update board', remote ? remote.sha : null);
      await put(cfg, 'BOARD.md', toB64(L.boardMarkdown(merged) + '\n'), 'Update readable board');
    }
    return merged;
  }

  return { config, setConfig, run };
})();
