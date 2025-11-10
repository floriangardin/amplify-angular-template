import { Injectable } from '@angular/core';
import { getUrl } from 'aws-amplify/storage';

type CacheKey = string; // assetId plus optional transform signature

interface CacheEntry {
  // The resolved, stable URL string for the current TTL window
  urlPromise: Promise<string>;
  // Expiration timestamp (ms since epoch). When past, entry is considered stale
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  // Default time-to-live for cached signed URLs (in ms)
  private readonly defaultTtlMs = 10 * 60 * 1000; // 10 minutes

  private cache = new Map<CacheKey, CacheEntry>();
  // Track ongoing image-byte prefetches per resolved URL to avoid duplicates
  private inFlightImageLoads = new Map<string, Promise<void>>();

  /**
   * Return a cached URL string for an assetId. If no fresh cache exists, a new
   * signed URL is fetched and cached for the given TTL.
   *
   * Note: We cache the signed URL string (not the Blob), which ensures all
   * components reuse the exact same URL so the browser can apply HTTP caching
   * and avoid redundant reloads. When you know the underlying object changed
   * (e.g., after upload), call `invalidate(assetId)`.
   */
  getUrl(assetId: string, ttlMs: number = this.defaultTtlMs): Promise<string> {
    const key = this.toKey(assetId);
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > now) {
      return existing.urlPromise;
    }

    // Create a single in-flight promise to dedupe concurrent callers
    const urlPromise = (async () => {
      const result = await getUrl({ path: assetId });
      // result.url is a URL object; we expose a plain string for src bindings
      return result.url.href;
    })();

    this.cache.set(key, { urlPromise, expiresAt: now + ttlMs });
    return urlPromise;
  }

  /** Invalidate cached entry for an asset so next call refetches a new URL. */
  invalidate(assetId: string): void {
    const key = this.toKey(assetId);
    this.cache.delete(key);
  }

  /** Clear all cached items. */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Warm the browser cache by starting an image download in the background.
   * Returns the resolved URL string immediately after it's known; the returned
   * promise resolves with that URL and does not wait for the bytes to finish
   * loading (we dedupe the network load internally).
   */
  async prefetch(assetId: string, ttlMs: number = this.defaultTtlMs): Promise<string> {
    const url = await this.getUrl(assetId, ttlMs);
    // Only attempt to prefetch in a browser-like environment
    const canPrefetch = typeof window !== 'undefined' && typeof Image !== 'undefined';
    if (!canPrefetch) return url;

    if (!this.inFlightImageLoads.has(url)) {
      const p = new Promise<void>((resolve) => {
        // Use Image element so the response ends up in the image cache
        const img = new Image();
        const done = () => {
          // Allow GC; keep the URL load deduped while in flight
          resolve();
        };
        img.onload = done;
        img.onerror = done; // even on error, don't block caller
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      }).finally(() => {
        // Remove entry after completion so it can be prefetched again later if needed
        this.inFlightImageLoads.delete(url);
      });
      this.inFlightImageLoads.set(url, p);
    }

    // Fire-and-forget; caller gets the URL immediately
    void this.inFlightImageLoads.get(url);
    return url;
  }

  /** Await that a list of assetIds are loaded (decoded) in the browser cache. */
  async awaitReady(assetIds: string[], opts?: { timeoutMs?: number; limit?: number }): Promise<void> {
    const timeoutMs = opts?.timeoutMs ?? 8000;
    const limit = opts?.limit ?? assetIds.length;
    const unique = Array.from(new Set(assetIds)).slice(0, limit).filter(Boolean);
    const tasks = unique.map(async (id) => {
      const url = await this.prefetch(id);
      await this.waitForImage(url, timeoutMs);
    });
    await Promise.allSettled(tasks);
  }

  private waitForImage(url: string, timeoutMs: number): Promise<void> {
    const canUseDom = typeof window !== 'undefined' && typeof Image !== 'undefined';
    if (!canUseDom) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const img = new Image();
      const onDone = () => resolve();
      img.onload = onDone;
      img.onerror = onDone; // don't block on errors
      // Use decode() when available for more accurate readiness
      img.src = url;
      if (typeof (img as any).decode === 'function') {
        (img as any).decode().then(onDone).catch(onDone);
      }
      // Fallback timeout
      setTimeout(onDone, timeoutMs);
    });
  }

  private toKey(assetId: string): CacheKey {
    // Reserved for future transform-specific keys if needed
    return assetId;
  }
}
