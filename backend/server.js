const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "flight-log-secret";
const uploadsDir = path.join(__dirname, "uploads-flight-log");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "flight_log_app",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());
app.use("/uploads-flight-log", express.static(uploadsDir));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage });

function resolveImageLocalPath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const safeUrl = imageUrl.replace(/\\/g, "/");
  if (safeUrl.includes("..")) return null;

  if (safeUrl.startsWith("/uploads-flight-log/")) {
    return path.join(__dirname, safeUrl.replace(/^\//, ""));
  }
  if (safeUrl.startsWith("/uploads/")) {
    return path.join(__dirname, safeUrl.replace(/^\//, ""));
  }
  return null;
}

function unlinkImageIfExists(imageUrl) {
  const localPath = resolveImageLocalPath(imageUrl);
  if (!localPath) return;
  if (!fs.existsSync(localPath)) return;
  try {
    fs.unlinkSync(localPath);
  } catch (error) {
    console.warn("Failed to unlink image:", imageUrl, error.message);
  }
}

const crewPositions = new Set([
  "CN",
  "FO",
  "SO",
  "ISM",
  "SP1",
  "SP2",
  "FP1",
  "FP2",
  "FP3",
  "FP5",
  "FP6",
  "FP7",
  "FP8",
  "BC1",
  "BC2",
  "BC3",
  "BC4",
  "BC5",
  "BC6",
  "BC7",
  "BC8",
  "FC",
  "FX",
  "PX",
]);

const nationalities = new Set([
  "HK",
  "ID",
  "MY",
  "SG",
  "TH",
  "PH",
  "CN",
  "KR",
  "JP",
  "AU",
  "CA",
  "US",
  "IN",
  "TW",
  "OTH",
]);

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function sanitizePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(10, Math.max(1, Number(query.limit || 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseJsonField(field, fallback) {
  if (!field) return fallback;
  try {
    return JSON.parse(field);
  } catch {
    return fallback;
  }
}

function normalizeCrewList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.position && item.crew_name && item.nationality)
    .map((item) => ({
      position: String(item.position).toUpperCase().trim(),
      crew_name: String(item.crew_name).trim(),
      nationality: String(item.nationality).toUpperCase().trim(),
    }))
    .filter(
      (item) =>
        crewPositions.has(item.position) &&
        nationalities.has(item.nationality) &&
        item.crew_name.length > 0,
    );
}

function normalizeFlightPayload(payload) {
  return {
    flight_number: payload.flight_number?.trim() || "",
    aircraft_type: payload.aircraft_type?.trim() || "",
    destination: payload.destination?.trim() || "",
    departure_date: payload.departure_date || null,
    arrival_date: payload.arrival_date || null,
    status: payload.status || "Upcoming",
    est_departure_time: payload.est_departure_time || null,
    est_arrival_time: payload.est_arrival_time || null,
    actual_departure_time: payload.actual_departure_time || null,
    actual_arrival_time: payload.actual_arrival_time || null,
    flying_hours: payload.flying_hours ? Number(payload.flying_hours) : 0,
    rest_hours: payload.rest_hours ? Number(payload.rest_hours) : 0,
    booked_fc: Number(payload.booked_fc || 0),
    booked_jc: Number(payload.booked_jc || 0),
    booked_pey: Number(payload.booked_pey || 0),
    booked_ey: Number(payload.booked_ey || 0),
    checked_fc: Number(payload.checked_fc || 0),
    checked_jc: Number(payload.checked_jc || 0),
    checked_pey: Number(payload.checked_pey || 0),
    checked_ey: Number(payload.checked_ey || 0),
    notes: payload.notes || "",
  };
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (!rows.length) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
    },
  });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, email, full_name FROM users WHERE id = ? LIMIT 1",
    [req.user.userId],
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(rows[0]);
});

