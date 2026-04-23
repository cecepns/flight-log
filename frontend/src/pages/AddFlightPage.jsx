import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ImagePlus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import api from "../api/client";
import {
  airportIataCodes,
  crewNationalities,
  crewPositions,
  initialFlightForm,
} from "../constants";
import {
  enqueueOfflineFlight,
  isNetworkLayerFailure,
} from "../utils/offlineFlightQueue";

const emptyCrew = { position: "", crew_name: "", nationality: "" };

export default function AddFlightPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get("edit");

  const [form, setForm] = useState(initialFlightForm);
  const [crew, setCrew] = useState([]);
  const [crewForm, setCrewForm] = useState(emptyCrew);
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removePhotoIds, setRemovePhotoIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const pageTitle = useMemo(() => (editId ? "Edit Flight Log" : "New Flight Log"), [editId]);

  useEffect(() => {
    if (!editId) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/flights/${editId}`);
        setForm({
          ...initialFlightForm,
          ...data,
          departure_date: data.departure_date ? String(data.departure_date).slice(0, 10) : "",
          arrival_date: data.arrival_date ? String(data.arrival_date).slice(0, 10) : "",
          flying_hours: data.flying_hours ?? "",
          rest_hours: data.rest_hours ?? "",
        });
        setCrew(data.crew || []);
        setExistingPhotos(data.photos || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Gagal memuat detail flight");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [editId]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addCrew = () => {
    if (!crewForm.position || !crewForm.crew_name || !crewForm.nationality) {
      toast.error("Please fill in position, crew name, and nationality.");
      return;
    }
    setCrew((prev) => [{ ...crewForm, id: Date.now() }, ...prev]);
    setCrewForm(emptyCrew);
  };

  const toggleRemovePhoto = (id) => {
    setRemovePhotoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    if (
      !form.flight_number ||
      !form.aircraft_type ||
      !form.destination ||
      !form.departure_date ||
      !form.arrival_date
    ) {
      toast.error(
        "Please enter flight number, aircraft type, destination, departure date, and arrival date.",
      );
      return;
    }

    const payload = new FormData();
    payload.append("flightData", JSON.stringify(form));
    payload.append("crews", JSON.stringify(crew));
    payload.append("removePhotoIds", JSON.stringify(removePhotoIds));
    newPhotos.forEach((file) => payload.append("photos", file));

    const queueOffline = () => {
      if (newPhotos.length > 0) {
        toast(
          "New photos were not saved offline. You can attach them again after you reconnect.",
          { duration: 4500 },
        );
      }
      enqueueOfflineFlight({
        form,
        crew,
        editId: editId ? Number(editId) : null,
        removePhotoIds,
      });
      toast.success("Saved offline. It will sync to the server when you are online.");
      navigate("/flights");
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      setLoading(true);
      if (editId) {
        await api.put(`/flights/${editId}`, payload);
        toast.success("Flight updated successfully");
      } else {
        await api.post("/flights", payload);
        toast.success("Flight added successfully");
      }
      navigate("/flights");
    } catch (error) {
      if (isNetworkLayerFailure(error)) {
        queueOffline();
        return;
      }
      toast.error(error.response?.data?.message || "Could not save flight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-5" onSubmit={submit}>
        <datalist id="flight-log-airports">
          {airportIataCodes.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>

        <h1 className="text-2xl font-semibold">{pageTitle}</h1>

        <Section title="Flight Details" compact>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Flight Number *"
              placeholder="e.g. CX123"
              value={form.flight_number}
              onChange={(v) => updateField("flight_number", v)}
            />
            <Input
              label="Aircraft Type *"
              placeholder="e.g. A350"
              value={form.aircraft_type}
              onChange={(v) => updateField("aircraft_type", v)}
            />
          </div>
          <Input
            label="Destination *"
            placeholder="e.g. CGK, SUB, LAX"
            list="flight-log-airports"
            value={form.destination}
            onChange={(v) => updateField("destination", v.toUpperCase())}
          />
          <div className="grid grid-cols-2 gap-2">
            <DatePickerField
              label="Departure Date *"
              value={form.departure_date}
              onChange={(v) => updateField("departure_date", v)}
            />
            <DatePickerField
              label="Arrival Date *"
              value={form.arrival_date}
              onChange={(v) => updateField("arrival_date", v)}
            />
          </div>
          <label className="block">
            <span className="label">Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
        </div>
        </Section>

        <Section title="Time & Hours" compact>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label="Est. Departure"
              value={form.est_departure_time || ""}
              onChange={(v) => updateField("est_departure_time", v)}
            />
            <Input
              type="time"
              label="Actual Departure"
              value={form.actual_departure_time || ""}
              onChange={(v) => updateField("actual_departure_time", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label="Est. Arrival"
              value={form.est_arrival_time || ""}
              onChange={(v) => updateField("est_arrival_time", v)}
            />
            <Input
              type="time"
              label="Actual Arrival"
              value={form.actual_arrival_time || ""}
              onChange={(v) => updateField("actual_arrival_time", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.1"
              label="Flying Hours"
              value={form.flying_hours}
              onChange={(v) => updateField("flying_hours", v)}
            />
            <Input
              type="number"
              step="0.1"
              label="Rest Hours"
              value={form.rest_hours}
              onChange={(v) => updateField("rest_hours", v)}
            />
          </div>
        </div>
        </Section>

        <Section title="Booked Total">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input
            type="number"
            label="FC"
            value={form.booked_fc}
            onChange={(v) => updateField("booked_fc", v)}
          />
          <Input
            type="number"
            label="JC"
            value={form.booked_jc}
            onChange={(v) => updateField("booked_jc", v)}
          />
          <Input
            type="number"
            label="PEY"
            value={form.booked_pey}
            onChange={(v) => updateField("booked_pey", v)}
          />
          <Input
            type="number"
            label="EY"
            value={form.booked_ey}
            onChange={(v) => updateField("booked_ey", v)}
          />
        </div>
        </Section>

        <Section title="Checked In Total">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input
            type="number"
            label="FC"
            value={form.checked_fc}
            onChange={(v) => updateField("checked_fc", v)}
          />
          <Input
            type="number"
            label="JC"
            value={form.checked_jc}
            onChange={(v) => updateField("checked_jc", v)}
          />
          <Input
            type="number"
            label="PEY"
            value={form.checked_pey}
            onChange={(v) => updateField("checked_pey", v)}
          />
          <Input
            type="number"
            label="EY"
            value={form.checked_ey}
            onChange={(v) => updateField("checked_ey", v)}
          />
        </div>
        </Section>

        <Section title="Add Crew">
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className="label">Crew Position</span>
              <button
                type="button"
                className="input flex items-center justify-between"
                onClick={() => setActivePicker("position")}
              >
                <span className={crewForm.position ? "text-slate-100" : "text-text-soft"}>
                  {crewForm.position || "Select"}
                </span>
                <ChevronDown size={16} className="text-text-soft" />
              </button>
            </label>

            <Input
              label="Crew Name"
              value={crewForm.crew_name}
              onChange={(v) => setCrewForm((prev) => ({ ...prev, crew_name: v }))}
            />

            <label>
              <span className="label">Crew Nationality</span>
              <button
                type="button"
                className="input flex items-center justify-between"
                onClick={() => setActivePicker("nationality")}
              >
                <span className={crewForm.nationality ? "text-slate-100" : "text-text-soft"}>
                  {crewForm.nationality || "Select"}
                </span>
                <ChevronDown size={16} className="text-text-soft" />
              </button>
            </label>
          </div>

          <button type="button" className="btn-ghost mt-3" onClick={addCrew}>
            <Plus size={16} /> Add Crew Member
          </button>

          <div className="mt-3 space-y-2">
            {crew.length === 0 && <p className="text-sm text-text-soft">No crew members added</p>}
            {crew.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between rounded-lg border border-line-soft p-3"
              >
                <p className="text-sm">
                  <span className="font-semibold">{item.position}</span> - {item.crew_name} (
                  {item.nationality})
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setCrew((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Notes">
        <textarea
          className="input min-h-28"
          value={form.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Any remarks about this flight"
        />
        </Section>

        <Section title="Upload Photos">
        <label className="input flex cursor-pointer items-center justify-center gap-2 py-8 text-text-soft">
          <ImagePlus size={18} />
          Upload photos
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => setNewPhotos(Array.from(e.target.files || []))}
          />
        </label>

        {newPhotos.length > 0 && (
          <p className="mt-2 text-sm text-text-soft">{newPhotos.length} new photo(s) selected</p>
        )}

        {existingPhotos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {existingPhotos.map((photo) => {
              const selected = removePhotoIds.includes(photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => toggleRemovePhoto(photo.id)}
                  className={`overflow-hidden rounded-lg border ${
                    selected ? "border-red-500" : "border-line-soft"
                  }`}
                >
                  <img
                    src={`${import.meta.env.VITE_SERVER_URL || "https://api-inventory.isavralabel.com/flight-log"}${
                      photo.image_url
                    }`}
                    alt="flight"
                    className={`h-24 w-full object-cover ${
                      selected ? "opacity-40" : "opacity-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
        </Section>

        <div className="flex gap-3 pb-3">
          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? "Saving..." : editId ? "Update Flight Log" : "Save Flight Log"}
          </button>
        </div>
      </form>

      <BottomPicker
        open={activePicker === "position"}
        title="Position"
        options={crewPositions}
        selectedValue={crewForm.position}
        onClose={() => setActivePicker(null)}
        onSelect={(value) => {
          setCrewForm((prev) => ({ ...prev, position: value }));
          setActivePicker(null);
        }}
      />

      <BottomPicker
        open={activePicker === "nationality"}
        title="Nationality"
        options={crewNationalities}
        selectedValue={crewForm.nationality}
        onClose={() => setActivePicker(null)}
        onSelect={(value) => {
          setCrewForm((prev) => ({ ...prev, nationality: value }));
          setActivePicker(null);
        }}
      />
    </>
  );
}

