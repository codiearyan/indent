// Task 2: make Fleet methods work when they are passed around (ticket CPC-23).
//
// A Fleet tracks which boats are out on the water. checkOut(id), checkIn(id) and isFree(id)
// must keep working when they are passed as plain functions, for example
// boatIds.filter(fleet.isFree) or scanner.on('in', fleet.checkIn). Every fleet keeps its own state.
// freeBoats() returns the ids of boats that are not out, in fleet order.

export class Fleet {
  constructor(boatIds) {
    this.boatIds = boatIds
    this.out = new Set()
  }

  checkOut = (id) => {
    if (this.out.has(id)) throw new Error(`${id} is already out`)
    this.out.add(id)
  }

  checkIn = (id) => {
    this.out.delete(id)
  }

  isFree = (id) => {
    return !this.out.has(id)
  }

  freeBoats() {
    return this.boatIds.filter(this.isFree)
  }
}
