import express from "express";
import pool from "./db.js";
import { requireAdmin, verifyToken } from "./auth.js";

const router = express.Router();

router.get("/screens", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM screens ORDER BY screen_id");
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load screens." });
  }
});

router.post("/screens", verifyToken, requireAdmin, async (req, res) => {
  const { screenName, capacity } = req.body;

  if (!screenName?.trim() || !capacity) {
    return res.status(400).json({ message: "Screen name and capacity are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO screens (screen_name, capacity) VALUES ($1, $2) RETURNING *",
      [screenName.trim(), capacity]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not create the screen." });
  }
});

router.put("/screens/:id", verifyToken, requireAdmin, async (req, res) => {
  const { screenName, capacity } = req.body;

  try {
    const result = await pool.query(
      "UPDATE screens SET screen_name = $1, capacity = $2 WHERE screen_id = $3 RETURNING *",
      [screenName?.trim(), capacity, req.params.id]
    );

    if (!result.rowCount) return res.status(404).json({ message: "Screen not found." });
    res.json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not update the screen." });
  }
});

router.delete("/screens/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM screens WHERE screen_id = $1 RETURNING screen_id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: "Screen not found." });
    res.json({ message: "Screen deleted." });
  } catch {
    res.status(400).json({ message: "This screen cannot be deleted while it has showtimes." });
  }
});

router.get("/screens/:screenId/seats", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seats WHERE screen_id = $1 ORDER BY seat_row, seat_number",
      [req.params.screenId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load seats." });
  }
});

router.post("/seats", verifyToken, requireAdmin, async (req, res) => {
  const { screenId, seatNumber, seatRow } = req.body;

  if (!screenId || !seatNumber?.trim() || !seatRow?.trim()) {
    return res.status(400).json({ message: "Screen, row, and seat number are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO seats (screen_id, seat_number, seat_row) VALUES ($1, $2, $3) RETURNING *",
      [screenId, seatNumber.trim(), seatRow.trim().toUpperCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not create the seat. It may already exist." });
  }
});

router.put("/seats/:id", verifyToken, requireAdmin, async (req, res) => {
  const { screenId, seatNumber, seatRow } = req.body;

  try {
    const result = await pool.query(
      "UPDATE seats SET screen_id = $1, seat_number = $2, seat_row = $3 WHERE seat_id = $4 RETURNING *",
      [screenId, seatNumber?.trim(), seatRow?.trim().toUpperCase(), req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Seat not found." });
    res.json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not update the seat." });
  }
});

router.delete("/seats/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM seats WHERE seat_id = $1 RETURNING seat_id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: "Seat not found." });
    res.json({ message: "Seat deleted." });
  } catch {
    res.status(400).json({ message: "This seat cannot be deleted while it is used by an appointment." });
  }
});

router.get("/showtimes", async (req, res) => {
  const { movieId = "", date = "" } = req.query;

  try {
    const result = await pool.query(
      `SELECT showtimes.*, movies.title AS movie_title, screens.screen_name
       FROM showtimes
       JOIN movies ON movies.movie_id = showtimes.movie_id
       JOIN screens ON screens.screen_id = showtimes.screen_id
       WHERE ($1 = '' OR showtimes.movie_id = $1::integer)
         AND ($2 = '' OR DATE(showtimes.start_time) = $2::date)
       ORDER BY showtimes.start_time`,
      [movieId, date]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load showtimes." });
  }
});

router.get("/showtimes/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT showtimes.*, movies.title AS movie_title, screens.screen_name
       FROM showtimes JOIN movies ON movies.movie_id = showtimes.movie_id
       JOIN screens ON screens.screen_id = showtimes.screen_id
       WHERE showtime_id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Showtime not found." });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Could not load the showtime." });
  }
});

async function saveShowtime(req, res, isEdit) {
  const { movieId, screenId, startTime, endTime } = req.body;

  if (!movieId || !screenId || !startTime || !endTime) {
    return res.status(400).json({ message: "Movie, screen, start time, and end time are required." });
  }

  try {
    const result = isEdit
      ? await pool.query("UPDATE showtimes SET movie_id = $1, screen_id = $2, start_time = $3, end_time = $4 WHERE showtime_id = $5 RETURNING *", [movieId, screenId, startTime, endTime, req.params.id])
      : await pool.query("INSERT INTO showtimes (movie_id, screen_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *", [movieId, screenId, startTime, endTime]);

    if (!result.rowCount) return res.status(404).json({ message: "Showtime not found." });
    res.status(isEdit ? 200 : 201).json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not save the showtime. Ensure the end time is after the start time." });
  }
}

router.post("/showtimes", verifyToken, requireAdmin, (req, res) => saveShowtime(req, res, false));
router.put("/showtimes/:id", verifyToken, requireAdmin, (req, res) => saveShowtime(req, res, true));

router.delete("/showtimes/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM showtimes WHERE showtime_id = $1 RETURNING showtime_id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: "Showtime not found." });
    res.json({ message: "Showtime deleted." });
  } catch {
    res.status(400).json({ message: "This showtime cannot be deleted while it has appointments." });
  }
});

export default router;

