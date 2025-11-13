import { v4 as uuid } from 'uuid'

export type Booking = {
    id: string
    date: string // YYYY-MM-DD
    time: string // HH:MM
    name: string
    email: string
    phone?: string
    services?: string[]
}

// We'll attempt to initialize Firestore via firebase-admin. If configuration
// is missing, we gracefully fall back to an in-memory store to keep local dev easy.
// keep db untyped to avoid depending on firebase-admin types at compile time
let db: any = null
let useInMemory = true
let firestoreInitialized: boolean | null = null // null = not attempted, true = success, false = failed
const bookingsByDate = new Map<string, Booking[]>()

// Scheduler handle for daily cleanup
let cleanupIntervalHandle: NodeJS.Timeout | null = null

/**
 * Initialize Firestore on first call. Subsequent calls check firestoreInitialized flag.
 * Logs success/failure clearly so we can diagnose issues.
 */
function tryInitFirestore() {
    // If we've already tried initialization, don't try again — use cached result
    if (firestoreInitialized !== null) return

    console.log('[store] Attempting Firestore initialization...')
    try {
        // lazy import so startup still works even if firebase-admin isn't installed
        // (package.json now includes firebase-admin so in production it will run)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const admin = require('firebase-admin')
        if (!admin.apps || admin.apps.length === 0) {
            // Check for credentials in order of preference
            const hasSvc = !!process.env.FIREBASE_SERVICE_ACCOUNT
            const hasFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_SERVICE_ACCOUNT_FILE
            const hasProjectEnv = !!process.env.GCLOUD_PROJECT || !!process.env.GOOGLE_CLOUD_PROJECT || !!process.env.FIREBASE_PROJECT_ID

            console.log(`[store] Credentials check: hasSvc=${hasSvc}, hasFile=${hasFile}, hasProjectEnv=${hasProjectEnv}`)

            if (hasSvc) {
                console.log('[store] Using FIREBASE_SERVICE_ACCOUNT env var')
                const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)
                admin.initializeApp({ credential: admin.credential.cert(svc) })
            } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
                console.log(`[store] Using GOOGLE_SERVICE_ACCOUNT_FILE: ${process.env.GOOGLE_SERVICE_ACCOUNT_FILE}`)
                const fs = require('fs')
                const p = process.env.GOOGLE_SERVICE_ACCOUNT_FILE as string
                if (!fs.existsSync(p)) {
                    throw new Error(`File not found: ${p}`)
                }
                const svc = JSON.parse(fs.readFileSync(p, 'utf8'))
                console.log(`[store] Loaded service account with project_id: ${svc.project_id}`)
                admin.initializeApp({ credential: admin.credential.cert(svc) })
            } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || hasProjectEnv) {
                console.log('[store] Using ADC (Application Default Credentials)')
                admin.initializeApp()
            } else {
                throw new Error('No Firestore credentials detected (FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SERVICE_ACCOUNT_FILE, or project env vars missing)')
            }
        }
        db = admin.firestore()
        useInMemory = false
        firestoreInitialized = true
        console.log('[store] ✓ Firestore initialized successfully')
    } catch (e) {
        useInMemory = true
        db = null
        firestoreInitialized = false
        console.warn(`[store] ✗ Firestore initialization failed; using in-memory store. Error: ${(e as any)?.message || e}`)
    }
}

export async function getBookingsForDate(date: string): Promise<Booking[]> {
    tryInitFirestore()
    if (useInMemory) return bookingsByDate.get(date) || []
    const snap = await db!.collection('bookings').where('date', '==', date).get()
    return snap.docs.map((d: any) => d.data() as Booking)
}

export async function addBooking(b: Booking): Promise<void> {
    tryInitFirestore()
    if (useInMemory) {
        const arr = bookingsByDate.get(b.date) || []
        arr.push(b)
        bookingsByDate.set(b.date, arr)
        return
    }
    const id = b.id || uuid()
    await db!.collection('bookings').doc(id).set({ ...b, id })
}

export async function countBookingsForSlot(date: string, time: string): Promise<number> {
    tryInitFirestore()
    if (useInMemory) {
        const arr = bookingsByDate.get(date) || []
        return arr.filter(x => x.time === time).length
    }
    const snap = await db!.collection('bookings').where('date', '==', date).where('time', '==', time).get()
    return snap.size
}

/**
 * Remove bookings older than `months` months. Works for both Firestore and
 * the in-memory fallback. Dates are stored as YYYY-MM-DD strings.
 */
export async function cleanupOldBookings(months = 6): Promise<void> {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)
    const cutoffStr = cutoff.toISOString().slice(0, 10) // YYYY-MM-DD

    if (useInMemory) {
        // Remove from in-memory map
        for (const [date, _arr] of Array.from(bookingsByDate.entries())) {
            if (date < cutoffStr) bookingsByDate.delete(date)
        }
        console.log(`[store] in-memory cleanup removed bookings older than ${cutoffStr}`)
        return
    }

    try {
        const snap = await db.collection('bookings').where('date', '<', cutoffStr).get()
        if (snap.empty) {
            console.log('[store] no old bookings to delete')
            return
        }
        // Batch deletes in chunks to avoid large single writes
        const BATCH_SIZE = 500
        let batch = db.batch()
        let ops = 0
        for (const doc of snap.docs) {
            batch.delete(doc.ref)
            ops++
            if (ops >= BATCH_SIZE) {
                await batch.commit()
                batch = db.batch()
                ops = 0
            }
        }
        if (ops > 0) await batch.commit()
        console.log(`[store] deleted ${snap.size} bookings older than ${cutoffStr}`)
    } catch (e) {
        console.error('[store] cleanupOldBookings error', e)
    }
}

/**
 * Start a scheduled cleanup job: run immediately and then once every 24 hours.
 */
export function startCleanupScheduler(): void {
    if (cleanupIntervalHandle) return
        ; (async () => {
            try {
                await cleanupOldBookings(6)
            } catch (e) {
                console.error('[store] initial cleanup failed', e)
            }
        })()
    const DAY_MS = 24 * 60 * 60 * 1000
    cleanupIntervalHandle = setInterval(() => {
        cleanupOldBookings(6).catch(e => console.error('[store] scheduled cleanup failed', e))
    }, DAY_MS)
}

/**
 * Public export to initialize Firestore early (e.g., on server startup).
 * Can be called multiple times; subsequent calls are no-ops.
 */
export function initializeFirestore(): void {
    tryInitFirestore()
}
