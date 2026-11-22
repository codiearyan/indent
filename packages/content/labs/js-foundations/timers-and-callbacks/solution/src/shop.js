// The stock room's computer. It is old and slow: it takes a moment to count a shelf, and it cannot
// give the count back. You hand it a function, and it calls that function with the count once it
// has one. You do not need to change this file.
const shelves = { Cedar: 4, Fig: 0, Sage: 9, Amber: 2, Moss: 6 }

export function askStockRoom(name, done) {
  setTimeout(() => {
    done(shelves[name] ?? 0)
  }, 400)
}
