# Cinema Appointment Server

Simple Express and PostgreSQL backend for the Cinema Appointment System.

## Files

- `server.js` - Express server and API endpoints.
- `db.js` - PostgreSQL connection.
- `schema.sql` - Database tables from the final ERD.
- `seed.sql` - Initial cinema data.

## Setup

1. Copy `.env.example` to `.env` and set your PostgreSQL details.
2. Create a database called `cinema_appointment_db`.
3. Run `schema.sql`, then `seed.sql`, in PostgreSQL.
4. Run `npm install`.
5. Run `npm run dev`.

## Current endpoint

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Confirms that the API is running. |

## API groups

- `/api/auth` - register, login, and profile.
- `/api/movies` - public movie browsing and admin movie CRUD.
- `/api/screens`, `/api/seats`, `/api/showtimes` - cinema management.
- `/api/appointments` - customer bookings and admin appointment management.
- `/api/tmdb` - TMDB movie search and details.

Add a TMDB read-access token to `TMDB_API_KEY` in `.env` before using the TMDB endpoints.

## Endpoints

Protected endpoints require this request header:

```text
Authorization: Bearer your_jwt_token
```

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a customer account. |
| POST | `/api/auth/login` | Public | Login and receive a JWT. |
| GET / PUT | `/api/auth/profile` | Logged-in user | Read or update the current profile. |
| GET | `/api/movies` | Public | Browse, search, and filter movies. |
| GET | `/api/movies/:id` | Public | Read one movie. |
| POST / PUT / DELETE | `/api/movies/:id` | Admin | Manage movies. |
| GET | `/api/screens` | Public | List screens. |
| POST / PUT / DELETE | `/api/screens/:id` | Admin | Manage screens. |
| GET | `/api/screens/:screenId/seats` | Public | List seats in a screen. |
| POST / PUT / DELETE | `/api/seats/:id` | Admin | Manage seats. |
| GET | `/api/showtimes` | Public | List showtimes. |
| GET | `/api/showtimes/:id` | Public | Read one showtime. |
| POST / PUT / DELETE | `/api/showtimes/:id` | Admin | Manage showtimes. |
| GET | `/api/showtimes/:showtimeId/seats` | Public | Get live seat availability for a showtime. |
| GET / POST | `/api/appointments` | User/Admin | List appointments or create a booking. |
| GET | `/api/appointments/:id` | Owner/Admin | Read an appointment. |
| PUT | `/api/appointments/:id/cancel` | Owner/Admin | Cancel an eligible appointment. |
| PUT | `/api/appointments/:id` | Admin | Change appointment status. |
| GET | `/api/tmdb/search?query=...` | Public | Search TMDB movies. |
| GET | `/api/tmdb/movie/:id` | Public | Read TMDB movie details. |

Feature endpoints will be added directly to `server.js` in small, understandable steps.
