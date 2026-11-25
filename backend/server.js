const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { pool, initializeDatabase } = require("./db");

const app = express();
const upload = multer({ dest: "/tmp/" });
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/speech/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Audio file is required" });
  try {
    const form = new FormData();
    const audioBuffer = fs.readFileSync(req.file.path);
    form.append("file", new Blob([audioBuffer], { type: req.file.mimetype || "audio/webm" }), req.file.originalname || "audio.webm");
    const response = await fetch(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/transcribe`, {
      method: "POST",
      body: form
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Could not reach the transcription service" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

app.get("/api/transcriptions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transcriptions ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Could not fetch transcriptions" }); }
});

app.get("/api/transcriptions/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transcriptions WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Transcription not found" });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Could not fetch transcription" }); }
});

app.post("/api/transcriptions", async (req, res) => {
  const { title, transcript, language } = req.body;
  if (!transcript || !transcript.trim()) return res.status(400).json({ error: "Transcript is required" });
  try {
    const result = await pool.query(
      "INSERT INTO transcriptions (title, transcript, language) VALUES ($1, $2, $3) RETURNING *",
      [title?.trim() || "Untitled transcription", transcript.trim(), language || "auto"]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Could not save transcription" }); }
});

app.put("/api/transcriptions/:id", async (req, res) => {
  const { title, transcript } = req.body;
  if (!transcript || !transcript.trim()) return res.status(400).json({ error: "Transcript is required" });
  try {
    const result = await pool.query(
      "UPDATE transcriptions SET title=$1, transcript=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *",
      [title?.trim() || "Untitled transcription", transcript.trim(), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Transcription not found" });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: "Could not update transcription" }); }
});

app.delete("/api/transcriptions/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM transcriptions WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Transcription not found" });
    res.json({ message: "Transcription deleted" });
  } catch (error) { res.status(500).json({ error: "Could not delete transcription" }); }
});

const port = process.env.PORT || 5000;
initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Backend running on port ${port}`)))
  .catch(error => { console.error("Database initialization failed:", error); process.exit(1); });
