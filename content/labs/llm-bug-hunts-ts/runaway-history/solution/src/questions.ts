// One very patient customer, checking on their parcel all afternoon.

export const questions = Array.from(
  { length: 30 },
  (_, i) => `Check ${i + 1}: is parcel KP-${60100 + i} still on the van today?`
)
