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
app.use(express.static(__dirname)); // serve index & play.html

// ✅ DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ✅ Test Route
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "✅ API OK" });
});

// ✅ Save Game
app.post("/api/save", async (req, res) => {
  const id = Math.random().toString(36).substring(2, 10);
  try {
    await pool.query("INSERT INTO games (id, config) VALUES ($1,$2)", [
      id,
      req.body
    ]);
    return res.json({ success: true, id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
});

// ✅ Load Game
app.get("/api/game/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT config FROM games WHERE id=$1", [
      req.params.id
    ]);
    if (result.rowCount === 0)
      return res.json({ success: false, error: "Not found" });

    res.json({ success: true, config: result.rows[0].config });
  } catch (err) {
    console.error(err.message);
    res.json({ success: false, error: "DB error" });
  }
});

// ✅ ROOT
app.get("/", (req, res) => {
  res.send("✅ Floppy API Running");
});

// ✅ PORT FIX FOR RAILWAY!!!
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
