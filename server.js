import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" })); // allow images/music base64

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_ROn5BW1Asgkt@ep-round-breeze-a18e82xs-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

// Save game
app.post("/api/save", async (req, res) => {
  const { gameHtml } = req.body;
  if (!gameHtml) return res.status(400).json({ error: "Missing gameHtml" });

  const result = await pool.query(
    "INSERT INTO games (game_data) VALUES ($1) RETURNING id",
    [gameHtml]
  );

  return res.json({ id: result.rows[0].id });
});

// Load game by ID
app.get("/game/:id", async (req, res) => {
  const id = req.params.id;
  const result = await pool.query("SELECT game_data FROM games WHERE id=$1", [id]);
  if (result.rowCount === 0) return res.send("Game Not Found");

  res.set("Content-Type", "text/html");
  res.send(result.rows[0].game_data);
});

app.listen(8080, () =>
  console.log("✅ Server running on 8080")
);
