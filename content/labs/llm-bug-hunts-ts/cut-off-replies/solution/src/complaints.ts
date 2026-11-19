// Real complaints from the Kestrel Parcels inbox, trimmed of names and addresses.

export const shortComplaint = 'My parcel came a day late. The box itself was fine.'

export const longComplaint =
  'I ordered a birthday cake stand and paid for same day delivery. ' +
  'The courier marked it as delivered at noon but nothing was at my door. ' +
  'My neighbour checked her porch and the lobby and found nothing either. ' +
  'I called your hotline twice and waited forty minutes each time. ' +
  'The second agent promised a callback within the hour that never came. ' +
  'Your app still shows a photo of a door that is not mine. ' +
  'The party starts tomorrow and I have no stand and no answers. ' +
  'I want a refund for the delivery fee and a clear plan today.'

// One customer pasted every tracking update into a single message.
export const endlessComplaint = Array.from(
  { length: 24 },
  (_, i) => `Update ${i + 1}: the tracking page still says out for delivery.`
).join(' ')
