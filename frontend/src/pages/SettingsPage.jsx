import { useEffect, useState } from "react";
import { KeyRound, LogOut, Save, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName || "",
      email: user?.email || "",
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success("Logout berhasil");
    navigate("/login", { replace: true });
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!profileForm.fullName.trim() || !profileForm.email.trim()) {
      toast.error("Nama dan email wajib diisi");
      return;
    }

    try {
      setSavingProfile(true);
      const { data } = await api.put("/me", {
        fullName: profileForm.fullName,
        email: profileForm.email,
      });
      updateUserProfile(data.user);
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal update profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Isi password lama dan password baru");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Konfirmasi password baru tidak sama");
      return;
    }

    try {
      setSavingPassword(true);
      await api.put("/me", {
        fullName: profileForm.fullName,
        email: profileForm.email,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password berhasil diperbarui");
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section>
      <h1 className="mb-5 text-2xl font-semibold">Settings</h1>

      <div className="mb-4 rounded-2xl border border-line-soft bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-brand/20 p-3 text-brand">
            <User size={20} />
          </div>
          <div>
            <p className="font-semibold">{user?.fullName || "User"}</p>
            <p className="text-sm text-text-soft">{user?.email || "-"}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-text-soft">
          Anda bisa mulai mencatat flight lewat menu Add, melihat ringkasan di
          Summary, dan melakukan edit/hapus dari halaman Flights.
        </p>

        <button className="btn-danger" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <form
        onSubmit={handleProfileSave}
        className="mb-4 rounded-2xl border border-line-soft bg-bg-card p-5"
      >
        <h2 className="mb-3 text-lg font-semibold">Update Profile</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="label">Full Name</span>
            <input
              className="input"
              value={profileForm.fullName}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Your full name"
            />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary mt-4" disabled={savingProfile}>
          <Save size={16} />
          {savingProfile ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form
        onSubmit={handlePasswordSave}
        className="rounded-2xl border border-line-soft bg-bg-card p-5"
      >
        <h2 className="mb-3 text-lg font-semibold">Change Password</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="label">Current Password</span>
            <input
              className="input"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              placeholder="Current password"
            />
          </label>
          <label className="block">
            <span className="label">New Password</span>
            <input
              className="input"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              placeholder="New password (min. 8 chars)"
            />
          </label>
          <label className="block">
            <span className="label">Confirm New Password</span>
            <input
              className="input"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Repeat new password"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary mt-4" disabled={savingPassword}>
          <KeyRound size={16} />
          {savingPassword ? "Saving..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}
