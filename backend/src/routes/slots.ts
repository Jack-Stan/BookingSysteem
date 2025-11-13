import { Router, Request, Response } from 'express'
import { getBookingsForDate, countBookingsForSlot } from '../data/store'
import calendarService from '../services/calendar'

const router = Router()

/**
 * Generate 90-minute slots within a given time window.
 * Slots start every 30 minutes but are 90 minutes long.
 */
function generateSlotsInWindow(startHour: number, startMin: number, endHour: number, endMin: number): string[] {
    const slots: string[] = []
    let currentMin = startMin
    let currentHour = startHour
    
    const endTotalMin = endHour * 60 + endMin
    
    while (currentHour * 60 + currentMin + 90 <= endTotalMin) {
        slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`)
        currentMin += 30
        if (currentMin >= 60) {
            currentMin -= 60
            currentHour += 1
        }
    }
    
    return slots
}

// capacity per slot (1 person per slot)
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || '1')

router.get('/', async (req: Request, res: Response) => {
    try {
        const date = String(req.query.date || '')
        if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' })

        // fetch calendar events for the date (if configured)
        let calendarEvents: any[] = []
        try {
            calendarEvents = await calendarService.listEventsForDate(date)
        } catch (e) {
            console.warn('[slots] Calendar fetch failed; ignoring calendar for availability calculation', (e as any)?.message)
        }

        // Separate availability events from booking events
        const availabilityEvents = calendarEvents.filter(ev => {
            const title = (ev.summary || '').toLowerCase()
            const desc = (ev.description || '').toLowerCase()
            return title.includes('work') || title.includes('beschikbaar') || 
                   desc.includes('work') || desc.includes('beschikbaar') ||
                   title.includes('available') || desc.includes('available')
        })

        // Booking/blocking events are those that are NOT availability events
        const bookingEvents = calendarEvents.filter(ev => !availabilityEvents.includes(ev))
        
        console.log(`[slots] Date ${date}: ${calendarEvents.length} total events, ${availabilityEvents.length} availability, ${bookingEvents.length} bookings`)
        
        // Generate slots based on availability events
        let slotsArr: string[] = []
        
        if (availabilityEvents.length > 0) {
            // Use first availability event to determine working hours
            const firstAvailability = availabilityEvents[0]
            const sStr = firstAvailability.start?.dateTime ?? firstAvailability.start?.date
            const eStr = firstAvailability.end?.dateTime ?? firstAvailability.end?.date
            
            if (sStr && eStr) {
                const startDt = new Date(sStr)
                const endDt = new Date(eStr)
                
                console.log(`[slots]   - Using availability: ${firstAvailability.summary} (${startDt.toISOString()} to ${endDt.toISOString()})`)
                
                slotsArr = generateSlotsInWindow(
                    startDt.getHours(),
                    startDt.getMinutes(),
                    endDt.getHours(),
                    endDt.getMinutes()
                )
                
                console.log(`[slots]   - Generated ${slotsArr.length} slots: ${slotsArr.join(', ')}`)
            }
        } else {
            console.log(`[slots]   - No availability event found; returning empty slots`)
        }
        
        const result = await Promise.all(slotsArr.map(async time => {
            const takenFromDb = await countBookingsForSlot(date, time)

            // Calculate slot time (90-minute slot)
            const [hh, mm] = time.split(':').map(Number)
            const slotStart = new Date(`${date}T${time}:00`)
            const slotEnd = new Date(slotStart.getTime() + 90 * 60 * 1000)

            // Count booking events that overlap this slot
            const takenFromCalendar = bookingEvents.filter(ev => {
                const sStr = ev.start?.dateTime ?? ev.start?.date ?? null
                const eStr = ev.end?.dateTime ?? ev.end?.date ?? null
                if (!sStr || !eStr) return false
                const s = new Date(sStr)
                const e = new Date(eStr)
                return s < slotEnd && e > slotStart
            }).length

            const available = Math.max(0, SLOT_CAPACITY - (takenFromDb + takenFromCalendar))
            return { time, available }
        }))
        
        res.json(result)
    } catch (e) {
        console.error('[slots] Unexpected error:', (e as any)?.message || e)
        res.status(500).json({ message: 'Internal server error' })
    }
})

export default router
