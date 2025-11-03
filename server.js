import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create table if not exists
pool.query(`
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL
)`
);

// ✅ Save game config
app.post("/save", async (req, res) => {
  try {
    const id = req.body.id;
    const config = req.body.config;

    await pool.query(
      "INSERT INTO games (id, config) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET config=$2",
      [id, config]
    );

    res.json({ ok: true, id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "DB save failed" });
  }
});

// ✅ Load game config
app.get("/game/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query("SELECT config FROM games WHERE id=$1", [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Game not found" });

    res.json(result.rows[0].config);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log("✅ Backend running on port", PORT)
);
