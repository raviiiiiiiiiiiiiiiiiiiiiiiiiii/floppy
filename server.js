import express from "express";
import cors from "cors";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ Serve frontend files
app.use(express.static(__dirname));

// ✅ Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ API Test Route
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is working ✅" });
});

// ✅ Save Game
app.post("/api/save", async (req, res) => {
  const config = req.body;

  if (!config) return res.status(400).json({ error: "No config sent" });

  const id = Math.random().toString(36).substring(2, 10);

  try {
    await pool.query(
      "INSERT INTO games (id, config) VALUES ($1, $2)",
      [id, config]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error("DB Save error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Load Game
app.get("/api/game/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT config FROM games WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return res.json({ success: false, error: "Game not found" });
    }
    res.json({ success: true, config: result.rows[0].config });
  } catch (err) {
    console.error("DB Load error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Floppy Game API Running");
});

// ✅ Start Server
app.listen(3000, () => console.log("✅ Server running on 3000"));
