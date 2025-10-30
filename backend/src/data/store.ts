export type Booking = {
    id: string
    date: string // YYYY-MM-DD
    time: string // HH:MM
    name: string
    email: string
    phone?: string
}

// in-memory store: map date -> bookings
const bookingsByDate = new Map<string, Booking[]>()

export function getBookingsForDate(date: string) {
    return bookingsByDate.get(date) || []
}

export function addBooking(b: Booking) {
    const arr = bookingsByDate.get(b.date) || []
    arr.push(b)
    bookingsByDate.set(b.date, arr)
}

export function countBookingsForSlot(date: string, time: string) {
    const arr = getBookingsForDate(date)
    return arr.filter(x => x.time === time).length
}
