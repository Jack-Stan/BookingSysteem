import nodemailer from 'nodemailer'
import type { Booking } from '../data/store'

function prettyServices(s?: string[]) {
    if (!s || s.length === 0) return '-'
    return s.join(', ')
}

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const FROM = process.env.EMAIL_FROM || SMTP_USER || 'no-reply@example.com'

let transporter: nodemailer.Transporter | null = null
if (SMTP_HOST && SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
}

async function sendBookingConfirmation(b: Booking) {
    const subject = `Bevestiging reservering ${b.date} ${b.time}`
    const text = `Beste ${b.name},\n\nJe reservering op ${b.date} om ${b.time} is bevestigd.\n\nGeselecteerde behandelingen: ${prettyServices(b.services)}\n\nGroeten,\nSilke Beauty`
    if (!transporter) {
        console.log('[email] Email not configured; would send:', { to: b.email, subject })
        return
    }
    try {
        const info = await transporter.sendMail({ from: FROM, to: b.email, subject, text })
        console.log('[email] Booking confirmation sent to', b.email, '(id:', info.messageId, ')')
    } catch (e) {
        console.error('[email] Failed to send confirmation:', (e as any)?.message || e)
        // Don't re-throw — booking is already saved, just log the email error
    }
}

export default { sendBookingConfirmation }
