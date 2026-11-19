import { checkChange } from '../../sqlcheck.mjs'

const totalStock = (r) => r.tables.products.rows.reduce((sum, row) => sum + row[4], 0)

function transactionChecks(mine, want) {
  const words = mine.statements.map((s) => s.split(/\s+/)[0].toUpperCase())
  const opened = words.includes('BEGIN')
  const committed = words.includes('COMMIT') || words.includes('END')
  const diff = totalStock(mine) - totalStock(want)
  return [
    {
      name: 'The change runs inside one committed transaction',
      passed: opened && committed && !mine.openTransaction,
      message: !opened
        ? 'Your file never starts a transaction. Put BEGIN; before the first change.'
        : !committed || mine.openTransaction
          ? 'Your file starts a transaction but does not finish it. End it with COMMIT; or the changes are lost.'
          : undefined
    },
    {
      name: 'Total stock goes up by exactly the items in order 27',
      passed: diff === 0,
      message: diff
        ? `Total stock is ${diff > 0 ? 'higher' : 'lower'} than it should be by ${Math.abs(diff)}. Check which products the stock UPDATE changes and by how much.`
        : undefined
    }
  ]
}

export const checks = {
  'new-cafe': (t) => checkChange(t, 'queries/1-new-cafe.sql', { tables: ['cafes', 'orders'] }),
  'price-review': (t) => checkChange(t, 'queries/2-price-review.sql', { tables: ['products'] }),
  'cancel-order': (t) =>
    checkChange(t, 'queries/3-cancel-order.sql', {
      tables: ['products', 'orders', 'order_items'],
      extra: transactionChecks
    })
}
