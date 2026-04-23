import dayjs from "dayjs";
import { jsPDF } from "jspdf";

const MARGIN = 14;
const PAGE_H = 297;
const COL_W = 88;
const COL_GAP = 6;
const RIGHT_X = MARGIN + COL_W + COL_GAP; // 108
const FULL_W = 182; // 210 - 14*2
const LABEL_W = 38;

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
  if (y + need > PAGE_H - 12) {
    doc.addPage();
    return 18;
  }
  return y;
}

/** Render a section title at (x, y) and return next Y. */
function sectionTitleAt(doc, y, title, x = MARGIN) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(35, 35, 45);
  doc.text(title, x, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

/** Render a label:value row at column starting at (x, y) with colW column width. */
function rowAt(doc, y, label, value, x = MARGIN, colW = FULL_W) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${label}:`, x, y);
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  const valueX = x + LABEL_W;
  const lines = doc.splitTextToSize(text, colW - LABEL_W);
  doc.text(lines, valueX, y);
  return y + Math.max(6, lines.length * 5);
}

/** Single-column row (full width, original behaviour). */
function row(doc, y, label, value) {
  y = ensureSpace(doc, y, 10);
  return rowAt(doc, y, label, value, MARGIN, FULL_W);
}

/**
 * @param {object} flight — response from GET /flights/:id (includes crew[], photos[])
 */
export function exportFlightToPdf(flight) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Flight log — ${flight.flight_number || "Flight"}`, MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Exported ${dayjs().format("DD MM YYYY HH:mm")}`, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Two-column: Flight details | Times ─────────────────────────────────────
  y = ensureSpace(doc, y, 50);
  const yFDT = y;

  let yL = sectionTitleAt(doc, yFDT, "Flight details", MARGIN);
  yL = rowAt(doc, yL, "Flight number", flight.flight_number, MARGIN, COL_W);
  yL = rowAt(doc, yL, "Aircraft type", flight.aircraft_type, MARGIN, COL_W);
  yL = rowAt(doc, yL, "Destination", flight.destination, MARGIN, COL_W);
  yL = rowAt(doc, yL, "Status", flight.status, MARGIN, COL_W);
  yL = rowAt(doc, yL, "Departure date", fmtDate(flight.departure_date), MARGIN, COL_W);
  yL = rowAt(doc, yL, "Arrival date", fmtDate(flight.arrival_date), MARGIN, COL_W);

  let yR = sectionTitleAt(doc, yFDT, "Times", RIGHT_X);
  yR = rowAt(doc, yR, "Est. departure", fmtTime(flight.est_departure_time), RIGHT_X, COL_W);
  yR = rowAt(doc, yR, "Est. arrival", fmtTime(flight.est_arrival_time), RIGHT_X, COL_W);
  yR = rowAt(doc, yR, "Actual departure", fmtTime(flight.actual_departure_time), RIGHT_X, COL_W);
  yR = rowAt(doc, yR, "Actual arrival", fmtTime(flight.actual_arrival_time), RIGHT_X, COL_W);

  y = Math.max(yL, yR) + 6;

  // ── Hours (single column) ──────────────────────────────────────────────────
  y = ensureSpace(doc, y, 28);
  y = sectionTitleAt(doc, y, "Hours");
  y = row(doc, y, "Flying hours", `${fmtNum(flight.flying_hours)} h`);
  y = row(doc, y, "Rest hours", `${fmtNum(flight.rest_hours)} h`);
  y += 6;

  // ── Two-column: Booked total | Checked-in total ────────────────────────────
  y = ensureSpace(doc, y, 36);
  const yBkd = y;

  let yBL = sectionTitleAt(doc, yBkd, "Booked total", MARGIN);
  yBL = rowAt(doc, yBL, "FC", flight.booked_fc, MARGIN, COL_W);
  yBL = rowAt(doc, yBL, "JC", flight.booked_jc, MARGIN, COL_W);
  yBL = rowAt(doc, yBL, "PEY", flight.booked_pey, MARGIN, COL_W);
  yBL = rowAt(doc, yBL, "EY", flight.booked_ey, MARGIN, COL_W);

  let yBR = sectionTitleAt(doc, yBkd, "Checked-in total", RIGHT_X);
  yBR = rowAt(doc, yBR, "FC", flight.checked_fc, RIGHT_X, COL_W);
  yBR = rowAt(doc, yBR, "JC", flight.checked_jc, RIGHT_X, COL_W);
  yBR = rowAt(doc, yBR, "PEY", flight.checked_pey, RIGHT_X, COL_W);
  yBR = rowAt(doc, yBR, "EY", flight.checked_ey, RIGHT_X, COL_W);

  y = Math.max(yBL, yBR) + 6;

  // ── Crew ───────────────────────────────────────────────────────────────────
  const crewList = Array.isArray(flight.crew) ? flight.crew : [];
  y = ensureSpace(doc, y, 14);
  y = sectionTitleAt(doc, y, "Crew");
  if (!crewList.length) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(10);
    doc.text("No crew recorded.", MARGIN, y);
    y += 8;
  } else {
    crewList.forEach((c) => {
      const line = `${c.position || "—"} — ${c.crew_name || "—"} (${c.nationality || "—"})`;
      y = ensureSpace(doc, y, 8);
      doc.setFontSize(10);
      doc.text(`• ${line}`, MARGIN, y);
      y += 6;
    });
  }
  y += 4;

  // ── Photos ─────────────────────────────────────────────────────────────────
  const photoCount = Array.isArray(flight.photos) ? flight.photos.length : 0;
  y = ensureSpace(doc, y, 18);
  y = sectionTitleAt(doc, y, "Photos");
  y = row(doc, y, "Attachments", photoCount ? `${photoCount} file(s)` : "None");

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (flight.notes) {
    y += 4;
    y = ensureSpace(doc, y, 18);
    y = sectionTitleAt(doc, y, "Notes");
    y = ensureSpace(doc, y, 12);
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(String(flight.notes), FULL_W);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 5 + 4;
  }

  const safeFn = String(flight.flight_number || "flight")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
  doc.save(`flight-${safeFn}-${flight.id || "export"}.pdf`);
}