app.put("/api/me", authMiddleware, async (req, res) => {
  const { fullName, email, currentPassword, newPassword } = req.body || {};

  if (!fullName || !email) {
    return res.status(400).json({ message: "Full name and email are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedFullName = String(fullName).trim();

  if (!normalizedFullName) {
    return res.status(400).json({ message: "Full name cannot be empty." });
  }

  const [users] = await pool.query(
    "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
    [req.user.userId],
  );
  if (!users.length) {
    return res.status(404).json({ message: "User not found." });
  }

  const [emailRows] = await pool.query(
    "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
    [normalizedEmail, req.user.userId],
  );
  if (emailRows.length) {
    return res.status(409).json({ message: "Email is already in use." });
  }

  let passwordHash = users[0].password_hash;
  const wantsPasswordChange = Boolean(newPassword);

  if (wantsPasswordChange) {
    if (!currentPassword) {
      return res
        .status(400)
        .json({ message: "Current password is required to change password." });
    }
    if (String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    const validCurrent = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!validCurrent) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await pool.query(
    "UPDATE users SET full_name = ?, email = ?, password_hash = ? WHERE id = ?",
    [normalizedFullName, normalizedEmail, passwordHash, req.user.userId],
  );

  return res.json({
    message: wantsPasswordChange
      ? "Profile and password updated."
      : "Profile updated.",
    user: {
      id: req.user.userId,
      fullName: normalizedFullName,
      email: normalizedEmail,
    },
  });
});

app.get("/api/flights", authMiddleware, async (req, res) => {
  const { page, limit, offset } = sanitizePagination(req.query);
  const search = (req.query.search || "").trim();
  const searchLike = `%${search}%`;
  const hasSearch = search.length > 0;

  const whereClause = hasSearch
    ? `WHERE f.user_id = ? AND (
      f.flight_number LIKE ?
      OR f.aircraft_type LIKE ?
      OR f.destination LIKE ?
      OR EXISTS (
        SELECT 1 FROM crew_members c2
        WHERE c2.flight_id = f.id AND c2.crew_name LIKE ?
      )
    )`
    : "WHERE f.user_id = ?";

  const params = hasSearch
    ? [req.user.userId, searchLike, searchLike, searchLike, searchLike]
    : [req.user.userId];

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM flights f
     ${whereClause}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT
      f.*,
      GROUP_CONCAT(DISTINCT c.crew_name ORDER BY c.crew_name SEPARATOR ', ') AS crew_names
     FROM flights f
     LEFT JOIN crew_members c ON c.flight_id = f.id
     ${whereClause}
     GROUP BY f.id
     ORDER BY f.departure_date DESC, f.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return res.json({
    page,
    limit,
    total: countRows[0]?.total || 0,
    totalPages: Math.ceil((countRows[0]?.total || 0) / limit),
    data: rows,
  });
});

app.get("/api/flights/:id", authMiddleware, async (req, res) => {
  const flightId = Number(req.params.id);
  const [flightRows] = await pool.query(
    "SELECT * FROM flights WHERE id = ? AND user_id = ? LIMIT 1",
    [flightId, req.user.userId],
  );
  if (!flightRows.length) {
    return res.status(404).json({ message: "Flight not found" });
  }

  const [crewRows] = await pool.query(
    "SELECT id, position, crew_name, nationality FROM crew_members WHERE flight_id = ? ORDER BY id DESC",
    [flightId],
  );
  const [photoRows] = await pool.query(
    "SELECT id, image_url FROM flight_photos WHERE flight_id = ? ORDER BY id DESC",
    [flightId],
  );

  return res.json({
    ...flightRows[0],
    crew: crewRows,
    photos: photoRows,
  });
});

app.post("/api/flights", authMiddleware, upload.array("photos", 10), async (req, res) => {
  const rawFlight = parseJsonField(req.body.flightData, req.body);
  const crew = normalizeCrewList(parseJsonField(req.body.crews, []));
  const payload = normalizeFlightPayload(rawFlight);

  if (!payload.flight_number || !payload.departure_date) {
    return res
      .status(400)
      .json({ message: "Flight number and departure date are required." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO flights (
        user_id, flight_number, aircraft_type, destination, departure_date, arrival_date, status,
        est_departure_time, est_arrival_time, actual_departure_time, actual_arrival_time,
        flying_hours, rest_hours, booked_fc, booked_jc, booked_pey, booked_ey,
        checked_fc, checked_jc, checked_pey, checked_ey, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        payload.flight_number,
        payload.aircraft_type,
        payload.destination,
        payload.departure_date,
        payload.arrival_date,
        payload.status,
        payload.est_departure_time,
        payload.est_arrival_time,
        payload.actual_departure_time,
        payload.actual_arrival_time,
        payload.flying_hours,
        payload.rest_hours,
        payload.booked_fc,
        payload.booked_jc,
        payload.booked_pey,
        payload.booked_ey,
        payload.checked_fc,
        payload.checked_jc,
        payload.checked_pey,
        payload.checked_ey,
        payload.notes,
      ],
    );

    const flightId = result.insertId;
    for (const member of crew) {
      await conn.query(
        "INSERT INTO crew_members (flight_id, position, crew_name, nationality) VALUES (?, ?, ?, ?)",
        [flightId, member.position, member.crew_name, member.nationality],
      );
    }

    const files = req.files || [];
    for (const file of files) {
      await conn.query(
        "INSERT INTO flight_photos (flight_id, image_url) VALUES (?, ?)",
        [flightId, `/uploads-flight-log/${file.filename}`],
      );
    }

    await conn.commit();
    return res.status(201).json({ message: "Flight created", id: flightId });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
});

app.put("/api/flights/:id", authMiddleware, upload.array("photos", 10), async (req, res) => {
  const flightId = Number(req.params.id);
  const rawFlight = parseJsonField(req.body.flightData, req.body);
  const crew = normalizeCrewList(parseJsonField(req.body.crews, []));
  const removePhotoIds = parseJsonField(req.body.removePhotoIds, []);
  const payload = normalizeFlightPayload(rawFlight);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [exists] = await conn.query(
      "SELECT id FROM flights WHERE id = ? AND user_id = ? LIMIT 1",
      [flightId, req.user.userId],
    );

    if (!exists.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Flight not found" });
    }

    await conn.query(
      `UPDATE flights SET
        flight_number = ?, aircraft_type = ?, destination = ?, departure_date = ?, arrival_date = ?, status = ?,
        est_departure_time = ?, est_arrival_time = ?, actual_departure_time = ?, actual_arrival_time = ?,
        flying_hours = ?, rest_hours = ?, booked_fc = ?, booked_jc = ?, booked_pey = ?, booked_ey = ?,
        checked_fc = ?, checked_jc = ?, checked_pey = ?, checked_ey = ?, notes = ?
      WHERE id = ? AND user_id = ?`,
      [
        payload.flight_number,
        payload.aircraft_type,
        payload.destination,
        payload.departure_date,
        payload.arrival_date,
        payload.status,
        payload.est_departure_time,
        payload.est_arrival_time,
        payload.actual_departure_time,
        payload.actual_arrival_time,
        payload.flying_hours,
        payload.rest_hours,
        payload.booked_fc,
        payload.booked_jc,
        payload.booked_pey,
        payload.booked_ey,
        payload.checked_fc,
        payload.checked_jc,
        payload.checked_pey,
        payload.checked_ey,
        payload.notes,
        flightId,
        req.user.userId,
      ],
    );

    await conn.query("DELETE FROM crew_members WHERE flight_id = ?", [flightId]);
    for (const member of crew) {
      await conn.query(
        "INSERT INTO crew_members (flight_id, position, crew_name, nationality) VALUES (?, ?, ?, ?)",
        [flightId, member.position, member.crew_name, member.nationality],
      );
    }

    if (Array.isArray(removePhotoIds) && removePhotoIds.length) {
      const placeholders = removePhotoIds.map(() => "?").join(",");
      const [rows] = await conn.query(
        `SELECT image_url FROM flight_photos WHERE id IN (${placeholders}) AND flight_id = ?`,
        [...removePhotoIds, flightId],
      );
      for (const row of rows) {
        unlinkImageIfExists(row.image_url);
      }
      await conn.query(
        `DELETE FROM flight_photos WHERE id IN (${placeholders}) AND flight_id = ?`,
        [...removePhotoIds, flightId],
      );
    }

    const files = req.files || [];
    for (const file of files) {
      await conn.query(
        "INSERT INTO flight_photos (flight_id, image_url) VALUES (?, ?)",
        [flightId, `/uploads-flight-log/${file.filename}`],
      );
    }

    await conn.commit();
    return res.json({ message: "Flight updated" });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
});

app.delete("/api/flights/:id", authMiddleware, async (req, res) => {
  const flightId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [exists] = await conn.query(
      "SELECT id FROM flights WHERE id = ? AND user_id = ? LIMIT 1",
      [flightId, req.user.userId],
    );
    if (!exists.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Flight not found" });
    }

    const [photoRows] = await conn.query(
      "SELECT image_url FROM flight_photos WHERE flight_id = ?",
      [flightId],
    );
    for (const row of photoRows) {
      unlinkImageIfExists(row.image_url);
    }

    await conn.query(
      "DELETE FROM flight_photos WHERE flight_id = ?",
      [flightId],
    );
    await conn.query("DELETE FROM crew_members WHERE flight_id = ?", [flightId]);
    await conn.query("DELETE FROM flights WHERE id = ? AND user_id = ?", [
      flightId,
      req.user.userId,
    ]);

    await conn.commit();
    return res.json({ message: "Flight deleted" });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
});

app.get("/api/summary", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS total_flights,
      SUM(flying_hours) AS total_flying_hours,
      SUM(rest_hours) AS total_rest_hours,
      SUM(CASE WHEN DATE_FORMAT(departure_date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
        THEN flying_hours ELSE 0 END) AS this_month_hours
    FROM flights
    WHERE user_id = ?`,
    [req.user.userId],
  );

  return res.json(rows[0] || {});
});

app.use((error, _, res, __) => {
  return res.status(500).json({ message: error.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
