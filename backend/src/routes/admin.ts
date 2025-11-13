import { Router, Request, Response } from 'express'
import calendarService from '../services/calendar'
import { getBookingsForDate } from '../data/store'

const router = Router()

// Debug endpoint to check calendar auth and sample events for a date
router.get('/calendar', async (req: Request, res: Response) => {
    const date = String(req.query.date || new Date().toISOString().substring(0, 10))
    try {
        const events = await calendarService.listEventsForDate(date)
        res.json({ ok: true, configured: events !== null, count: events.length, events })
    } catch (e: any) {
        res.status(500).json({ ok: false, error: String(e?.message || e) })
    }
})

// Get all bookings for a specific date
router.get('/bookings', async (req: Request, res: Response) => {
    const date = String(req.query.date || '')
    if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' })
    try {
        const bookings = await getBookingsForDate(date)
        res.json(bookings)
    } catch (e: any) {
        res.status(500).json({ message: String(e?.message || e) })
    }
})

// Delete a booking by ID
router.delete('/bookings/:id', async (req: Request, res: Response) => {
    const { id } = req.params
    if (!id) return res.status(400).json({ message: 'booking id required' })
    try {
        // Import here to avoid circular dependency
        const admin = require('firebase-admin')
        const db = admin.firestore()
        await db.collection('bookings').doc(id).delete()
        console.log(`[admin] Deleted booking: ${id}`)
        res.json({ ok: true, message: `Booking ${id} deleted` })
    } catch (e: any) {
        console.error('[admin] Failed to delete booking:', e)
        res.status(500).json({ message: String(e?.message || e) })
    }
})

export default router
