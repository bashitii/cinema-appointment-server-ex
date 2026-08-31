import express from "express";
import pool from "./db.js";
import { requireAdmin, verifyToken } from "./auth.js";

const router = express.Router();

async function appointmentDetails(appointmentId) {
  const appointment = await pool.query(
    `SELECT appointments.*, users.full_name, users.email, movies.title AS movie_title,
            screens.screen_name, showtimes.start_time, showtimes.end_time
     FROM appointments
     JOIN users ON users.user_id = appointments.user_id
     JOIN showtimes ON showtimes.showtime_id = appointments.showtime_id
     JOIN movies ON movies.movie_id = showtimes.movie_id
     JOIN screens ON screens.screen_id = showtimes.screen_id
     WHERE appointments.appointment_id = $1`,
    [appointmentId]
  );

  if (!appointment.rowCount) return null;

  const seats = await pool.query(
    `SELECT seats.seat_id, seats.seat_row, seats.seat_number
     FROM appointment_seats
     JOIN seats ON seats.seat_id = appointment_seats.seat_id
     WHERE appointment_seats.appointment_id = $1
     ORDER BY seats.seat_row, seats.seat_number`,
    [appointmentId]
  );

  return { ...appointment.rows[0], seats: seats.rows };
}

router.get("/showtimes/:showtimeId/seats", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT seats.*,
       EXISTS (
         SELECT 1 FROM appointment_seats
         JOIN appointments ON appointments.appointment_id = appointment_seats.appointment_id
         WHERE appointments.showtime_id = $1
           AND appointments.status = 'confirmed'
           AND appointment_seats.seat_id = seats.seat_id
       ) AS is_booked
       FROM showtimes
       JOIN seats ON seats.screen_id = showtimes.screen_id
       WHERE showtimes.showtime_id = $1
       ORDER BY seats.seat_row, seats.seat_number`,
      [req.params.showtimeId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load seat availability." });
  }
});

router.get("/appointments", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT appointments.appointment_id, appointments.status, appointments.booking_date,
              users.full_name, movies.title AS movie_title, screens.screen_name,
              showtimes.start_time
       FROM appointments
       JOIN users ON users.user_id = appointments.user_id
       JOIN showtimes ON showtimes.showtime_id = appointments.showtime_id
       JOIN movies ON movies.movie_id = showtimes.movie_id
       JOIN screens ON screens.screen_id = showtimes.screen_id
       WHERE ($1 = 'admin' OR appointments.user_id = $2)
       ORDER BY showtimes.start_time DESC`,
      [req.user.role, req.user.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Could not load appointments." });
  }
});

router.get("/appointments/:id", verifyToken, async (req, res) => {
  try {
    const appointment = await appointmentDetails(req.params.id);

    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (req.user.role !== "admin" && appointment.user_id !== req.user.userId) {
      return res.status(403).json({ message: "You cannot view this appointment." });
    }

    res.json(appointment);
  } catch {
    res.status(500).json({ message: "Could not load the appointment." });
  }
});

router.post("/appointments", verifyToken, async (req, res) => {
  const { showtimeId, seatIds } = req.body;

  if (!showtimeId || !Array.isArray(seatIds) || !seatIds.length) {
    return res.status(400).json({ message: "A showtime and at least one seat are required." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const showtime = await client.query("SELECT screen_id FROM showtimes WHERE showtime_id = $1", [showtimeId]);

    if (!showtime.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Showtime not found." });
    }

    const seatResult = await client.query(
      "SELECT seat_id FROM seats WHERE screen_id = $1 AND seat_id = ANY($2::int[]) FOR UPDATE",
      [showtime.rows[0].screen_id, seatIds]
    );

    if (seatResult.rowCount !== seatIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "One or more selected seats do not belong to this screen." });
    }

    const bookedSeats = await client.query(
      `SELECT appointment_seats.seat_id FROM appointment_seats
       JOIN appointments ON appointments.appointment_id = appointment_seats.appointment_id
       WHERE appointments.showtime_id = $1
         AND appointments.status = 'confirmed'
         AND appointment_seats.seat_id = ANY($2::int[])`,
      [showtimeId, seatIds]
    );

    if (bookedSeats.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "One or more selected seats are no longer available." });
    }

    const appointment = await client.query(
      "INSERT INTO appointments (user_id, showtime_id, status) VALUES ($1, $2, 'confirmed') RETURNING appointment_id",
      [req.user.userId, showtimeId]
    );

    await client.query(
      "INSERT INTO appointment_seats (appointment_id, seat_id) SELECT $1, UNNEST($2::int[])",
      [appointment.rows[0].appointment_id, seatIds]
    );
    await client.query("COMMIT");

    res.status(201).json(await appointmentDetails(appointment.rows[0].appointment_id));
  } catch {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Could not create the appointment. Please try again." });
  } finally {
    client.release();
  }
});

async function cancelAppointment(req, res) {
  try {
    const appointment = await appointmentDetails(req.params.id);

    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (req.user.role !== "admin" && appointment.user_id !== req.user.userId) {
      return res.status(403).json({ message: "You cannot cancel this appointment." });
    }
    if (appointment.status === "cancelled") {
      return res.status(400).json({ message: "This appointment is already cancelled." });
    }
    if (new Date(appointment.start_time) <= new Date()) {
      return res.status(400).json({ message: "Appointments cannot be cancelled after the showtime starts." });
    }

    await pool.query("UPDATE appointments SET status = 'cancelled' WHERE appointment_id = $1", [req.params.id]);
    res.json({ message: "Appointment cancelled. The seats are available again." });
  } catch {
    res.status(500).json({ message: "Could not cancel the appointment." });
  }
}

router.put("/appointments/:id/cancel", verifyToken, cancelAppointment);
router.delete("/appointments/:id", verifyToken, cancelAppointment);

router.put("/appointments/:id", verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!["confirmed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Status must be confirmed or cancelled." });
  }

  try {
    const result = await pool.query(
      "UPDATE appointments SET status = $1 WHERE appointment_id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Appointment not found." });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Could not update the appointment." });
  }
});

export default router;

