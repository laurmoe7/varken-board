// Clean-up of unused pictures (Options > Sync and backup). A picture is unused when no live item points to it.
// Nothing is deleted by looking; "Delete them" removes the files here and in the data repo, and cannot be undone.
let unusedFound = null; // { ids, remote: Map(id -> sha) }

const mb = (bytes) => (bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB');
// Pictures that must stay whatever the board says: the ones in a half-written new item or being drawn on.
const keepImages = () => ui.draftItem.images.concat(ann.id ? [ann.id] : []);

function cleanMsg(text, err) {
  const m = $('#cleanMsg');
  m.textContent = text;
  m.classList.toggle('err', !!err);
}

async function scanUnused() {
  $('#cleanGo').hidden = true;
  unusedFound = null;
  cleanMsg('Looking…');
  try {
    if (Sync.config() && !(await doSync())) {
      cleanMsg("Sync first: GitHub couldn't be reached, so I can't be sure which pictures other devices still use.", true);
      return;
    }
    const local = await Store.allImageIds();
    const remote = Sync.config() ? await Sync.listImages() : [];
    const ids = L.findUnusedImages(state, local.concat(remote.map((r) => r.id)), keepImages());
    if (!ids.length) { cleanMsg('Nothing to clean up. 🐷'); return; }
    const remoteMap = new Map(remote.map((r) => [r.id, r]));
    let bytes = 0;
    for (const id of ids) bytes += remoteMap.has(id) ? remoteMap.get(id).size : ((await Store.getImage(id)) || { size: 0 }).size;
    unusedFound = { ids, remote: new Map(remote.map((r) => [r.id, r.sha])) };
    cleanMsg(`${ids.length} unused ${ids.length === 1 ? 'picture' : 'pictures'} found (about ${mb(bytes)}). Nothing is deleted yet.`);
    $('#cleanGo').textContent = `Delete ${ids.length === 1 ? 'it' : 'them'} for good`;
    $('#cleanGo').hidden = false;
  } catch (e) {
    cleanMsg('Could not look: ' + e.message, true);
  }
}

async function deleteUnused() {
  if (!unusedFound) return;
  $('#cleanGo').hidden = true;
  // pictures may have been attached since the scan, so check again
  const ids = L.findUnusedImages(state, unusedFound.ids, keepImages());
  const gone = [];
  let failed = 0;
  cleanMsg('Deleting…');
  for (const id of ids) {
    try {
      if (unusedFound.remote.has(id)) await Sync.deleteImage(id, unusedFound.remote.get(id));
      await Store.delImage(id);
      delete state.images[id];
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      gone.push(id);
    } catch {
      failed++;
    }
  }
  if (Sync.config()) Sync.forget(gone);
  unusedFound = null;
  save();
  refreshUnusedHint();
  cleanMsg(`Deleted ${gone.length} ${gone.length === 1 ? 'picture' : 'pictures'}.` + (failed ? ` ${failed} could not be deleted; try again later.` : ''), failed > 0);
}

$('#cleanScan').onclick = scanUnused;
$('#cleanGo').onclick = deleteUnused;

// A quiet hint in the sidebar when this browser holds pictures nothing uses. Local only and cheap; the real
// check (which also looks in the data repo) is the button in Options.
async function refreshUnusedHint() {
  const el = $('#cleanHint');
  if (!el) return;
  try {
    const ids = L.findUnusedImages(state, await Store.allImageIds(), keepImages());
    el.hidden = !ids.length;
    el.textContent = `🧹 ${ids.length} unused ${ids.length === 1 ? 'picture' : 'pictures'}`;
  } catch { el.hidden = true; }
}

// The sync dialog warns when the data repo is public.
async function checkPublic() {
  const w = $('#syncWarn');
  w.hidden = true;
  if (!Sync.config()) return;
  if ((await Sync.isPublic()) === true) w.hidden = false;
}

function refreshHints() {
  refreshUnusedHint();
  if (Sync.config()) checkPublic();
}

$('#cleanHint').onclick = () => { $('#settingsBtn').click(); scanUnused(); };
setInterval(refreshUnusedHint, 120000); // pictures become "unused" once they are 10 minutes old
