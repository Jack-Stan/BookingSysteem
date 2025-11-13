import express from 'express'
import cors from 'cors'
import bookingsRouter from './routes/bookings'
import slotsRouter from './routes/slots'
import adminRouter from './routes/admin'
import { startCleanupScheduler, initializeFirestore } from './data/store'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/bookings', bookingsRouter)
app.use('/api/slots', slotsRouter)
app.use('/api/admin', adminRouter)

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(PORT, () => {
    console.log(`Booking backend listening on http://localhost:${PORT}`)

    // Initialize Firestore early (logs will indicate success or fallback to in-memory)
    try {
        initializeFirestore()
    } catch (e) {
        console.error('Error during Firestore initialization', e)
    }

    // Start the daily cleanup of old bookings (runs immediately and then daily)
    try {
        startCleanupScheduler()
    } catch (e) {
        console.error('Failed to start cleanup scheduler', e)
    }
})
