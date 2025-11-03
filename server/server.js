import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Directory fix for serving frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../content")));

// ✅ DB Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Test API
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "✅ API OK" });
});

// ✅ Save Game Data
app.post("/api/save", async (req, res) => {
  const { id, config } = req.body;
  if (!id || !config) return res.status(400).json({ success: false, message: "id + config required" });

  try {
    await pool.query(
      "INSERT INTO games (id, config) VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET config = $2",
      [id, config]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Load Game
app.get("/api/game/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const dbRes = await pool.query("SELECT config FROM games WHERE id=$1", [id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, config: dbRes.rows[0].config });
  } catch (err) {
    console.error("Error loading:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Floppy Game API Running on", PORT));
