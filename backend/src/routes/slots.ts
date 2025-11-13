import { Router, Request, Response } from 'express'
import { getBookingsForDate, countBookingsForSlot } from '../data/store'
import calendarService from '../services/calendar'

const router = Router()

// generate slots for a date (90-minute appointments; last start time allows 90 min before end-of-day)
function generateSlots() {
    const slots: string[] = []
    // appointments are 90 minutes (1.5 hours); last start is 14:30 for a 16:00 end
    for (let h = 9; h <= 14; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`)
        if (h < 14) slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
}

// capacity per slot (1 person per slot)
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || '1')

router.get('/', async (req: Request, res: Response) => {
    try {
        const date = String(req.query.date || '')
        if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' })

        const slotsArr = generateSlots()
        // fetch calendar events for the date (if configured)
        let calendarEvents: any[] = []
        try {
            calendarEvents = await calendarService.listEventsForDate(date)
        } catch (e) {
            console.warn('[slots] Calendar fetch failed; ignoring calendar for availability calculation', (e as any)?.message)
            // Fall back to empty calendar events — DB bookings alone will determine availability
        }
        
        // Separate availability events (for filtering what's bookable) from booking events (for reducing capacity)
        // Availability events typically have "work" or "beschikbaar" in title/description, or are all-day events, or marked with a specific keyword
        const availabilityEvents = calendarEvents.filter(ev => {
            const title = (ev.summary || '').toLowerCase()
            const desc = (ev.description || '').toLowerCase()
            // Look for keywords indicating this is an availability/working hours event
            return title.includes('work') || title.includes('beschikbaar') || 
                   desc.includes('work') || desc.includes('beschikbaar') ||
                   title.includes('available') || desc.includes('available')
        })
        
        // Booking/blocking events are those that are NOT availability events
        const bookingEvents = calendarEvents.filter(ev => !availabilityEvents.includes(ev))
        
        const result = await Promise.all(slotsArr.map(async time => {
            const takenFromDb = await countBookingsForSlot(date, time)
            
            // Calculate slot time (90-minute slot)
            const [hh, mm] = time.split(':').map(Number)
            const slotStart = new Date(`${date}T${time}:00`)
            const slotEnd = new Date(slotStart.getTime() + 90 * 60 * 1000) // 90 minutes
            
            // Check if this slot falls within any availability window
            let isAvailable = availabilityEvents.length === 0 // If no availability events, assume always available
            if (availabilityEvents.length > 0) {
                isAvailable = availabilityEvents.some(av => {
                    const sStr = av.start?.dateTime ?? av.start?.date ?? null
                    const eStr = av.end?.dateTime ?? av.end?.date ?? null
                    if (!sStr || !eStr) return false
                    const s = new Date(sStr)
                    const e = new Date(eStr)
                    // Slot must START within availability window (i.e., start >= availability start AND start < availability end)
                    return slotStart >= s && slotStart < e
                })
            }
            
            // Count booking events that overlap this slot (reduces available capacity)
            const takenFromCalendar = bookingEvents.filter(ev => {
                const sStr = ev.start?.dateTime ?? ev.start?.date ?? null
                const eStr = ev.end?.dateTime ?? ev.end?.date ?? null
                if (!sStr || !eStr) return false
                const s = new Date(sStr)
                const e = new Date(eStr)
                return s < slotEnd && e > slotStart
            }).length
            
            const available = isAvailable ? Math.max(0, SLOT_CAPACITY - (takenFromDb + takenFromCalendar)) : 0
            return { time, available }
        }))
        
        res.json(result)
    } catch (e) {
        console.error('[slots] Unexpected error:', (e as any)?.message || e)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router
