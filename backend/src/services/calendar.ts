import { google } from 'googleapis'
import type { Booking } from '../data/store'

/**
 * This service will try to create a Google Calendar event if OAuth credentials
 * are provided via environment variables. To use it, set:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 * - GOOGLE_CALENDAR_ID
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT = process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID

let oauth2Client: any = null
if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
    oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT)
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })
}

async function createEvent(b: Booking) {
    if (!oauth2Client || !CALENDAR_ID) {
        console.log('Google Calendar not configured; would create event for', b)
        return
    }
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const start = `${b.date}T${b.time}:00`
    // default: 1 hour event (60 minutes)
    const [hh, mm] = b.time.split(':').map(Number)
    const endDate = new Date(Date.UTC(Number(b.date.split('-')[0]), Number(b.date.split('-')[1]) - 1, Number(b.date.split('-')[2]), hh, mm + 60))
    const event = {
        summary: `Reservering - ${b.name}`,
        description: `Naam: ${b.name}\nTel: ${b.phone || '-'}\nE-mail: ${b.email}\nBehandelingen: ${b.services && b.services.length ? b.services.join(', ') : '-'}`,
        start: { dateTime: start },
        end: { dateTime: endDate.toISOString() }
    }
    await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: event })
}

export default { createEvent }
