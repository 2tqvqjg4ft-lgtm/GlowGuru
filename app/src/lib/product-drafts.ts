/** Keep uploaded draft images out of localStorage's small quota on iPhone. */
const DB = "glow-product-draft-photos";
const STORE = "photos";

function openPhotos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function photoOperation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openPhotos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export const readDraftPhoto = (key: string) => photoOperation<string | undefined>("readonly", (store) => store.get(key));
export const saveDraftPhoto = (key: string, image: string) => photoOperation<IDBValidKey>("readwrite", (store) => store.put(image, key));
export const removeDraftPhoto = (key: string) => photoOperation<undefined>("readwrite", (store) => store.delete(key));