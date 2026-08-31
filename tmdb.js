import express from "express";

const router = express.Router();
const baseUrl = "https://api.themoviedb.org/3";

async function tmdbRequest(path) {
  if (!process.env.TMDB_API_KEY) {
    throw new Error("TMDB key is missing");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TMDB request failed");
  }

  return response.json();
}

router.get("/search", async (req, res) => {
  const { query } = req.query;

  if (!query?.trim()) {
    return res.status(400).json({ message: "A movie search term is required." });
  }

  try {
    const data = await tmdbRequest(`/search/movie?query=${encodeURIComponent(query.trim())}`);
    const movies = data.results.map((movie) => ({
      tmdbId: movie.id,
      title: movie.title,
      description: movie.overview,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      rating: movie.vote_average,
    }));
    res.json(movies);
  } catch {
    res.status(503).json({ message: "TMDB is unavailable. Please try again later." });
  }
});

router.get("/movie/:id", async (req, res) => {
  try {
    const movie = await tmdbRequest(`/movie/${req.params.id}`);
    res.json({
      tmdbId: movie.id,
      title: movie.title,
      description: movie.overview,
      genre: movie.genres.map((genre) => genre.name).join(", "),
      duration: movie.runtime,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      rating: movie.vote_average,
    });
  } catch {
    res.status(503).json({ message: "TMDB is unavailable. Please try again later." });
  }
});

export default router;

