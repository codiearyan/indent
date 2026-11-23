import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dataCases, fail } from '../../grading.mjs'

const FILE = 'kit_dates.py'

// Every date is far from today, today itself is handed in, and each call is watched for a read
// of the computer's clock, with time.time stood in for the call, so nothing depends on the day
// Check runs. Day and month names come from the file's own lists, never from the computer's
// language.
const CLOCK = [
  'datetime.date.today',
  'datetime.datetime.today',
  'datetime.datetime.now',
  'datetime.datetime.utcnow',
  'time.time',
  'time.time_ns',
  'time.localtime',
  'time.gmtime',
  'time.ctime'
]
const STOOD_IN = 946728000

const clock = (fn) => (watched) =>
  watched.length
    ? `${fn} reads today's date from the computer's clock (${watched[0].replace(/^datetime\./, '')}). The dates it works on are handed to it as values: use only those, so the answer is the same whatever day the code runs.`
    : null

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n) => String(n).padStart(2, '0')
const isoDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const day = (y, m, d) => ({ '@date': isoDay(y, m, d) })
const time = (y, m, d, h, min) => ({ '@datetime': `${isoDay(y, m, d)}T${pad(h)}:${pad(min)}:00` })
/** Monday is 0, as Python's weekday() counts. */
const weekday = (y, m, d) => (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
const addDays = (y, m, d, n) => {
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]
}
const daysBetween = (a, b) => Math.round((Date.UTC(...b.map((v, i) => (i === 1 ? v - 1 : v))) - Date.UTC(...a.map((v, i) => (i === 1 ? v - 1 : v)))) / 86400000)

const common = (fn) => ({ file: FILE, fn, modules: true, watch: CLOCK, clock: STOOD_IN, forbid: clock(fn) })

