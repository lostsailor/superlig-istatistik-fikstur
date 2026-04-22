const NodeCache = require('node-cache');

const MAX_CACHE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 0, // No default expiration
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false
    });
    this.currentSize = 0;
    this.keyTimestamps = new Map(); // Track insertion order for FIFO
  }

  /**
   * Estimate size of data in bytes
   */
  estimateSize(data) {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get value from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set value in cache with FIFO eviction
   */
  set(key, value) {
    const size = this.estimateSize(value);
    
    // Evict old entries if needed
    while (this.currentSize + size > MAX_CACHE_SIZE_BYTES && this.keyTimestamps.size > 0) {
      const oldestKey = this.keyTimestamps.keys().next().value;
      if (oldestKey) {
        const oldValue = this.cache.get(oldestKey);
        if (oldValue) {
          this.currentSize -= this.estimateSize(oldValue);
        }
        this.cache.del(oldestKey);
        this.keyTimestamps.delete(oldestKey);
      }
    }

    // Set new value
    this.cache.set(key, value);
    this.keyTimestamps.set(key, Date.now());
    this.currentSize += size;

    return true;
  }

  /**
   * Delete specific key
   */
  del(key) {
    const value = this.cache.get(key);
    if (value) {
      this.currentSize -= this.estimateSize(value);
      this.keyTimestamps.delete(key);
    }
    this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  flushAll() {
    this.cache.flushAll();
    this.currentSize = 0;
    this.keyTimestamps.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.currentSize,
      sizeMB: (this.currentSize / (1024 * 1024)).toFixed(2),
      maxSizeMB: (MAX_CACHE_SIZE_BYTES / (1024 * 1024)).toFixed(2),
      keys: this.cache.keys().length
    };
  }
}

module.exports = new CacheManager();
