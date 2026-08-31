import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Please login first." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Your login session is invalid or expired." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access is required." });
  }

  next();
}

router.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  try {
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (existingUser.rowCount) {
      return res.status(409).json({ message: "An account already uses this email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, 'customer') RETURNING user_id, full_name, email, role",
      [fullName.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    res.status(201).json({ user, token: createToken(user) });
  } catch {
    res.status(500).json({ message: "Could not create the account. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token: createToken(user),
    });
  } catch {
    res.status(500).json({ message: "Could not login. Please try again." });
  }
});

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = $1",
      [req.user.userId]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Could not load the profile." });
  }
});

router.put("/profile", verifyToken, async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    let result;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await pool.query(
        "UPDATE users SET full_name = $1, email = $2, password = $3 WHERE user_id = $4 RETURNING user_id, full_name, email, role",
        [fullName.trim(), email.trim().toLowerCase(), hashedPassword, req.user.userId]
      );
    } else {
      result = await pool.query(
        "UPDATE users SET full_name = $1, email = $2 WHERE user_id = $3 RETURNING user_id, full_name, email, role",
        [fullName.trim(), email.trim().toLowerCase(), req.user.userId]
      );
    }

    res.json(result.rows[0]);
  } catch {
    res.status(400).json({ message: "Could not update the profile. Check that the email is not already used." });
  }
});

export default router;

