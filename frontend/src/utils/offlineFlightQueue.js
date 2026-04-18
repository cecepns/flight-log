const STORAGE_KEY = "flight-log-offline-queue";

export function notifyOfflineQueueChanged() {
  window.dispatchEvent(new Event("offline-queue-changed"));
}

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyOfflineQueueChanged();
}

export function enqueueOfflineFlight({ form, crew, editId, removePhotoIds }) {
  const item = {
    localId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    form,
    crew,
    editId: editId || null,
    removePhotoIds: removePhotoIds || [],
  };
  setOfflineQueue([...getOfflineQueue(), item]);
  return item;
}

export function isNetworkLayerFailure(error) {
  if (!error || error.response) return false;
  if (error.code === "ECONNABORTED") return false;
  return true;
}

let flushPromise = null;

/**
 * POST/PUT queued flights when online. Returns number successfully synced.
 * Concurrent callers share one flush so React Strict Mode cannot duplicate POSTs.
 */
export function flushOfflineFlightQueue(api) {
  if (!navigator.onLine) return Promise.resolve(0);
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    try {
      const pending = getOfflineQueue();
      if (!pending.length) return 0;

      const stillPending = [];
      let synced = 0;

      for (const item of pending) {
        try {
          const payload = new FormData();
          payload.append("flightData", JSON.stringify(item.form));
          payload.append("crews", JSON.stringify(item.crew));
          payload.append("removePhotoIds", JSON.stringify(item.removePhotoIds || []));
          if (item.editId) {
            await api.put(`/flights/${item.editId}`, payload);
          } else {
            await api.post("/flights", payload);
          }
          synced += 1;
        } catch {
          stillPending.push(item);
        }
      }

      setOfflineQueue(stillPending);
      return synced;
    } finally {
      flushPromise = null;
    }
  })();

  return flushPromise;
}
