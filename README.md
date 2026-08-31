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

Feature endpoints will be added directly to `server.js` in small, understandable steps.
