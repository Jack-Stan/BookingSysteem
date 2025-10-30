# Booking Backend

This is a minimal Express + TypeScript backend for the booking system.

Environment variables
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM — for sending confirmation emails (optional)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_CALENDAR_ID — to create calendar events (optional)
- SLOT_CAPACITY — number of bookings allowed per time slot (default 2)

Run locally

1. Install dependencies:

```powershell
cd backend
npm install
```

2. Start dev server:

```powershell
npm run dev
```

Notes
- This backend uses an in-memory store for bookings. For production, replace with a persistent DB.
- Google Calendar integration requires creating OAuth credentials and providing a refresh token. See Google Calendar API docs.
