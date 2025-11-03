import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
db.connect()
  .then(() => console.log("✅ Connected to NeonDB"))
  .catch((err) => console.error("❌ DB Connect Error:", err));

app.post("/api/save", async (req, res) => {
  try {
    const { player, pipe, bg, bgm, dead, goImg, goText } = req.body;

    const result = await db.query(
      `INSERT INTO floppy_games (player, pipe, bg, bgm, dead, goImg, goText)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [player, pipe, bg, bgm, dead, goImg, goText]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

app.get("/api/game/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM floppy_games WHERE id=$1`,
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Railway will use PORT env var
app.listen(process.env.PORT || 8080, () =>
  console.log("✅ Server running")
);
