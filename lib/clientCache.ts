export function getCached<T>(key: string): { data: T; time: number } | null {
  try {
    if (typeof window === 'undefined') return null;
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed && parsed.data !== undefined && typeof parsed.time === 'number') {
      return parsed as { data: T; time: number };
    }
    return null;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined') return;
    const item = {
      data,
      time: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(item));
  } catch {
    return;
  }
}