import { checkTable } from '../../sqlcheck.mjs'

const keyFills = (table, values) => ({
  name: 'A row added without an id gets an id of its own',
  run: [`INSERT INTO ${table} ${values}`],
  read: `SELECT typeof(id) FROM ${table}`,
  want: ['integer'],
  message: `A row added to ${table} without an id got none: its id is empty. Only a column declared as the table's key, with the exact type the lesson gives for a key, fills itself in; a key of another type, INT included, does not.`,
  refusedMessage: `A row added to ${table} without an id was refused, so Check could not see whether it gets one.`
})
const keyRefuses = (table, columns, values) => ({
  name: 'Two rows cannot share an id',
  run: [`INSERT INTO ${table} (id, ${columns}) VALUES (40, ${values})`, `INSERT INTO ${table} (id, ${columns}) VALUES (40, ${values})`],
  refused: true,
  message: `Two rows of ${table} with the same id both went in. The id is the table's key, and a key is different on every row.`
})

export const checks = {
  'vets-table': (t) =>
    checkTable(t, 'queries/1-vets.sql', {
      table: 'vets',
      columns: { id: 'INTEGER', name: 'TEXT', phone: 'TEXT' },
      probes: [
        keyFills('vets', "(name, phone) VALUES ('Saoirse Lund', '01632 960340')"),
        keyRefuses('vets', 'name', "'Saoirse Lund'"),
        {
          name: 'A vet with no name is refused',
          run: ["INSERT INTO vets (phone) VALUES ('01632 960341')"],
          refused: true,
          message: 'A vet with no name went in. The task says a name is never empty.'
        },
        {
          name: 'A vet with no phone goes in',
          run: ["INSERT INTO vets (name) VALUES ('Saoirse Lund')"],
          message: 'A vet with no phone was refused. The task says the phone may be empty.'
        },
        {
          name: 'A phone number keeps its first 0',
          run: ["INSERT INTO vets (name, phone) VALUES ('Saoirse Lund', '01632960342')"],
          read: 'SELECT phone FROM vets',
          want: ['01632960342'],
          message: 'A phone number written without spaces came back changed. Look at the type of phone.'
        }
      ]
    }),
  'microchips-table': (t) =>
    checkTable(t, 'queries/2-microchips.sql', {
      table: 'microchips',
      columns: { id: 'INTEGER', animal_id: 'INTEGER', chip: 'TEXT' },
      probes: [
        keyFills('microchips', "(animal_id, chip) VALUES (5, '900164000123456')"),
        {
          name: 'One animal can have two chips',
          run: [
            "INSERT INTO microchips (animal_id, chip) VALUES (5, '900164000123456')",
            "INSERT INTO microchips (animal_id, chip) VALUES (5, '900164000123457')"
          ],
          message: 'A second chip for the same animal was refused. The task says an animal can have two chips, so look at which column must never repeat.'
        },
        {
          name: 'The same chip on two rows is refused',
          run: [
            "INSERT INTO microchips (animal_id, chip) VALUES (5, '900164000123456')",
            "INSERT INTO microchips (animal_id, chip) VALUES (6, '900164000123456')"
          ],
          refused: true,
          message: 'The same chip number went in for two animals. The task says a chip number is never the same on two rows.'
        },
        {
          name: 'A row with no chip is refused',
          run: ['INSERT INTO microchips (animal_id) VALUES (5)', 'INSERT INTO microchips (animal_id) VALUES (6)'],
          refused: true,
          message: 'Rows with no chip number went in. The task says a chip is never empty, and a rule that values never repeat still lets several rows be empty.'
        },
        {
          name: 'A row with no animal is refused',
          run: ["INSERT INTO microchips (chip) VALUES ('900164000123458')"],
          refused: true,
          message: 'A chip with no animal went in. The task says animal_id is never empty.'
        }
      ]
    }),
  'reminders-table': (t) =>
    checkTable(t, 'queries/3-reminders.sql', {
      table: 'reminders',
      columns: { id: 'INTEGER', animal_id: 'INTEGER', due: 'TEXT', send_by: 'TEXT' },
      probes: [
        keyFills('reminders', "(animal_id, due, send_by) VALUES (7, '2027-02-01', 'email')"),
        {
          name: "A reminder that does not say how to send it gets 'phone'",
          run: ["INSERT INTO reminders (animal_id, due) VALUES (7, '2027-02-01')"],
          read: 'SELECT send_by FROM reminders',
          want: ['phone'],
          message: "A reminder added without send_by did not get 'phone'. Look at what the column holds when a row does not give it a value."
        },
        {
          name: 'A reminder can say how to send it',
          run: ["INSERT INTO reminders (animal_id, due, send_by) VALUES (7, '2027-02-01', 'email')"],
          read: 'SELECT send_by FROM reminders',
          want: ['email'],
          message: "A reminder added with send_by 'email' did not keep it."
        },
        {
          name: 'An empty send_by is refused',
          run: ["INSERT INTO reminders (animal_id, due, send_by) VALUES (7, '2027-02-01', NULL)"],
          refused: true,
          message: 'A reminder with send_by set to NULL went in. A default only fills a column a row leaves out; the task says send_by is never empty.'
        },
        {
          name: 'A reminder with no due date is refused',
          run: ["INSERT INTO reminders (animal_id, send_by) VALUES (7, 'email')"],
          refused: true,
          message: 'A reminder with no due date went in. The task says due is never empty.'
        },
        {
          name: 'A reminder with no animal is refused',
          run: ["INSERT INTO reminders (due, send_by) VALUES ('2027-02-01', 'email')"],
          refused: true,
          message: 'A reminder with no animal went in. The task says animal_id is never empty.'
        }
      ]
    }),
  'appointments-table': (t) =>
    checkTable(t, 'queries/4-appointments.sql', {
      table: 'appointments',
      columns: { id: 'INTEGER', animal_id: 'INTEGER', starts: 'TEXT', vet: 'TEXT' },
      probes: [
        keyFills('appointments', "(animal_id, starts, vet) VALUES (20, '2026-12-02 11:15', 'Ifan Pryce')"),
        {
          name: 'An appointment for an animal in animals goes in',
          run: ["INSERT INTO appointments (animal_id, starts, vet) VALUES (20, '2026-12-02 11:15', 'Ifan Pryce')"],
          message: 'An appointment for an animal that is in animals was refused. Look at which table and column animal_id points at.'
        },
        {
          name: 'An appointment for an animal that is not in animals is refused',
          run: ["INSERT INTO appointments (animal_id, starts, vet) VALUES (240, '2026-12-02 11:15', 'Ifan Pryce')"],
          refused: true,
          message: 'An appointment for an animal id that no row of animals has went in. animal_id must point at a row of animals.'
        },
        {
          name: 'An animal with an appointment cannot be removed',
          run: [
            "INSERT INTO appointments (animal_id, starts, vet) VALUES (21, '2026-12-02 11:15', 'Ifan Pryce')",
            'DELETE FROM animals WHERE id = 21'
          ],
          refused: true,
          message: 'An animal with an appointment was removed from animals. The task says that is refused while the appointment points at it.'
        },
        {
          name: 'An appointment with no animal is refused',
          run: ["INSERT INTO appointments (starts, vet) VALUES ('2026-12-02 11:15', 'Ifan Pryce')"],
          refused: true,
          message: 'An appointment with no animal went in. The task says animal_id is never empty.'
        },
        {
          name: 'An appointment with no time is refused',
          run: ["INSERT INTO appointments (animal_id, vet) VALUES (20, 'Ifan Pryce')"],
          refused: true,
          message: 'An appointment with no time went in. The task says starts is never empty.'
        },
        {
          name: 'An appointment with no vet is refused',
          run: ["INSERT INTO appointments (animal_id, starts) VALUES (20, '2026-12-02 11:15')"],
          refused: true,
          message: 'An appointment with no vet went in. The task says vet is never empty.'
        }
      ]
    }),
  'price-list-table': (t) =>
    checkTable(t, 'queries/5-price-list.sql', {
      table: 'price_list',
      columns: { id: 'INTEGER', name: 'TEXT', price: 'REAL' },
      probes: [
        keyFills('price_list', "(name, price) VALUES ('Ear drops', 19.2)"),
        {
          name: 'A price that is not a number is refused',
          run: ["INSERT INTO price_list (name, price) VALUES ('Ear drops', 'nineteen')"],
          refused: true,
          message: "A price written as a word went in. In this engine a column's type is only a preference unless the table makes types a rule: the lesson shows the word that does it."
        },
        {
          name: 'A price with pence goes in and stays a number',
          run: ["INSERT INTO price_list (name, price) VALUES ('Ear drops', 19.2)", "INSERT INTO price_list (name, price) VALUES ('Worm test', 32)"],
          read: 'SELECT typeof(price) FROM price_list ORDER BY id',
          want: ['real', 'real'],
          message: 'A price of 19.20 or of 32 was not kept as a number with pence. Look at the type of price.',
          refusedMessage: 'A price of 19.20 or of 32 was refused. Look at the type of price.'
        },
        {
          name: 'Two prices with the same name are refused',
          run: ["INSERT INTO price_list (name, price) VALUES ('Ear drops', 19.2)", "INSERT INTO price_list (name, price) VALUES ('Ear drops', 21)"],
          refused: true,
          message: 'Two prices with the same name went in. The task says a name is never the same on two rows.'
        },
        {
          name: 'A row with no price is refused',
          run: ["INSERT INTO price_list (name) VALUES ('Ear drops')"],
          refused: true,
          message: 'A row with no price went in. The task says price is never empty.'
        },
        {
          name: 'A row with no name is refused',
          run: ['INSERT INTO price_list (price) VALUES (19.2)'],
          refused: true,
          message: 'A row with no name went in. The task says a name is never empty, and a rule that values never repeat still lets several rows be empty.'
        }
      ]
    })
}
