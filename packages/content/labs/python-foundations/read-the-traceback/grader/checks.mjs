import { lineCases } from '../../grading.mjs'

const FILE = 'night_report.py'

/** Runs one task's lines with Check's own values for `name` and looks for its line. */
function brings(t, { task, name, values, label, what }) {
  return lineCases(t, {
    file: FILE,
    task,
    label,
    list: values.map((value, i) => ({
      name: i === 0 ? `Prints ${what} from ${name}` : `Prints ${what} for another value of ${name}`,
      given: { [name]: value },
      want: `${label} ${value}`,
      value
    })),
    wrongValue: `The line runs, but what it prints after ${label} is not what ${name} holds: Check gave ${name} another value and the line did not follow. Print the variable, not a value you typed.`,
    missing: `The Task ${task} lines run, but none of the lines they print reads ${label} followed by what ${name} holds, as the comment above them shows. The broken line is the one that prints ${what}: fix it rather than removing it, and compare its text with the comment.`
  })
}

export const checks = {
  callouts(t) {
    return brings(t, {
      task: 1,
      name: 'callouts_this_month',
      values: [7, 12],
      label: 'Callouts this month:',
      what: 'the callouts'
    })
  },

  hours(t) {
    return brings(t, {
      task: 2,
      name: 'hours_on_the_hill',
      values: [18, 44],
      label: 'Hours on the hill:',
      what: 'the hours on the hill'
    })
  },

  officer(t) {
    return brings(t, {
      task: 3,
      name: 'kit_officer',
      values: ['Kirsty', 'Iain'],
      label: 'Kit officer on call:',
      what: 'the kit officer'
    })
  },

  crew(t) {
    return brings(t, {
      task: 4,
      name: 'crew_on_call',
      values: [12, 5],
      label: 'Crew on call:',
      what: 'the crew on call'
    })
  }
}
