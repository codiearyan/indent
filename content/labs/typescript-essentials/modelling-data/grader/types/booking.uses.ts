import { createBooking, type Bike, type Booking } from '../src/booking.ts'

const plain: Bike = { serial: 'NB-77310', make: 'Norrby' }
const ebike: Bike = { serial: 'LW-20114', make: 'Larkwheel', electric: true }
const made: Booking = createBooking('SW-1042', plain, 'basic')
const withNotes: Booking = createBooking('SW-1043', ebike, 'full', 'Squeaky brakes')
const literal: Booking = { id: 'SW-1044', bike: plain, level: 'overhaul' }
const notes: string | undefined = literal.notes
const isElectric: boolean | undefined = ebike.electric
literal.level = 'full'
literal.notes = 'Customer will call'
literal.bike.make = 'Norrby Pro'
