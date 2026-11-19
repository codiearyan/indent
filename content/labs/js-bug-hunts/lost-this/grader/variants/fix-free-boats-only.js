export class Fleet {
  constructor(boatIds) {
    this.boatIds = boatIds
    this.out = new Set()
  }

  checkOut(id) {
    if (this.out.has(id)) throw new Error(`${id} is already out`)
    this.out.add(id)
  }

  checkIn(id) {
    this.out.delete(id)
  }

  isFree(id) {
    return !this.out.has(id)
  }

  freeBoats() {
    return this.boatIds.filter((id) => this.isFree(id))
  }
}
