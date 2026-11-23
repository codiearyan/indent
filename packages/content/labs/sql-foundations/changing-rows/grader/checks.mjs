import { checkChange } from '../../sqlcheck.mjs'

export const checks = {
  'add-owner': (t) => checkChange(t, 'queries/1-new-owner.sql'),
  'update-moss': (t) => checkChange(t, 'queries/2-moss-record.sql'),
  'remove-double-charge': (t) => checkChange(t, 'queries/3-double-charge.sql', { transaction: 'commit' }),
  'try-a-clear-out': (t) => checkChange(t, 'queries/4-clear-out.sql', { transaction: 'rollback' })
}
