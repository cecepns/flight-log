import { useEffect, useState } from "react";
import { getOfflineQueue } from "../utils/offlineFlightQueue";

export function useOfflineQueueLength() {
  const [length, setLength] = useState(() => getOfflineQueue().length);

  useEffect(() => {
    const onChange = () => setLength(getOfflineQueue().length);
    window.addEventListener("offline-queue-changed", onChange);
    return () => window.removeEventListener("offline-queue-changed", onChange);
  }, []);

  return length;
}
