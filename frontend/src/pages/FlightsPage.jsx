import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, FileDown, Pencil, Search, Trash2 } from "lucide-react";
import api from "../api/client";
import useDebounce from "../hooks/useDebounce";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { exportFlightToPdf } from "../utils/exportFlightPdf";
import {
  dequeueOfflineFlight,
  getOfflineQueue,
  notifyOfflineQueueChanged,
} from "../utils/offlineFlightQueue";

const CACHE_KEY = "flight-log-list-cache";

function saveFlightsCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: new Date().toISOString() }));
  } catch {
    // quota exceeded — silently ignore
  }
}

function loadFlightsCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function FlightsPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState(() => getOfflineQueue());
  const [queueExpanded, setQueueExpanded] = useState(true);

  const debouncedSearch = useDebounce(search, 500);

  // Keep local queue state in sync with localStorage
  useEffect(() => {
    const onChange = () => setOfflineQueue(getOfflineQueue());
    window.addEventListener("offline-queue-changed", onChange);
    return () => window.removeEventListener("offline-queue-changed", onChange);
  }, []);

  const fetchFlights = async () => {
    if (!isOnline) {
      const cached = loadFlightsCache();
      if (cached) {
        setResult(cached);
        setFromCache(true);
      }
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get("/flights", {
        params: { page, limit: 10, search: debouncedSearch },
      });
      setResult(data);
      setFromCache(false);
      saveFlightsCache(data);
    } catch (error) {
      // Network failure — fall back to cache
      const cached = loadFlightsCache();
      if (cached) {
        setResult(cached);
        setFromCache(true);
        toast("Showing cached flight data.", { icon: "📦" });
      } else {
        toast.error(error.response?.data?.message || "Gagal memuat data flights");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, isOnline]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const exportFlightPdf = async (id) => {
    try {
      setExportingId(id);
      const { data } = await api.get(`/flights/${id}`);
      exportFlightToPdf(data);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not export flight PDF");
    } finally {
      setExportingId(null);
    }
  };

  const deleteFlight = async (id) => {
    if (!window.confirm("Hapus flight ini?")) return;
    try {
      await api.delete(`/flights/${id}`);
      toast.success("Flight berhasil dihapus");
      fetchFlights();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus flight");
    }
  };

  const removeQueueItem = (localId) => {
    if (!window.confirm("Remove this pending flight from the offline queue?")) return;
    dequeueOfflineFlight(localId);
    notifyOfflineQueueChanged();
    toast.success("Removed from offline queue.");
  };

  const cards = useMemo(() => result.data || [], [result]);

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Flights</h1>
      </div>

      {/* ── Offline queue panel ───────────────────────────────────────────────── */}
      {offlineQueue.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/8">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setQueueExpanded((v) => !v)}
          >
            <span className="text-sm font-semibold text-amber-200">
              {offlineQueue.length} flight{offlineQueue.length > 1 ? "s" : ""} pending sync
            </span>
            {queueExpanded ? (
              <ChevronUp size={16} className="text-amber-300" />
            ) : (
              <ChevronDown size={16} className="text-amber-300" />
            )}
          </button>

          {queueExpanded && (
            <div className="space-y-2 px-4 pb-4">
              {offlineQueue.map((item) => (
                <div
                  key={item.localId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-bg-main/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {item.form?.flight_number || "—"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          item.editId
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {item.editId ? "Edit" : "New"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-soft">
                      {item.form?.destination || "—"} •{" "}
                      {item.form?.departure_date
                        ? dayjs(item.form.departure_date).format("DD MMM YYYY")
                        : "—"}
                    </p>
                    <p className="text-xs text-text-soft">
                      Queued {dayjs(item.queuedAt).format("DD MMM YYYY HH:mm")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQueueItem(item.localId)}
                    className="btn-danger shrink-0"
                    title="Remove from queue"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <p className="pt-1 text-xs text-text-soft">
                These flights will be published automatically when your device is online.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Search + stats ────────────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by flight number, aircraft type, crew name, destination"
          className="input pl-10"
          disabled={!isOnline && !fromCache}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoCard title="Total Flights" value={result.total || 0} subtitle="All data" />
        <InfoCard
          title="Search"
          value={debouncedSearch ? "Active" : "All"}
          subtitle="API debounce"
        />
        <InfoCard title="Page" value={page} subtitle={`Total page ${result.totalPages || 1}`} />
      </div>

      {/* Cached data notice */}
      {fromCache && (
        <div className="mb-4 rounded-xl border border-slate-600/40 bg-slate-700/20 px-3 py-2 text-xs text-text-soft">
          Showing cached data
          {result.cachedAt
            ? ` from ${dayjs(result.cachedAt).format("DD MMM YYYY HH:mm")}`
            : ""}
          . Connect to the internet to load the latest flights.
        </div>
      )}

      {/* ── Flight list ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading && <p className="text-sm text-text-soft">Loading flights...</p>}

        {!loading && !isOnline && cards.length === 0 && (
          <div className="rounded-xl border border-line-soft bg-bg-card p-8 text-center text-text-soft">
            No cached flights available. Connect to load your flight log.
          </div>
        )}

        {!loading && isOnline && cards.length === 0 && (
          <div className="rounded-xl border border-line-soft bg-bg-card p-8 text-center text-text-soft">
            No flights logged yet.
          </div>
        )}

        {cards.map((flight) => (
          <article
            key={flight.id}
            className="rounded-xl border border-line-soft bg-bg-card p-4 shadow-card"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">{flight.flight_number}</h2>
                <p className="text-sm text-text-soft">
                  {flight.aircraft_type || "-"} • {flight.destination || "-"}
                </p>
              </div>
              <span className="rounded-full bg-brand/20 px-3 py-1 text-xs text-brand">
                {flight.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-text-soft md:grid-cols-4">
              <p>
                Departure:{" "}
                {flight.departure_date
                  ? dayjs(flight.departure_date).format("DD MM YYYY")
                  : "-"}
              </p>
              <p>
                Arrival:{" "}
                {flight.arrival_date ? dayjs(flight.arrival_date).format("DD MM YYYY") : "-"}
              </p>
              <p>Flying: {Number(flight.flying_hours || 0).toFixed(1)} hrs</p>
              <p>Rest: {Number(flight.rest_hours || 0).toFixed(1)} hrs</p>
            </div>

            <p className="mt-2 text-sm text-text-soft">Crew: {flight.crew_names || "-"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportingId === flight.id || !isOnline}
                onClick={() => exportFlightPdf(flight.id)}
                className="btn-ghost"
                title={!isOnline ? "Export requires internet connection" : undefined}
              >
                <FileDown size={16} /> {exportingId === flight.id ? "Exporting…" : "Export PDF"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/add?edit=${flight.id}`)}
                className="btn-ghost"
              >
                <Pencil size={16} /> Edit
              </button>
              <button
                type="button"
                onClick={() => deleteFlight(flight.id)}
                disabled={!isOnline}
                className="btn-danger"
                title={!isOnline ? "Delete requires internet connection" : undefined}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          className="btn-ghost"
          disabled={page <= 1 || !isOnline}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <span className="text-sm text-text-soft">Page {page}</span>
        <button
          className="btn-ghost"
          disabled={page >= (result.totalPages || 1) || !isOnline}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}

function InfoCard({ title, value, subtitle }) {
  return (
    <div className="rounded-xl border border-line-soft bg-bg-card p-4">
      <p className="text-xs text-text-soft">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
      <p className="text-xs text-text-soft">{subtitle}</p>
    </div>
  );
}
