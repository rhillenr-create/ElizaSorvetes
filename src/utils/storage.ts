/**
 * Robust, fault-tolerant storage helper for Eliza Sorvetes POS.
 * Supports localStorage, sessionStorage fallback, and window in-memory cache
 * to prevent data loss in iframes, private browsing, or browser restrictions.
 */

interface StorageCache {
  [key: string]: unknown;
}

// Global window in-memory fallback
declare global {
  interface Window {
    __ELIZA_CACHE__?: StorageCache;
  }
}

if (typeof window !== 'undefined' && !window.__ELIZA_CACHE__) {
  window.__ELIZA_CACHE__ = {};
}

export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;

    // 1. Try localStorage
    try {
      const item = localStorage.getItem(key);
      if (item !== null && item !== undefined && item !== 'undefined') {
        const parsed = JSON.parse(item);
        if (parsed !== null && parsed !== undefined) {
          // Update in-memory cache as well
          if (window.__ELIZA_CACHE__) {
            window.__ELIZA_CACHE__[key] = parsed;
          }
          return parsed as T;
        }
      }
    } catch (e) {
      console.warn(`[safeStorage] localStorage.getItem failed for "${key}":`, e);
    }

    // 2. Try sessionStorage fallback
    try {
      const sessionItem = sessionStorage.getItem(key);
      if (sessionItem !== null && sessionItem !== undefined && sessionItem !== 'undefined') {
        const parsed = JSON.parse(sessionItem);
        if (parsed !== null && parsed !== undefined) {
          if (window.__ELIZA_CACHE__) {
            window.__ELIZA_CACHE__[key] = parsed;
          }
          return parsed as T;
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }

    // 3. Try in-memory fallback
    if (window.__ELIZA_CACHE__ && window.__ELIZA_CACHE__[key] !== undefined) {
      return window.__ELIZA_CACHE__[key] as T;
    }

    return fallback;
  },

  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    // Always keep in-memory cache updated
    if (window.__ELIZA_CACHE__) {
      window.__ELIZA_CACHE__[key] = value;
    }

    let success = false;
    const serialized = JSON.stringify(value);

    // 1. Save to localStorage
    try {
      localStorage.setItem(key, serialized);
      success = true;
    } catch (e) {
      console.warn(`[safeStorage] localStorage.setItem failed for "${key}":`, e);
    }

    // 2. Save to sessionStorage as replica
    try {
      sessionStorage.setItem(key, serialized);
      success = true;
    } catch {
      // Ignore sessionStorage errors
    }

    return success;
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;

    if (window.__ELIZA_CACHE__) {
      delete window.__ELIZA_CACHE__[key];
    }

    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }

    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;

    if (window.__ELIZA_CACHE__) {
      window.__ELIZA_CACHE__ = {};
    }

    const keys = ['eliza_products', 'eliza_stock', 'eliza_sales', 'eliza_cart'];
    keys.forEach((k) => this.remove(k));
  }
};
