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
const bookingsByDate = new Map<string, Booking[]>()

function tryInitFirestore() {
    if (db !== null) return
    try {
        // lazy import so startup still works even if firebase-admin isn't installed
        // (package.json now includes firebase-admin so in production it will run)
        // Prefer service account provided in FIREBASE_SERVICE_ACCOUNT (JSON string)
        // or rely on GOOGLE_APPLICATION_CREDENTIALS / ADC.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const admin = require('firebase-admin')
        if (!admin.apps || admin.apps.length === 0) {
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
                admin.initializeApp({ credential: admin.credential.cert(svc) })
            } else {
                // initialize with ADC if available (GOOGLE_APPLICATION_CREDENTIALS)
                admin.initializeApp()
            }
        }
        db = admin.firestore()
        useInMemory = false
        console.log('Firestore initialized for bookings store')
    } catch (e) {
        // keep using in-memory store
        useInMemory = true
        db = null
        // 'e' can be unknown; coerce to any when accessing message to satisfy TS
        console.warn('Firestore not configured or failed to initialize; using in-memory store', (e as any)?.message || e)
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
