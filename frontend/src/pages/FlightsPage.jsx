import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { Pencil, Search, Trash2 } from "lucide-react";
import api from "../api/client";
import useDebounce from "../hooks/useDebounce";

export default function FlightsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/flights", {
        params: { page, limit: 10, search: debouncedSearch },
      });
      setResult(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memuat data flights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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

  const cards = useMemo(() => result.data || [], [result]);

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Flights</h1>
        <Link to="/add" className="btn-primary w-full justify-center md:w-auto">
          Tambah Flight
        </Link>
      </div>

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

      <div className="space-y-3">
        {loading && <p className="text-sm text-text-soft">Loading flights...</p>}

        {!loading && cards.length === 0 && (
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
                  ? dayjs(flight.departure_date).format("DD MMM YYYY")
                  : "-"}
              </p>
              <p>
                Arrival:{" "}
                {flight.arrival_date ? dayjs(flight.arrival_date).format("DD MMM YYYY") : "-"}
              </p>
              <p>Flying: {Number(flight.flying_hours || 0).toFixed(1)} hrs</p>
              <p>Rest: {Number(flight.rest_hours || 0).toFixed(1)} hrs</p>
            </div>

            <p className="mt-2 text-sm text-text-soft">Crew: {flight.crew_names || "-"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => navigate(`/add?edit=${flight.id}`)} className="btn-ghost">
                <Pencil size={16} /> Edit
              </button>
              <button onClick={() => deleteFlight(flight.id)} className="btn-danger">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span className="text-sm text-text-soft">Page {page}</span>
        <button
          className="btn-ghost"
          disabled={page >= (result.totalPages || 1)}
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