export const checks = {
  out(t) {
    const list = [
      ['A day after the 12th', '25/12/2041 07:05', [2041, 12, 25, 7, 5]],
      ['Early in the year', '01/02/1987 23:59', [1987, 2, 1, 23, 59]],
      ['A leap day at midnight', '29/02/1988 00:00', [1988, 2, 29, 0, 0]]
    ]
    return dataCases(t, {
      ...common('out_time'),
      task: 1,
      typed: 'out_time gives back the same time whatever text Check gives it. Read the text it is given.',
      list: list.map(([name, text, parts]) => ({
        name,
        args: [text],
        expected: time(...parts),
        hint: (v) => {
          const [y, m, d] = parts
          if (v.data?.['@datetime']?.startsWith(isoDay(y, d, m)))
            return 'out_time reads the day as the month and the month as the day. The sign-out book writes the day first.'
          return 'out_time does not give back the date and the time written in the text.'
        }
      }))
    })
  },

  since(t) {
    const list = [
      ['Across a leap day', [1988, 2, 27], [1988, 3, 1]],
      ['Across the new year', [2040, 12, 30], [2041, 1, 2]],
      ['Half a year', [2041, 1, 15], [2041, 7, 4]],
      ['Checked today', [2063, 5, 31], [2063, 5, 31]],
      ['Months of 31 days', [2041, 7, 1], [2041, 9, 1]]
    ]
    return dataCases(t, {
      ...common('days_since'),
      task: 2,
      typed: 'days_since gives back the same number whatever dates Check gives it. Work it out from the dates it is given.',
      list: list.map(([name, checked, today]) => {
        const want = daysBetween(checked, today)
        return {
          name,
          args: [isoDay(...checked), day(...today)],
          expected: want,
          hint: (v) => {
            if (v.type === 'timedelta')
              return 'days_since gives back the gap itself, a timedelta. The task asks for the number of days in it, a whole number.'
            if (v.type === 'int' && v.value === -want)
              return 'days_since takes today from the date of the check, the wrong way round, so the days come out below 0.'
            if (v.type === 'int' && v.value === today[2] - checked[2])
              return 'days_since takes one day of the month from the other, which is wrong as soon as the two dates are in different months. Take one date from the other.'
            if (v.type === 'int' && v.value === (today[0] - checked[0]) * 360 + (today[1] - checked[1]) * 30 + today[2] - checked[2])
              return 'days_since counts every month as 30 days, and months have 28 to 31. Take one date from the other.'
            return 'days_since does not give back how many days lie between the check and today.'
          }
        }
      })
    })
  },

  next(t) {
    const list = [
      ['Into the next year', [2041, 12, 20], 14],
      ['Across a leap day', [1988, 2, 20], 10],
      ['Into a short month', [2041, 1, 31], 30],
      ['No days', [2063, 5, 31], 0]
    ]
    return dataCases(t, {
      ...common('next_check'),
      task: 3,
      typed: 'next_check gives back the same date whatever Check gives it. Work it out from the date and the days it is given.',
      list: list.map(([name, start, every]) => ({
        name,
        args: [...start, every],
        expected: day(...addDays(...start, every)),
        hint: (v) => {
          if (v.type === 'datetime')
            return 'next_check gives back a datetime, a date with a time of day. The task asks for a date: make it from a date, not a datetime.'
          if (v.type === 'str') return 'next_check gives back text. The task asks for a date, which Python prints as text only when you print it.'
          return 'next_check does not give back the date that many days after the check.'
        }
      }))
    })
  },

  async line(t) {
    // %-d works on some systems and stops with an error on others, so it is refused by name.
    const code = (await readFile(join(t.workspace, FILE), 'utf8').catch(() => ''))
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n')
    const loose = /%[-#][a-zA-Z]/.exec(code)
    if (loose) {
      return [
        fail(
          'The format works on every computer',
          `kit_dates.py uses ${loose[0]} in a format. It drops the 0 in front on some computers, and stops with an error on others, such as Windows. Write the day of the month with .day, which is a plain number everywhere.`
        )
      ]
    }
    const list = [
      ['A Monday morning, early in the month', [2041, 3, 4, 9, 5]],
      ['A Sunday night in December', [1987, 12, 27, 23, 59]],
      ['A Wednesday at midnight', [2042, 10, 1, 0, 0]],
      ['A Saturday in the middle of the month', [2063, 6, 16, 14, 30]]
    ]
    return dataCases(t, {
      ...common('report_line'),
      task: 4,
      typed: 'report_line gives back the same text whatever date Check gives it. Write it from the datetime it is given.',
      list: list.map(([name, parts]) => {
        const [y, m, d, h, min] = parts
        const wd = weekday(y, m, d)
        const want = `${DAYS[wd]} ${d} ${MONTHS[m - 1]} ${y}, ${pad(h)}:${pad(min)}`
        return {
          name,
          args: [time(...parts)],
          expected: want,
          hint: (v) => {
            const got = v.type === 'str' ? v.value : ''
            const named = DAYS.find((n) => got.startsWith(n))
            if (named && named !== DAYS[wd])
              return `report_line names the wrong day of the week, ${named}. Count where the list of days starts against the number the datetime gives for the day: weekday() counts Monday as 0.`
            if (got.includes(` ${pad(d)} `) && d < 10)
              return 'report_line writes the day of the month with a 0 in front. The task asks for the day as a plain number.'
            const month = MONTHS.find((n) => got.includes(` ${n} `))
            if (month && month !== MONTHS[m - 1])
              return `report_line names the wrong month, ${month}. The months of a date count from 1, and the positions of a list from 0.`
            if (got.startsWith(`${DAYS[wd]} ${d} ${MONTHS[m - 1]} ${y}`))
              return 'report_line has the date right, but not the time: a comma and a space after the year, then hours and minutes, each two digits, with a colon between.'
            return 'report_line does not give back the line the task describes. Compare it with the example letter by letter.'
          }
        }
      })
    })
  }
}
