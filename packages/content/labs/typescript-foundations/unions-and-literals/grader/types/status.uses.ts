import { nextStatus, type Status } from '../src/delivery.ts'

// Each of the three statuses is a Status
const paid: Status = 'paid'
const packed: Status = 'packed'
const sent: Status = 'sent'
// What comes back is one of the three words too, not any text
const next: 'paid' | 'packed' | 'sent' = nextStatus(paid)
const again: Status = nextStatus(nextStatus(packed))
