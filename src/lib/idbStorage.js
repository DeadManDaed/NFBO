// src/lib/idbStorage.js
const DB_NAME  = 'nfbo_db';
const DB_STORE = 'auth';
const DB_VER   = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export const idbStorage = {
  async getItem(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  },
  async setItem(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(DB_STORE, 'readwrite');
      const req = tx.objectStore(DB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
  async removeItem(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(DB_STORE, 'readwrite');
      const req = tx.objectStore(DB_STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
};