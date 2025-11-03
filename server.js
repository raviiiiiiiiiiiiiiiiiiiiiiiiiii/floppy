import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { v4 as uuid } from "uuid";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // Allow base64 images

// ✅ PostgreSQL connection via DATABASE_URL env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Test root
app.get("/", (req, res) => {
  res.send("✅ Floppy Game API Running");
});

// ✅ Save Game
app.post("/api/save", async (req, res) => {
  try {
    const id = uuid();
    const { player, pipe, bg, bgm, dead, goImg, goText } = req.body;

    await pool.query(
      `INSERT INTO games (id, config)
       VALUES ($1, $2)`,
      [id, {
        player,
        pipe,
        bg,
        bgm,
        dead,
        goImg,
        goText
      }]
    );

    res.json({ success: true, id });
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Load Game
app.get("/api/game/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT config FROM games WHERE id=$1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Game Not Found" });
    }

    res.json(rows[0].config);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Fetch Failed" });
  }
});

// ✅ Railway port support
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
