// server/server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // allow big base64 images

// ---------- Configure DB ----------
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL not set. Save/load will fail until you set it.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Create table if not exists (runs once on startup)
async function ensureTable() {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ games table ready");
  } catch (e) {
    console.error("❌ Error creating games table:", e);
  }
}
ensureTable().catch(e => console.error(e));

// ---------- Serve frontend (static files) ----------
app.use(express.static(path.join(__dirname, "../frontend")));

// ---------- API: test ----------
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "✅ API OK" });
});

// ---------- API: save game ----------
// Expects JSON body: { id?: string, config: {...} }
// If id not provided, server will generate a short id and return it.
app.post("/api/save", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.config) {
      return res.status(400).json({ success: false, message: "Missing config in body" });
    }

    // allow client to pass an id, otherwise generate
    const id = payload.id && String(payload.id).trim().length ? String(payload.id).trim() : Math.random().toString(36).slice(2, 10);
    const config = payload.config;

    // upsert (insert or update)
    await pool.query(
      `INSERT INTO games (id, config) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config`,
      [id, config]
    );

    res.json({ success: true, id });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
});

// ---------- API: load game ----------
app.get("/api/game/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "Missing id" });

    const q = await pool.query("SELECT config FROM games WHERE id = $1 LIMIT 1", [id]);
    if (q.rows.length === 0) return res.status(404).json({ success: false, message: "Game not found" });

    return res.json({ success: true, config: q.rows[0].config });
  } catch (err) {
    console.error("LOAD ERROR:", err);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
});

// ---------- Serve play.html directly (optional, convenient) ----------
app.get("/play.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/play.html"));
});

// ---------- Fallback to index.html for any other route (SPA behaviour) ----------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ---------- Start server ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
