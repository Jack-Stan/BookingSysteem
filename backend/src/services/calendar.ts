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

// Service account support (preferred for server-to-server production)
// Provide either a JSON string in GOOGLE_SERVICE_ACCOUNT or a path in GOOGLE_SERVICE_ACCOUNT_FILE
import fs from 'fs'
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT || ''
const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || ''

let oauth2Client: any = null
let serviceAuth: any = null
if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
    oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT)
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })
}

// Try service account
try {
    let sa: any = null
    if (SERVICE_ACCOUNT_JSON) sa = JSON.parse(SERVICE_ACCOUNT_JSON)
    else if (SERVICE_ACCOUNT_FILE && fs.existsSync(SERVICE_ACCOUNT_FILE)) sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'))

    if (sa && sa.client_email && sa.private_key) {
        // create a JWT client
        serviceAuth = new google.auth.JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: ['https://www.googleapis.com/auth/calendar']
        } as any)
        console.log(`[calendar] Service account initialized: ${sa.client_email}`)
    }
} catch (e) {
    console.warn('[calendar] Failed to initialize Google service account auth', e)
}

// Log configuration status on module load
console.log(`[calendar] Configuration:`)
console.log(`  - CALENDAR_ID: ${CALENDAR_ID || '(not set)'}`)
console.log(`  - OAuth configured: ${!!(oauth2Client)}`)
console.log(`  - Service account configured: ${!!(serviceAuth)}`)


async function createEvent(b: Booking) {
    const authClient = serviceAuth ?? oauth2Client
    if (!authClient || !CALENDAR_ID) {
        console.log('[calendar] Google Calendar not configured; would create event for', b)
        return
    }
    try {
        const calendar = google.calendar({ version: 'v3', auth: authClient })
        // Parse the date and time
        const [yyyy, mm, dd] = b.date.split('-').map(Number)
        const [hh, min] = b.time.split(':').map(Number)
        
        // Create start time in local timezone (Brussels/Europe)
        const startDate = new Date(yyyy, mm - 1, dd, hh, min, 0)
        const endDate = new Date(startDate.getTime() + 90 * 60 * 1000) // +90 minutes (1.5 hours)
        
        const event = {
            summary: `Reservering - ${b.name}`,
            description: `Naam: ${b.name}\nTel: ${b.phone || '-'}\nE-mail: ${b.email}\nBehandelingen: ${b.services && b.services.length ? b.services.join(', ') : '-'}`,
            start: { 
                dateTime: startDate.toISOString(),
                timeZone: 'Europe/Brussels'
            },
            end: { 
                dateTime: endDate.toISOString(),
                timeZone: 'Europe/Brussels'
            }
        }
        const result = await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: event })
        console.log(`[calendar] Created event: ${result.data.id}`)
    } catch (e) {
        console.error('[calendar] Failed to create event:', (e as any)?.message || e)
    }
}

async function listEventsForDate(date: string) {
    const authClient = serviceAuth ?? oauth2Client
    if (!authClient || !CALENDAR_ID) {
        // Not configured — return empty array so availability is unchanged
        return []
    }
    // simple in-memory cache to reduce API calls in production (TTL in ms)
    const TTL = 60 * 1000 // 60s
    const key = `cal:${CALENDAR_ID}:${date}`
    // attach cache to globalThis with a typed holder to satisfy TypeScript
    type CalCache = Map<string, { ts: number, items: any[] }>
    const holder = (globalThis as any) as { __calCache?: CalCache }
    if (!holder.__calCache) holder.__calCache = new Map<string, { ts: number, items: any[] }>()
    const cache: CalCache = holder.__calCache
    const cached = cache.get(key)
    if (cached && Date.now() - cached.ts < TTL) return cached.items

    try {
        const calendar = google.calendar({ version: 'v3', auth: authClient })
        const timeMin = new Date(`${date}T00:00:00`).toISOString()
        const timeMax = new Date(`${date}T23:59:59`).toISOString()
        console.log(`[calendar] Fetching events for ${date} from calendar ${CALENDAR_ID}`)
        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime'
        })
        const items = res.data.items || []
        console.log(`[calendar] Found ${items.length} events on ${date}`)
        cache.set(key, { ts: Date.now(), items })
        return items
    } catch (e) {
        const errMsg = (e as any)?.message || String(e)
        const errCode = (e as any)?.code || (e as any)?.status || '(unknown)'
        console.error(`[calendar] Error fetching events (code ${errCode}): ${errMsg}`)
        // Log full error for debugging
        if ((e as any)?.errors) {
            console.error('[calendar] Error details:', JSON.stringify((e as any).errors, null, 2))
        }
        throw e
    }
}

export default { createEvent, listEventsForDate }
