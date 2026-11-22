// Money for the whole shop: how a price is written, kept in one place. Labels, emails and the site
// all show prices, so they import them from here.
//
// Task 1: Share the price code
//
// Prices are kept in cents, so 1850 means 18.50.

// twoDigits(n) writes a number below 100 with two digits: 5 becomes '05'. Only formatPrice uses it.
function twoDigits(n) {
  if (n < 10) {
    return `0${n}`
  }
  return `${n}`
}

// formatPrice(cents) writes a price the way the shop shows it: 1850 becomes '18.50 EUR'.
function formatPrice(cents) {
  const euros = Math.floor(cents / 100)
  return `${euros}.${twoDigits(cents - euros * 100)} EUR`
}

// salePrice(cents, percent) is the price with percent taken off, rounded to the cent.
function salePrice(cents, percent) {
  return Math.round((cents * (100 - percent)) / 100)
}

// Task 1: Share the price code
// Below this comment, write an export line that shares formatPrice and salePrice with other
// files. twoDigits only helps formatPrice, so it stays in this file.
