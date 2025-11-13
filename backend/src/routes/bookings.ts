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

    // Note: time validation is done by the /slots endpoint which generates valid slots dynamically
    // based on calendar availability. We trust the frontend to only send times from that list.

    const taken = await countBookingsForSlot(date, time)
    if (taken >= SLOT_CAPACITY) return res.status(409).json({ message: 'Slot vol' })

    const booking = { id: uuid(), date, time, name, email, phone, services }
    await addBooking(booking)

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