function Section({ title, children, compact = false }) {
  return (
    <section
      className={`rounded-2xl border border-line-soft bg-bg-card ${
        compact ? "p-3 md:p-4" : "p-4 md:p-5"
      }`}
    >
      <h2 className={`font-semibold ${compact ? "mb-2 text-base" : "mb-3 text-lg"}`}>{title}</h2>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  step,
  placeholder,
  list,
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="label">{label}</span>
      <input
        type={type}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder={placeholder}
        list={list || undefined}
      />
    </label>
  );
}

function DatePickerField({ label, value, onChange }) {
  const parsed = value ? dayjs(value) : null;
  const selectedDate = parsed && parsed.isValid() ? parsed.toDate() : null;

  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          onChange(date ? dayjs(date).format("YYYY-MM-DD") : "");
        }}
        dateFormat="dd MM yyyy"
        placeholderText="DD MM YYYY"
        isClearable
        className="input min-w-0"
        wrapperClassName="block min-w-0"
      />
    </label>
  );
}

function BottomPicker({ open, title, options, selectedValue, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-3" onClick={onClose}>
      <div
        className="w-full rounded-3xl border border-line-soft bg-bg-card p-4 pb-5 shadow-card md:mx-auto md:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-line-soft" />
        <p className="mb-4 text-center text-3xl font-semibold">{title}</p>

        <div className="grid grid-cols-4 gap-2">
          {options.map((option) => {
            const active = selectedValue === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`rounded-2xl border px-3 py-3 text-base font-medium transition ${
                  active
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-line-soft bg-bg-main text-slate-100"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
