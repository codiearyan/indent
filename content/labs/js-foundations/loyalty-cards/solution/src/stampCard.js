// Task: A stamp card that remembers
//
// createStampCard(goal) returns a card object with two methods:
// - stamp(): adds one stamp. When the card reaches `goal` stamps it returns true (a free candle)
//   and the card starts again from 0. Otherwise it returns false.
// - stamps(): returns how many stamps the card holds right now.
// Every card keeps its own count.
export function createStampCard(goal) {
  let count = 0
  return {
    stamp() {
      count += 1
      if (count < goal) return false
      count = 0
      return true
    },
    stamps() {
      return count
    }
  }
}
