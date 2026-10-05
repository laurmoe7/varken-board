// Store: the board and its images live in the browser's IndexedDB.
// `meta` holds the whole state under 'state'; `images` holds one Blob per image id.
const Store = (() => {
  let dbp;
  const open = () =>
    dbp ||
    (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('varken-board', 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('meta');
        r.result.createObjectStore('images');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));

  async function run(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }

  return {
    loadState: () => run('meta', 'readonly', (s) => s.get('state')),
    saveState: (st) => run('meta', 'readwrite', (s) => s.put(st, 'state')),
    putImage: (id, blob) => run('images', 'readwrite', (s) => s.put(blob, id)),
    getImage: (id) => run('images', 'readonly', (s) => s.get(id)),
    hasImage: async (id) => (await run('images', 'readonly', (s) => s.count(id))) > 0,
    persist: () => (navigator.storage && navigator.storage.persist ? navigator.storage.persist() : null),
  };
})();
