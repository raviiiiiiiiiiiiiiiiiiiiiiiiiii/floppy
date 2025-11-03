import express from "express";
import cors from "cors";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "25mb" })); 
app.use(cors());

// ✅ Connect Neon DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Save game config
app.post("/api/save", async (req, res) => {
  try {
    const id = Math.random().toString(36).slice(2, 10);
    await pool.query("INSERT INTO games (id, config) VALUES ($1, $2)", [
      id,
      req.body
    ]);
    res.json({ success: true, id });
  } catch (err) {
    console.error("SAVE FAIL:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Load game config
app.get("/api/game/:id", async (req, res) => {
  try {
    const q = await pool.query("SELECT config FROM games WHERE id=$1", [
      req.params.id
    ]);

    if (q.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Game Not Found" });
    }

    res.json(q.rows[0].config);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API test endpoint
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "✅ API OK" });
});

// ✅ Serve FRONTEND *AFTER* API routes
app.use(express.static(__dirname));

// ✅ Catch-all fallback → index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Required for Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
