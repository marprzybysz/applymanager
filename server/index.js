import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const app = express();
const port = Number(process.env.PORT || 3000);
const { Pool } = pg;

const dbPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "applymanager",
  password: process.env.DB_PASSWORD || "applymanager",
  database: process.env.DB_NAME || "applymanager"
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");

app.use(express.json());

app.get("/api/greet", (req, res) => {
  const name = typeof req.query.name === "string" && req.query.name.trim() ? req.query.name.trim() : "friend";
  res.json({ message: `Hello, ${name}! Node backend is connected.` });
});

app.get("/api/health", async (_req, res) => {
  try {
    const result = await dbPool.query("SELECT NOW() AS now");
    res.json({ ok: true, db: "connected", now: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ ok: false, db: "disconnected", error: String(error) });
  }
});

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`ApplyManager server listening on http://localhost:${port}`);
});
