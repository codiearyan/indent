import { codeOnly, fail, near, pass, printed, tasks } from '../../grading.mjs'

const WELCOME = 'Welcome to Lanternquay Ferries'
const TIMES = ['Boats cross every half hour', 'Last boat back at half past seven']
const HOURS = 'Hut open from 6:30 to 20:00'
const OLD = 'Bicycles cross free on Sundays'

const trimmed = (run) => run.lines.map((l) => l.trimEnd())

/** The text of each comment in a task's lines. */
const comments = (text) =>
  [...text.matchAll(/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|\/\/([^\n]*)|\/\*([\s\S]*?)\*\//g)]
    .filter((m) => m[0].startsWith('/'))
    .map((m) => m[1] ?? m[2])

export const checks = tasks({
  file: 'Notice.java',
  tasks: {
    welcome: {
      task: 1,
      cases: [{}],
      judge: ([run]) => {
        const lines = trimmed(run)
        const passed = lines.includes(WELCOME)
        const close = !passed && lines.some((l) => near(l, WELCOME))
        return [
          passed
            ? pass('Prints the welcome', printed(run))
            : fail(
                'Prints the welcome',
                close
                  ? 'Close. One line is nearly the welcome. Compare it letter by letter with the task: capital letters, spaces and spelling count, and nothing extra goes on the line.'
                  : 'No line printed the welcome yet. Under // Task 1, print it with System.out.println, with the text in double quotes.',
                printed(run)
              )
        ]
      }
    },

    times: {
      task: 2,
      cases: [{}],
      judge: ([run]) => {
        const lines = trimmed(run)
        const first = lines.indexOf(TIMES[0])
        const second = lines.indexOf(TIMES[1])
        const both = first !== -1 && second !== -1
        const close =
          !both && TIMES.some((t) => !lines.includes(t) && lines.some((l) => near(l, t)))
        const glued = !both && lines.some((l) => near(l, TIMES.join('')))
        return [
          both
            ? pass('Prints both crossing times', printed(run))
            : fail(
                'Prints both crossing times',
                glued
                  ? 'Both times came out on one line. print carries on on the same line; println ends the line after it.'
                  : close
                    ? 'Close. A line is nearly one of the two. Compare it letter by letter with the task: capital letters and spaces count.'
                    : 'One or both lines are missing. Each line needs its own System.out.println, with the text exactly as the task gives it.',
                printed(run)
              ),
          both && second === first + 1
            ? pass('Prints them in order, one after the other')
            : fail(
                'Prints them in order, one after the other',
                both
                  ? 'Both lines are there, but not one right after the other in the order the task gives. Java runs the lines of main from top to bottom.'
                  : 'Print both lines first.'
              )
        ]
      }
    },

    hours: {
      task: 3,
      cases: [{}],
      judge: ([run], { section }) => {
        const lines = trimmed(run)
        const one = lines.includes(HOURS)
        const ended = run.stdout
          .split('\n')
          .slice(0, -1)
          .some((l) => l.trimEnd() === HOURS)
        const code = codeOnly(section)
        const prints = (code.match(/System\s*\.\s*out\s*\.\s*print(?:ln)?\s*\(/g) ?? []).length
        const usesPrint = /System\s*\.\s*out\s*\.\s*print\s*\(/.test(code)
        const close = !one && lines.some((l) => near(l, HOURS))
        return [
          one && ended
            ? pass('Prints the hours on one line', printed(run))
            : fail(
                'Prints the hours on one line',
                one
                  ? 'The hours are on one line, but the line never ends: whatever prints next would carry on right after 20:00. The second part should end its line.'
                  : close
                    ? 'Close. The hours are on one line, but not exactly as the task gives them. Look at the space between the two parts: it is part of the first text.'
                    : lines.includes('Hut open from 6:30') && lines.includes('to 20:00')
                      ? 'The hours still come out on two lines. println ends the line after it prints; the lesson shows the one that does not.'
                      : 'Check cannot find the hours in what Task 3 printed. Keep both lines of the starter, with their text as it was.',
                printed(run)
              ),
          prints >= 2 && usesPrint
            ? pass('Keeps the two lines and changes how the first prints')
            : fail(
                'Keeps the two lines and changes how the first prints',
                'This task is about the difference between two ways of printing. Keep the two lines the starter gave, and change only the way the first one prints.'
              )
        ]
      }
    },

    'old-notice': {
      task: 4,
      cases: [{}],
      judge: ([run], { section }) => {
        const off = !run.lines.some((l) => l.includes(OLD))
        const kept = comments(section).some((c) => c.includes(OLD))
        return [
          off
            ? pass('The old notice is no longer printed', printed(run))
            : fail(
                'The old notice is no longer printed',
                'The old notice still prints. Look at the line under // Task 4: what makes Java skip a line?',
                printed(run)
              ),
          off && kept
            ? pass('The line is still in the file, as a comment')
            : fail(
                'The line is still in the file, as a comment',
                off
                  ? 'The old notice is gone from the file. Bridie wants to keep it, switched off, in case it comes back. Put the line back and turn it into a comment.'
                  : 'Switch the notice off first.'
              )
        ]
      }
    }
  }
})
