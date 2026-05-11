const cache = new Map();

export function getCache(key) {
    const item = cache.get(key);

    if (!item) return null;

    const expired = Date.now() - item.timestamp > 30000;

    if (expired) {
        cache.delete(key);
        return null;
    }

    return item.value;
}

export function setCache(key, value) {
    cache.set(key, {
        value,
        timestamp: Date.now()
    });
}