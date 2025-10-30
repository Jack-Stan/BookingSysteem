import express from 'express'
import cors from 'cors'
import bookingsRouter from './routes/bookings'
import slotsRouter from './routes/slots'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/bookings', bookingsRouter)
app.use('/api/slots', slotsRouter)

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(PORT, () => {
    console.log(`Booking backend listening on http://localhost:${PORT}`)
})
