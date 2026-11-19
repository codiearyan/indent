import { createBooking, type Bike, type Booking } from '../src/booking.ts'

const plain: Bike = { serial: 'NB-77310', make: 'Norrby' }
const booking: Booking = createBooking('SW-1042', plain, 'basic')
// @ts-expect-error: a booking id cannot change after it is made
booking.id = 'SW-9999'
// @ts-expect-error: a bike serial cannot change
booking.bike.serial = 'XX-00000'
// @ts-expect-error: every bike has a make
const noMake: Bike = { serial: 'NB-1' }
// @ts-expect-error: electric is true or false, not text
const textElectric: Bike = { serial: 'NB-2', make: 'Norrby', electric: 'yes' }
// @ts-expect-error: notes are text
const numberNotes: Booking = { id: 'SW-1', bike: plain, level: 'basic', notes: 42 }
// @ts-expect-error: a booking needs a bike
const noBike: Booking = { id: 'SW-2', level: 'basic' }
// @ts-expect-error: createBooking needs a bike and a level
createBooking('SW-3')
