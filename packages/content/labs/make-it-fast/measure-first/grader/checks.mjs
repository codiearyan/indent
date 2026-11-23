import { runCases } from '../../checks-helpers.mjs'

const timeHints = {
  clock:
    'The time it gave back is not one the check\'s clock could have shown. Read the time with performance.now() just before and just after each run, and give back one of those differences.',
  await:
    'This step finishes a moment after it is called, and your time for it was 0. Wait for each run to finish before you read the clock again, so a step that returns a promise is timed until it is done.',
  warm: 'The first run was timed too. Run the step once before timing anything, and leave that run out: a first run is often slower than the rest.',
  runs: 'The step should run once without timing and then once for each of the runs asked for, no more and no fewer.',
  mean: 'That is the average of the times. One slow run pulls an average up; give back the time in the middle of the sorted times instead.',
  text: 'sort() with nothing handed to it puts numbers in order as if they were text, so 12 comes before 8. Hand sort a comparison of two numbers, so the times go from fastest to slowest.',
  fastest: 'That is the fastest of the times. Give back the time in the middle of the sorted times, which says what a usual run takes.',
  middle:
    'Sort the times from fastest to slowest and give back the one in the middle. With an even number of times, take the later of the two in the middle.'
}

const stepHints = {
  shape: 'timeSteps should return a list with one { name, ms } for each step: the step\'s name as text and its time as a number.',
  names: 'Each step of the object should appear once in the list, under the name it has in the object.',
  order: 'The times are right but the order is not. Put the slowest step first.',
  runs: 'Each ms should be what timeIt gives for that step with the number of runs timeSteps was handed. Pass runs on to timeIt.',
  together:
    'Each ms should be what timeIt gives for that step alone, with the same number of runs. Time the steps one after another: when they run at the same time, each one\'s time takes in the others.',
  times: 'Each ms should be what your timeIt gives for that step, with the same number of runs. Time each step with timeIt, and wait for its time before you start the next step.'
}

const countHints = {
  start: 'calls should be 0 before the counted function is used at all.',
  count: 'calls should go up by one on every call of the counted function, and only then.',
  result: 'The counted function should hand all its arguments to the function it wraps and give back exactly what that function returns.',
  apart: 'Two counted functions keep two counts. Keep each count with its own function, not in one place they share.',
  throws: 'When the wrapped function throws, the counted function should let that error reach the caller, not catch it.'
}

export const checks = {
  time(t) {
    return runCases(t, 'timeIt', [
      { name: 'Gives the middle time, after a first run', run: 'timeCase', args: ['five'], setup: 'timeIt(step, 5) on a step whose first run is much slower', hint: timeHints.middle, hints: timeHints },
      { name: 'Runs five times when no number is given', run: 'timeCase', args: ['default'], setup: 'timeIt(step) with no number of runs', hint: timeHints.middle, hints: timeHints },
      { name: 'An even number of runs', run: 'timeCase', args: ['four'], setup: 'timeIt(step, 4)', hint: timeHints.middle, hints: timeHints },
      { name: 'Waits for a step that finishes later', run: 'timeCase', args: ['later'], setup: 'timeIt(step, 3) on a step that returns a promise', hint: timeHints.middle, hints: timeHints }
    ])
  },

  steps(t) {
    return runCases(t, 'timeSteps', [
      { name: 'Three steps, slowest first', run: 'stepsCase', args: ['three'], setup: 'timeSteps({ match, money, print }) with steps of the check\'s own', hint: stepHints.times, hints: stepHints },
      { name: 'Four steps and three runs', run: 'stepsCase', args: ['four'], setup: 'timeSteps({ load, sort, check, save }, 3)', hint: stepHints.times, hints: stepHints }
    ])
  },

  count(t) {
    return runCases(t, 'counted', [
      { name: 'Counts the comparisons of a sort', run: 'countCase', args: ['sort'], setup: 'list.sort(counted(compare)) on ten numbers', hint: countHints.count, hints: countHints },
      { name: 'Passes every argument and the answer', run: 'countCase', args: ['args'], setup: 'counted((a, b, c) => a + b * c), called three times', hint: countHints.result, hints: countHints },
      { name: 'Gives back the very same value', run: 'countCase', args: ['same'], setup: 'counted(() => order), where order is an object', hint: countHints.result, hints: countHints },
      { name: 'Two counted functions count apart', run: 'countCase', args: ['apart'], setup: 'two counted functions, called three times and once', hint: countHints.apart, hints: countHints },
      { name: 'An error still reaches the caller', run: 'countCase', args: ['throws'], setup: 'a counted function whose second call throws, called three times', hint: countHints.throws, hints: countHints }
    ])
  }
}
