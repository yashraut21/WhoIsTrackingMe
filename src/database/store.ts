import type { CookieArtifact, NetworkObservation } from '../types';

const DB_NAME = 'am_i_being_tracked_db';
const DB_VERSION = 1;

/** Maximum number of network observations to retain before oldest are pruned. */
const MAX_OBSERVATIONS = 50_000;
/** Age in days after which observations are deleted. */
const OBS_MAX_AGE_DAYS = 30;
/** Age in days past expiry after which stale cookie records are deleted. */
const COOKIE_EXPIRED_GRACE_DAYS = 30;

export class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains('cookies')) {
            const cookieStore = db.createObjectStore('cookies', { keyPath: 'id' });
            cookieStore.createIndex('registrableDomain', 'registrableDomain', { unique: false });
            cookieStore.createIndex('isThirdParty', 'isThirdParty', { unique: false });
            cookieStore.createIndex('session', 'session', { unique: false });
            cookieStore.createIndex('observedAt', 'observedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains('observations')) {
            const obsStore = db.createObjectStore('observations', { keyPath: 'id' });
            obsStore.createIndex('firstPartySite', 'firstPartySite', { unique: false });
            obsStore.createIndex('requestedDomain', 'requestedDomain', { unique: false });
            obsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  async putCookie(cookie: CookieArtifact): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cookies', 'readwrite');
      tx.objectStore('cookies').put(cookie);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async putCookies(cookies: CookieArtifact[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cookies', 'readwrite');
      const store = tx.objectStore('cookies');
      for (const cookie of cookies) {
        store.put(cookie);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllCookies(): Promise<CookieArtifact[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cookies', 'readonly');
      const req = tx.objectStore('cookies').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getCookiesByRegistrableDomain(domain: string): Promise<CookieArtifact[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cookies', 'readonly');
      const index = tx.objectStore('cookies').index('registrableDomain');
      const req = index.getAll(domain);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async putObservation(obs: NetworkObservation): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readwrite');
      tx.objectStore('observations').put(obs);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllObservations(): Promise<NetworkObservation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readonly');
      const req = tx.objectStore('observations').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Prunes observations older than OBS_MAX_AGE_DAYS and enforces MAX_OBSERVATIONS cap.
   * Deletes oldest records first. Call after batch observation writes.
   * Non-fatal: errors are swallowed to prevent disrupting normal operation.
   */
  async pruneObservations(): Promise<void> {
    try {
      const db = await this.getDB();
      const cutoff = Date.now() - OBS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

      // Step 1: Delete records older than OBS_MAX_AGE_DAYS
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('observations', 'readwrite');
        const index = tx.objectStore('observations').index('timestamp');
        const rangeReq = index.openCursor(IDBKeyRange.upperBound(cutoff));
        rangeReq.onsuccess = () => {
          const cursor = rangeReq.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Step 2: Enforce MAX_OBSERVATIONS cap (oldest-first deletion)
      await new Promise<void>((resolve) => {
        const tx = db.transaction('observations', 'readwrite');
        const store = tx.objectStore('observations');
        const countReq = store.count();
        countReq.onsuccess = () => {
          const excess = countReq.result - MAX_OBSERVATIONS;
          if (excess <= 0) { tx.oncomplete = () => resolve(); return; }
          let deleted = 0;
          const cursorReq = store.index('timestamp').openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && deleted < excess) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve(); // Non-fatal
        };
        countReq.onerror = () => { tx.abort(); resolve(); };
      });
    } catch {
      // Pruning is best-effort; never throw from here
    }
  }

  /**
   * Removes cookie records that expired more than COOKIE_EXPIRED_GRACE_DAYS ago.
   * Session cookies (no expiresAt) are retained until user explicitly clears data.
   */
  async pruneExpiredCookies(): Promise<void> {
    try {
      const db = await this.getDB();
      const cutoff = Date.now() - COOKIE_EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('cookies', 'readwrite');
        const req = tx.objectStore('cookies').openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const record = cursor.value as CookieArtifact;
            if (record.expiresAt && record.expiresAt < cutoff) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Non-fatal
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cookies', 'observations'], 'readwrite');
      tx.objectStore('cookies').clear();
      tx.objectStore('observations').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbStore = new StorageService();
