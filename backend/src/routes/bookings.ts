import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { addBooking, countBookingsForSlot } from '../data/store'
import emailService from '../services/email'
import calendarService from '../services/calendar'

const router = Router()
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || '2')

router.post('/', async (req: Request, res: Response) => {
    const { date, time, name, email, phone } = req.body
    if (!date || !time || !name || !email) return res.status(400).json({ message: 'date, time, name and email are required' })

    const taken = countBookingsForSlot(date, time)
    if (taken >= SLOT_CAPACITY) return res.status(409).json({ message: 'Slot vol' })

    const booking = { id: uuid(), date, time, name, email, phone }
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
