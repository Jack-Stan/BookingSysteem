import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { addBooking, countBookingsForSlot } from '../data/store'
import emailService from '../services/email'
import calendarService from '../services/calendar'

const router = Router()
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || '2')

router.post('/', async (req: Request, res: Response) => {
    const { date, time, name, email, phone, services } = req.body
    if (!date || !time || !name || !email) return res.status(400).json({ message: 'date, time, name and email are required' })
    if (!Array.isArray(services) || services.length === 0) return res.status(400).json({ message: 'Selecteer ten minste één service' })

    // validate time is one of the allowed hourly slots (09:00 - 16:00)
    const validSlots: string[] = []
    for (let h = 9; h <= 16; h++) validSlots.push(`${String(h).padStart(2, '0')}:00`)
    if (!validSlots.includes(time)) return res.status(400).json({ message: 'Ongeldige tijd. Kies een beschikbaar uurslot.' })

    const taken = countBookingsForSlot(date, time)
    if (taken >= SLOT_CAPACITY) return res.status(409).json({ message: 'Slot vol' })

    const booking = { id: uuid(), date, time, name, email, phone, services }
    addBooking(booking)

        // send confirmation email and create calendar event (don't block failure)
        ; (async () => {
            try {
                await emailService.sendBookingConfirmation(booking)
            } catch (e) {
                console.error('Email error', e)
            }
            try {
                await calendarService.createEvent(booking)
            } catch (e) {
                console.error('Calendar error', e)
            }
        })()

    res.status(201).json({ id: booking.id })
})

export default router
