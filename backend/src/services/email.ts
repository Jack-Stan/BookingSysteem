import nodemailer from 'nodemailer'
import type { Booking } from '../data/store'

function prettyServices(s?: string[]) {
    if (!s || s.length === 0) return '-'
    return s.join(', ')
}

// SendGrid configuration (preferred)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@silkebeauty.com'
const SILKE_EMAIL = process.env.SILKE_EMAIL || 'Silkeschroven1@gmail.com'

// Fallback: SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

let transporter: nodemailer.Transporter | null = null
let usingSendGrid = false

// Try SendGrid first
if (SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
            user: 'apikey',
            pass: SENDGRID_API_KEY
        }
    })
    usingSendGrid = true
    console.log('[email] SendGrid configured')
} else if (SMTP_HOST && SMTP_USER) {
    // Fallback to SMTP
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
    console.log('[email] SMTP configured as fallback')
}

async function sendBookingConfirmation(b: Booking) {
    const subject = `✓ Bevestiging reservering ${b.date} ${b.time}`
    const text = `Beste ${b.name},

Bedankt voor je reservering! Je afspraak is geconfirmeerd.

📅 Datum: ${b.date}
🕐 Tijd: ${b.time}
⏱️ Duur: 1,5 uur
💇 Behandelingen: ${prettyServices(b.services)}

Als je vragen hebt of je afspraak wilt verplaatsen, neem dan contact op.

Groeten,
Silke Beauty ✨`

    if (!transporter) {
        console.log('[email] Email not configured; would send to:', { to: b.email, subject })
        return
    }
    try {
        const info = await transporter.sendMail({ 
            from: FROM_EMAIL, 
            to: b.email, 
            subject, 
            text 
        })
        console.log('[email] Booking confirmation sent to', b.email, '(id:', info.messageId, ')')
    } catch (e) {
        console.error('[email] Failed to send customer confirmation:', (e as any)?.message || e)
    }
}

async function sendBookingNotificationToSilke(b: Booking) {
    const subject = `📌 Nieuwe boeking: ${b.name} - ${b.date} ${b.time}`
    const text = `Hallo Silke,

Je hebt een nieuwe boeking ontvangen!

👤 Klant: ${b.name}
📧 Email: ${b.email}
📱 Telefoon: ${b.phone || '(niet opgegeven)'}
📅 Datum: ${b.date}
🕐 Tijd: ${b.time}
⏱️ Duur: 1,5 uur
💇 Behandelingen:
${b.services && b.services.length > 0 ? b.services.map(s => `  • ${s}`).join('\n') : '  (geen opgegeven)'}

---
Silke Beauty Booking System`

    if (!transporter) {
        console.log('[email] Email not configured; would send to:', { to: SILKE_EMAIL, subject })
        return
    }
    try {
        const info = await transporter.sendMail({ 
            from: FROM_EMAIL, 
            to: SILKE_EMAIL, 
            subject, 
            text 
        })
        console.log('[email] Booking notification sent to Silke (id:', info.messageId, ')')
    } catch (e) {
        console.error('[email] Failed to send Silke notification:', (e as any)?.message || e)
    }
}

export default { sendBookingConfirmation, sendBookingNotificationToSilke }
