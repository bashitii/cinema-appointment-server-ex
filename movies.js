import express from "express";
import pool from "./db.js";
import { requireAdmin, verifyToken } from "./auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { search = "", genre = "", status = "" } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM movies
       WHERE title ILIKE $1
         AND ($2 = '' OR genre = $2)
         AND ($3 = '' OR status = $3)
       ORDER BY movie_id`,
      [`%${search}%`, genre, status]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load movies." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM movies WHERE movie_id = $1", [req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: "Movie not found." });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Could not load the movie." });
  }
});

router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const { title, description, genre, duration, releaseDate, posterUrl, status } = req.body;

  if (!title?.trim() || !description?.trim() || !genre?.trim() || !duration) {
    return res.status(400).json({ message: "Title, description, genre, and duration are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO movies (title, description, genre, duration, release_date, poster_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title.trim(), description.trim(), genre.trim(), duration, releaseDate || null, posterUrl || null, status || "now_showing"]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not create the movie." });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { title, description, genre, duration, releaseDate, posterUrl, status } = req.body;

  if (!title?.trim() || !description?.trim() || !genre?.trim() || !duration) {
    return res.status(400).json({ message: "Title, description, genre, and duration are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE movies
       SET title = $1, description = $2, genre = $3, duration = $4,
           release_date = $5, poster_url = $6, status = $7
       WHERE movie_id = $8 RETURNING *`,
      [title.trim(), description.trim(), genre.trim(), duration, releaseDate || null, posterUrl || null, status || "now_showing", req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Movie not found." });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not update the movie." });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM movies WHERE movie_id = $1 RETURNING movie_id", [req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: "Movie not found." });
    }

    res.json({ message: "Movie deleted." });
  } catch {
    res.status(400).json({ message: "This movie cannot be deleted while it has showtimes." });
  }
});

export default router;

