import dayjs from "dayjs";
import { jsPDF } from "jspdf";

function fmtDate(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MM YYYY") : String(value);
}

function fmtTime(value) {
  if (value == null || value === "") return "—";
  const s = String(value);
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

function fmtNum(n, decimals = 1) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(decimals) : "—";
}

function ensureSpace(doc, y, need = 8) {
  if (y + need > 285) {
    doc.addPage();
    return 18;
  }
  return y;
}

function sectionTitle(doc, y, title) {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(35, 35, 45);
  doc.text(title, 14, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

function row(doc, y, label, value, valueX = 52) {
  y = ensureSpace(doc, y, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${label}:`, 14, y);
  doc.setFont("helvetica", "normal");
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  const lines = doc.splitTextToSize(text, 196 - valueX);
  doc.text(lines, valueX, y);
  return y + Math.max(6, lines.length * 5);
}

/**
 * @param {object} flight — response from GET /flights/:id (includes crew[], photos[])
 */
export function exportFlightToPdf(flight) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Flight log — ${flight.flight_number || "Flight"}`, 14, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Exported ${dayjs().format("DD MM YYYY HH:mm")}`, 14, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  y = sectionTitle(doc, y, "Flight details");
  y = row(doc, y, "Flight number", flight.flight_number);
  y = row(doc, y, "Aircraft type", flight.aircraft_type);
  y = row(doc, y, "Destination", flight.destination);
  y = row(doc, y, "Status", flight.status);
  y = row(doc, y, "Departure date", fmtDate(flight.departure_date));
  y = row(doc, y, "Arrival date", fmtDate(flight.arrival_date));
  y += 4;

  y = sectionTitle(doc, y, "Times");
  y = row(doc, y, "Est. departure", fmtTime(flight.est_departure_time));
  y = row(doc, y, "Est. arrival", fmtTime(flight.est_arrival_time));
  y = row(doc, y, "Actual departure", fmtTime(flight.actual_departure_time));
  y = row(doc, y, "Actual arrival", fmtTime(flight.actual_arrival_time));
  y += 4;

  y = sectionTitle(doc, y, "Hours");
  y = row(doc, y, "Flying hours", `${fmtNum(flight.flying_hours)} h`);
  y = row(doc, y, "Rest hours", `${fmtNum(flight.rest_hours)} h`);
  y += 4;

  y = sectionTitle(doc, y, "Booked total");
  y = row(doc, y, "FC", flight.booked_fc);
  y = row(doc, y, "JC", flight.booked_jc);
  y = row(doc, y, "PEY", flight.booked_pey);
  y = row(doc, y, "EY", flight.booked_ey);
  y += 4;

  y = sectionTitle(doc, y, "Checked-in total");
  y = row(doc, y, "FC", flight.checked_fc);
  y = row(doc, y, "JC", flight.checked_jc);
  y = row(doc, y, "PEY", flight.checked_pey);
  y = row(doc, y, "EY", flight.checked_ey);
  y += 4;

  const crewList = Array.isArray(flight.crew) ? flight.crew : [];
  y = sectionTitle(doc, y, "Crew");
  if (!crewList.length) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(10);
    doc.text("No crew recorded.", 14, y);
    y += 8;
  } else {
    crewList.forEach((c) => {
      const line = `${c.position || "—"} — ${c.crew_name || "—"} (${c.nationality || "—"})`;
      y = ensureSpace(doc, y, 8);
      doc.setFontSize(10);
      doc.text(`• ${line}`, 14, y);
      y += 6;
    });
  }
  y += 4;

  const photoCount = Array.isArray(flight.photos) ? flight.photos.length : 0;
  y = sectionTitle(doc, y, "Photos");
  y = row(doc, y, "Attachments", photoCount ? `${photoCount} file(s)` : "None");

  if (flight.notes) {
    y += 4;
    y = sectionTitle(doc, y, "Notes");
    y = ensureSpace(doc, y, 12);
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(String(flight.notes), 182);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 4;
  }

  const safeFn = String(flight.flight_number || "flight")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
  doc.save(`flight-${safeFn}-${flight.id || "export"}.pdf`);
}
