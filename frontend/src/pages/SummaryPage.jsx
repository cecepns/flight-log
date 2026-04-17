import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock3, Moon, Plane, Timer } from "lucide-react";
import api from "../api/client";

export default function SummaryPage() {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    api
      .get("/summary")
      .then((res) => setSummary(res.data || {}))
      .catch((error) => {
        toast.error(error.response?.data?.message || "Gagal memuat summary");
      });
  }, []);

  return (
    <section>
      <h1 className="mb-5 text-2xl font-semibold">Summary</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Plane}
          title="Total Flights"
          value={summary.total_flights || 0}
          subtitle="All completed"
        />
        <SummaryCard
          icon={Clock3}
          title="Flying Hours"
          value={Number(summary.total_flying_hours || 0).toFixed(1)}
          subtitle="All time"
        />
        <SummaryCard
          icon={Moon}
          title="Rest Hours"
          value={Number(summary.total_rest_hours || 0).toFixed(1)}
          subtitle="All time"
        />
        <SummaryCard
          icon={Timer}
          title="This Month"
          value={Number(summary.this_month_hours || 0).toFixed(1)}
          subtitle="Flight hours"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-line-soft bg-bg-card p-6 text-center text-text-soft">
        {Number(summary.total_flights || 0) === 0
          ? "No flight data yet. Start logging flights to see your summary."
          : "Summary is generated from your flight logs automatically."}
      </div>
    </section>
  );
}

function SummaryCard({ icon: Icon, title, value, subtitle }) {
  return (
    <article className="rounded-xl border border-line-soft bg-bg-card p-4">
      <div className="mb-3 inline-flex rounded-lg bg-brand/15 p-2 text-brand">
        <Icon size={16} />
      </div>
      <p className="text-sm text-text-soft">{title}</p>
      <h2 className="text-4xl font-semibold text-white">{value}</h2>
      <p className="text-sm text-text-soft">{subtitle}</p>
    </article>
  );
}
