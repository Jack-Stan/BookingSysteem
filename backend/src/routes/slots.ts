import { Router, Request, Response } from 'express'
import { getBookingsForDate, countBookingsForSlot } from '../data/store'

const router = Router()

// generate slots for a date (09:00 - 17:00 every 30m)
function generateSlots() {
    const slots: string[] = []
    for (let h = 9; h < 17; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`)
        slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    slots.push('17:00')
    return slots
}

// capacity per slot (changeable)
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || '2')

router.get('/', (req: Request, res: Response) => {
    const date = String(req.query.date || '')
    if (!date) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' })

    const slots = generateSlots()
    const result = slots.map(time => {
        const taken = countBookingsForSlot(date, time)
        return { time, available: Math.max(0, SLOT_CAPACITY - taken) }
    })
    res.json(result)
})

export default router
