// Task 3: Longest stretch within a limit
//
// longestWithin(nums, limit) returns the length of the longest run of consecutive numbers whose
// maximum minus minimum is at most limit. limit is at least 0. An empty array gives 0.
// The check runs it on a million numbers: it must run in O(n).
export function longestWithin(nums: readonly number[], limit: number): number {
  // Two deques of indexes: values decreasing in maxes, increasing in mins.
  const maxes = new Int32Array(nums.length)
  const mins = new Int32Array(nums.length)
  let maxHead = 0
  let maxTail = 0
  let minHead = 0
  let minTail = 0
  let start = 0
  let best = 0
  for (let i = 0; i < nums.length; i++) {
    while (maxTail > maxHead && nums[maxes[maxTail - 1]] <= nums[i]) maxTail--
    maxes[maxTail++] = i
    while (minTail > minHead && nums[mins[minTail - 1]] >= nums[i]) minTail--
    mins[minTail++] = i
    while (nums[maxes[maxHead]] - nums[mins[minHead]] > limit) {
      start++
      if (maxes[maxHead] < start) maxHead++
      if (mins[minHead] < start) minHead++
    }
    best = Math.max(best, i - start + 1)
  }
  return best
}
