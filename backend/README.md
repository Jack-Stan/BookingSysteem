Google Calendar integration (production)
-------------------------------------

This project can use a Google Calendar as an additional source of "occupied" time slots so your public availability reflects both bookings made through this app and events in your personal/business calendar.

How it works (server-side)
--------------------------
- The backend will call the Google Calendar API for the requested date and count events that overlap each 1-hour slot (09:00–16:00).
- For each slot we compute: available = SLOT_CAPACITY - (bookingsInDB + calendarEvents). If calendar credentials are not configured the backend falls back to DB-only availability.

Which credentials to provide
-----------------------------
1) Option A (recommended for single-account setups): OAuth2 refresh token for the Google account that owns the calendar
	- Create OAuth 2.0 Client Credentials in Google Cloud Console (Application type: Web application)
	- Using the OAuth flow (OAuth 2.0 Playground is easiest), obtain a REFRESH_TOKEN for the account and the Calendar scope.
	 - Set these environment variables in your backend host:
		 - GOOGLE_CLIENT_ID
		 - GOOGLE_CLIENT_SECRET
	- GOOGLE_REFRESH_TOKEN
	- GOOGLE_CALENDAR_ID (use `primary` or the calendar's ID / email)

2) Option B (server-to-server / more robust): Service account
   - Create a Google Service Account in Google Cloud, generate a JSON key, and share the calendar with the service account's email address.
	- Use the service account key on the server to authenticate without interactive OAuth (this requires sharing the calendar with the service account). If you prefer this approach I can add a service-account auth path.

Security
--------
- Treat CLIENT_SECRET and REFRESH_TOKEN as secrets. Store them in your host's environment variables (Render/Heroku/Cloud Run/VM) or a secure secret store. Do not commit them to source control.

Environment example
-------------------
- You can use a `.env` locally (don't commit it). Example variables (see `.env.example`):

	GOOGLE_CLIENT_ID=...
	GOOGLE_CLIENT_SECRET=...
	GOOGLE_REFRESH_TOKEN=...
	GOOGLE_CALENDAR_ID=primary

Testing after configuration
----------------------------
1) Start backend with env vars configured.
2) Call the slots endpoint (replace date):

```powershell
curl "http://localhost:4000/api/slots?date=2025-11-03" | jq
```

You should see JSON like:

[
	{ "time": "09:00", "available": 2 },
	{ "time": "10:00", "available": 1 },
	...
]

If availability decreases for times that have events in your Google Calendar that day then the integration is working.

Performance and production notes
-------------------------------
- The current implementation polls Google Calendar per request. For most small-volume deployments this is fine. If you expect high traffic, consider:
	- Caching calendar results per date for a short window (e.g. 60s–5min)
	- Using the Calendar `freebusy.query` API which is more efficient for bulk queries
	- Implementing a watch (push notifications) to keep a local cache of busy intervals up-to-date (requires a public HTTPS endpoint for Google to call)

Want me to finish this for you?
-------------------------------
- I can add a `.env.example` to the repo, add the service-account auth path, or implement caching/freebusy as next steps. Tell me which you prefer and I will commit it.
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
