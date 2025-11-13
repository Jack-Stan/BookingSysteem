import { Router, Request, Response } from 'express'
import calendarService from '../services/calendar'

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

export default router
