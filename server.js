import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "./auth.js";
import cinemaRouter from "./cinema.js";
import moviesRouter from "./movies.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api", cinemaRouter);
app.use("/api/movies", moviesRouter);

app.get("/api/health", (req, res) => {
  res.json({ message: "Cinema Appointment API is running." });
});

app.listen(port, () => {
  console.log(`Cinema Appointment API is running on port ${port}.`);
});
