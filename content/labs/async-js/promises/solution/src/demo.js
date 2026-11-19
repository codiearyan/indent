// Run with: node src/demo.js
import { loadTides } from './loadTides.js'
import { nextHighTide } from './nextHighTide.js'
import { sailingReport } from './sailingReport.js'

function show(label, run) {
  return Promise.resolve()
    .then(run)
    .then(
      (value) => console.log(label, JSON.stringify(value)),
      (err) => console.log(label, `Error: ${err.message}`)
    )
}

show('tide table for quay:', () => loadTides('quay'))
  .then(() => show('tide table for heron:', () => loadTides('heron')))
  .then(() => show('next high tide at quay after 12:00:', () => nextHighTide('quay', '12:00')))
  .then(() => show('next high tide at gull after 06:00:', () => nextHighTide('gull', '06:00')))
  .then(() => show('report for quay-gull:', () => sailingReport('quay-gull')))
  .then(() => show('report for quay-heron:', () => sailingReport('quay-heron')))
