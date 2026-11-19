// The booking model, finished in the last issue and agreed with Dele. You do not need to
// change this file. Every type in the other files is built from these two.
export type ServiceLevel = 'basic' | 'full' | 'overhaul'

export interface Booking {
  id: string
  customer: { name: string; email: string }
  bike: { serial: string; make: string }
  level: ServiceLevel
  dropOff: string
  priceCents: number
  notes: string
}

export const sampleBookings: Booking[] = [
  {
    id: 'SW-1042',
    customer: { name: 'Petra Lindqvist', email: 'petra@example.com' },
    bike: { serial: 'NB-77310', make: 'Norrby' },
    level: 'full',
    dropOff: '2026-11-20',
    priceCents: 6500,
    notes: 'Squeaky rear brake'
  },
  {
    id: 'SW-1043',
    customer: { name: 'Omar Haddad', email: 'omar@example.com' },
    bike: { serial: 'LW-20114', make: 'Larkwheel' },
    level: 'basic',
    dropOff: '2026-11-21',
    priceCents: 3500,
    notes: ''
  }
]
