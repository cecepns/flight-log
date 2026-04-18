import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, PlaneTakeoff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "demo@flightlog.com",
    password: "password123",
  });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/flights" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!navigator.onLine) {
      toast.error("You need an internet connection to sign in.");
      return;
    }
    try {
      setSubmitting(true);
      await login(form.email, form.password);
      toast.success("Login berhasil");
      navigate("/flights", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-line-soft bg-bg-card p-6 shadow-card"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-brand/20 p-2 text-brand">
            <PlaneTakeoff size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Flight Log Login</h1>
            <p className="text-sm text-text-soft">
              Masuk untuk mencatat perjalanan Anda
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-text-soft">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-text-soft">Password</span>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="input"
            />
          </label>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full">
          <LogIn size={16} />
          {submitting ? "Loading..." : "Login"}
        </button>

        <p className="mt-4 text-xs text-text-soft">
          Demo akun default: demo@flightlog.com / password123
        </p>
      </form>
    </div>
  );
}
