import { dataCases, tuple } from '../../grading.mjs'

const FILE = 'year_report.py'

// No value here sits halfway between two answers, so rounding is never in doubt.
const fixed = (n) => n.toFixed(1)
const row = (hill, callouts, hours) =>
  hill.padEnd(14) + String(callouts).padStart(6) + fixed(hours).padStart(8)
const HEADING = 'Hill'.padEnd(14) + 'Calls'.padStart(6) + 'Hours'.padStart(8)

const ROW = `
def report_row(hill, callouts, hours):
    return f"{hill:<14}{callouts:>6}{hours:>8.1f}"
`

/** Why a row is not the row `want` for these values, judged column by column. */
function rowWords(fn, got, hill, callouts, hours) {
  const want = row(hill, callouts, hours)
  const width = Math.max(14, hill.length)
  const last = got.trim().split(/\s+/).at(-1)
  if (last !== fixed(hours) && Number(last) === hours) {
    const places = (last.split('.')[1] ?? '').length
    return `${fn} shows the hours with ${places ? places : 'no'} decimal place${places === 1 ? '' : 's'}, and the task asks for exactly one, rounded.`
  }
  if (got.replace(/\s/g, '') !== want.replace(/\s/g, ''))
    return `${fn} does not give back the hill, the callouts and the hours, in that order.`
  if (got.trim() !== got && got.length === want.length + 1) return `${fn} has a space too many.`
  if (got.length !== want.length)
    return `${fn} gives back a row ${got.length} characters long, and the columns of 14, 6 and 8 make ${want.length}. Give each value its width in the format, and type no spaces of your own between them.`
  if (got.slice(0, width) !== hill.padEnd(14))
    return 'The hill is not on the left of its column of 14. The hill goes on the left of its column, and the numbers on the right of theirs.'
  if (got.slice(width, width + 6) !== String(callouts).padStart(6))
    return 'The callouts are not on the right of their column of 6.'
  return 'The hours are not on the right of their column of 8.'
}

export const checks = {
  decimals(t) {
    const list = [
      ['Two decimal places', 2.34, '2.3 h'],
      ['Rounded up to a whole hour', 11.96, '12.0 h'],
      ['A whole number', 3, '3.0 h'],
      ['One decimal place already', 16.5, '16.5 h'],
      ['No hours', 0, '0.0 h']
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'hours_text',
      text: true,
      typed:
        'hours_text gives back the same text whatever number Check gives it. Format the number it is given.',
      list: list.map(([name, hours, want]) => ({
        name,
        args: [hours],
        expected: want,
        hint: (v) => {
          if (v.type !== 'str') return `hours_text gives back ${v.repr}, and the task asks for text.`
          const got = String(v.value)
          if (got === `${hours} h`)
            return Number.isInteger(hours)
              ? 'For a whole number, hours_text shows no decimal place at all. A format with one decimal place shows one even for a whole number; round keeps a whole number whole.'
              : 'hours_text shows the number with all its decimals. The task asks for exactly one, rounded.'
          if (got.replace(' ', '') === want.replace(' ', '')) return 'hours_text is right but for the space between the number and the h.'
          if (got.startsWith(want.split(' ')[0]) || got.startsWith(want.split('.')[0] + '.'))
            return 'hours_text does not show exactly one decimal place.'
          return 'hours_text does not give back the number with one decimal place, a space and h.'
        }
      }))
    })
  },

  padding(t) {
    const list = [
      ['A number of one digit', 2026, 7, '2026-007'],
      ['A number of two digits', 2025, 42, '2025-042'],
      ['A number of three digits', 2027, 315, '2027-315'],
      ['A number of four digits', 2026, 1204, '2026-1204']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'incident_id',
      text: true,
      typed:
        'incident_id gives back the same text whatever Check gives it. Build it from the year and the number it is given.',
      list: list.map(([name, year, number, want]) => ({
        name,
        args: [year, number],
        expected: want,
        hint: (v) => {
          const got = String(v.value)
          if (v.type !== 'str') return `incident_id gives back ${v.repr}, and the task asks for text.`
          if (got === `${year}-${number}`) return 'incident_id does not pad the number with zeros.'
          if (got === `${year}-${String(number).padStart(2, '0')}`) return 'incident_id pads the number to two digits. The task asks for three.'
          if (got === `${year}${String(number).padStart(3, '0')}`) return 'incident_id leaves out the dash between the year and the number.'
          if (got.endsWith(String(number)) && got.length > want.length) return 'incident_id pads the number to more than three digits.'
          return 'incident_id does not give back the year, a dash and the number padded to three digits.'
        }
      }))
    })
  },

  row(t) {
    const list = [
      ['A short hill', 'Ben Vane', 12, 31.04],
      ['A hill of two words', 'Scarth Fell', 4, 9.24],
      ['Less than an hour', 'Meall Odhar', 1, 0.46],
      ['A whole number of hours', 'Garve Edge', 107, 250],
      ['A hill longer than its column', 'Beinn a Chlachair', 7, 102.8]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'report_row',
      text: true,
      typed:
        'report_row gives back the same row whatever Check gives it. Build it from the values it is given.',
      list: list.map(([name, hill, callouts, hours]) => ({
        name,
        args: [hill, callouts, hours],
        expected: row(hill, callouts, hours),
        hint: (v) =>
          v.type !== 'str'
            ? `report_row gives back ${v.repr}, and the task asks for text.`
            : rowWords('report_row', String(v.value), hill, callouts, hours)
      }))
    })
  },

  table(t) {
    const list = [
      ['Three hills', [['Ben Vane', 2, 4.2], ['Scarth Fell', 15, 9.9], ['Meall Odhar', 1, 1.3]]],
      ['One hill', [['Beinn Ruadh', 9, 27.6]]],
      ['No hills', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'report',
      text: true,
      define: ROW,
      typed:
        'report gives back the same lines whatever Check gives it. Build them from the list it is given.',
      list: list.map(([name, rows]) => {
        const calls = rows.reduce((sum, r) => sum + r[1], 0)
        const hours = rows.reduce((sum, r) => sum + r[2], 0)
        const want = [HEADING, ...rows.map((r) => row(...r)), row('Total', calls, hours)]
        return {
          name,
          args: [rows.map((r) => tuple(...r))],
          expected: want,
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data : []
            if (got.length === want.length - 1 && got[0] === HEADING && got.at(-1) !== want.at(-1))
              return 'report leaves out the total line, or a row: there should be a heading, one row for each hill and a total line.'
            if (got.length !== want.length)
              return `report gives back ${got.length} lines, and the table has ${want.length}: a heading, one row for each hill and a total line.`
            if (got[0] !== HEADING) {
              return typeof got[0] === 'string' && got[0].replace(/\s/g, '') === HEADING.replace(/\s/g, '')
                ? 'The heading line does not line up with the columns: Hill on the left of 14, Calls on the right of 6 and Hours on the right of 8.'
                : 'The first line is not the heading: Hill, Calls and Hours.'
            }
            const bad = want.findIndex((line, i) => got[i] !== line)
            if (bad === want.length - 1) {
              const last = String(got[bad])
              return last.startsWith('Total') && last.includes(String(calls))
                ? 'The total line does not have the hours of every hill added up, with one decimal place.'
                : 'The total line is not Total, the callouts added up and the hours added up, in the columns of a row.'
            }
            return 'The rows between the heading and the total are not one row for each hill, in order, as report_row makes them.'
          }
        }
      })
    })
  }
}
