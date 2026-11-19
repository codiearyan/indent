// Tasks 1 and 2: Sliding window maximum
//
// windowMax(nums, k) returns the maximum of every window of k consecutive numbers, from left to
// right: nums.length - k + 1 values. k is a whole number of at least 1. When k is larger than
// nums.length there is no full window, so the result is [].
//
// Task 1 checks small inputs, so any correct approach passes.
// Task 2 checks a million numbers with windows of up to 50,000: the function must run in O(n).
export function windowMax(nums: readonly number[], k: number): number[] {
  const result: number[] = []
  // Indexes whose values decrease from front to back; the front is the current maximum.
  const deque = new Int32Array(nums.length)
  let head = 0
  let tail = 0
  for (let i = 0; i < nums.length; i++) {
    while (tail > head && nums[deque[tail - 1]] <= nums[i]) tail--
    deque[tail++] = i
    if (deque[head] <= i - k) head++
    if (i >= k - 1) result.push(nums[deque[head]])
  }
  return result
}
