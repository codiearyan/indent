// The Saltmarsh Paddle Co. handbook: the help articles the front desk answers questions from.

export interface Doc {
  id: string
  title: string
  text: string
}

export const handbook: Doc[] = [
  {
    id: 'booking',
    title: 'Booking a kayak',
    text:
      'Book a kayak online or at the dock hut on the quay. Bookings open 30 days ahead and close one hour before launch. ' +
      'Every boat needs a deposit of 20 dollars, taken when you book. Single kayaks hold one paddler and double kayaks hold two. ' +
      'After booking, a confirmation email arrives with a QR code. Show the QR code at the dock hut to collect paddles and buoyancy aids. ' +
      'Launch times run every hour from 9 am to 5 pm, April to October.'
  },
  {
    id: 'cancellations',
    title: 'Cancelling or changing a booking',
    text:
      'Cancel at least 48 hours before launch for a full refund of the deposit and the hire fee. ' +
      'Cancel later than that and the money becomes a credit voucher for a future trip. ' +
      'A booking that nobody turns up for is a no-show, and a no-show loses the deposit. ' +
      'Each booking can move to another date once for free. A second change costs 5 dollars. ' +
      'Refunds reach the original card within 5 working days.'
  },
  {
    id: 'weather',
    title: 'Weather and wind',
    text:
      'Staff check the marine forecast at 7 am every morning. ' +
      'Trips are paused when the wind is above 20 knots, when thunder or lightning is forecast, or when fog hides the harbour mouth. ' +
      'When Saltmarsh pauses a trip for weather, the booking gets a full refund or a free move to another day. ' +
      'Light rain does not stop trips, so bring a waterproof jacket. ' +
      'Paddlers already on the water are called back with three blasts of the dock horn.'
  },
  {
    id: 'safety',
    title: 'Buoyancy aids and safety gear',
    text:
      'Every paddler wears a buoyancy aid for the whole trip, with no exceptions. ' +
      'Buoyancy aids come in sizes from child small to adult XXL and are included in the hire fee. ' +
      'Each kayak carries a whistle, a bailer sponge and a tow line. ' +
      'Phones go in the free dry bags kept by the dock hut door. ' +
      'Paddlers stay inside the yellow buoys that mark the safe area of the harbour. ' +
      'A safety boat with a trained crew patrols the harbour during every session.'
  },
  {
    id: 'children',
    title: 'Children and age limits',
    text:
      'The youngest paddler Saltmarsh can take is 5 years old. ' +
      'Children aged 5 to 11 sit in a double kayak with an adult. ' +
      'Young people aged 12 to 15 may paddle a single kayak if a parent or guardian is on the water in the same session. ' +
      'From 16, paddlers can hire a single kayak alone. ' +
      'Child buoyancy aids have a crotch strap so they cannot slip off. ' +
      'Children pay half the adult hire fee.'
  },
  {
    id: 'dogs',
    title: 'Paddling with dogs',
    text:
      'Dogs are welcome in open canoes, but not in kayaks. Only one dog may ride in each canoe. ' +
      'Every dog wears a dog life vest, which hires for 5 dollars from the dock hut. ' +
      'Owners keep the lead off on the water, so a dog that jumps in does not tip the canoe. ' +
      'Please bring a towel and rinse sandy dogs at the hose by the slipway before loading the car.'
  },
  {
    id: 'groups',
    title: 'Groups and guided tours',
    text:
      'Groups of 8 or more paddlers get 10 percent off the hire fee. ' +
      'Group bookings need two weeks of notice and one lead contact. ' +
      'A guided sunset tour leaves the quay every Friday evening in summer and lasts two hours. ' +
      'Guides lead one group of up to six boats each. ' +
      'School and club groups can ask for a private guide, which costs 80 dollars per session.'
  },
  {
    id: 'vouchers',
    title: 'Gift vouchers',
    text:
      'Gift vouchers can be bought for any amount from 25 dollars. ' +
      'A voucher stays valid for 18 months from the day it was bought. ' +
      'Vouchers cover hire fees, guided tours and dog life vests, but cannot be exchanged for cash. ' +
      'Enter the voucher code at checkout, or read it out at the dock hut. ' +
      'A voucher that runs out before the trip date can be extended once, for free, by emailing the office.'
  },
  {
    id: 'lost-property',
    title: 'Lost property',
    text:
      'Items left behind are kept at the dock hut for 30 days. ' +
      'Phones, wallets and keys go in the locked safe on the day they are found. ' +
      'To claim an item, describe it and show photo ID at the hut. ' +
      'Saltmarsh can post lost items within the country for 8 dollars, but cannot post items abroad. ' +
      'Unclaimed clothing after 30 days goes to the charity shop on Harbour Road.'
  },
  {
    id: 'damage',
    title: 'Damage and lost equipment',
    text:
      'Report any damage when the boat comes back, even a small crack. ' +
      'Scratches on the hull are normal wear and cost nothing. ' +
      'A paddle lost overboard costs 60 dollars to replace. ' +
      'A cracked or holed kayak is assessed by the workshop, and the repair bill is capped at the 20 dollar deposit ' +
      'for paddlers who stayed inside the yellow buoys. Damage caused outside the safe area is charged in full.'
  },
  {
    id: 'parking',
    title: 'Getting here and parking',
    text:
      'Saltmarsh is on the quay at the end of Harbour Road. ' +
      'The council car park beside the quay charges 4 dollars a day and takes cards. ' +
      'Bike racks stand next to the dock hut, free for paddlers. ' +
      'Bus 14 from the town centre stops at the quay every 20 minutes. ' +
      'Changing rooms and hot showers are inside the boathouse and open from 8 am to 6 pm.'
  }
]
