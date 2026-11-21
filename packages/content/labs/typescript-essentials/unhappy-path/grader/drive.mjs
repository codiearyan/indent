// Copied into the sandbox as .grader/drive.mjs. Each helper imports only the file it needs.
export const isBookingRecord = async (v) => (await import('../src/import.ts')).isBookingRecord(v)
export const readBookings = async (json) => (await import('../src/import.ts')).readBookings(json)

const errors = () => import('../src/errors.ts')

async function thrown(kind) {
  const { PartNotFoundError } = await errors()
  const values = {
    error: new Error('Disk full'),
    typeError: new TypeError('price is not a number'),
    string: 'timeout',
    object: { message: 'Rate limited', code: 429 },
    objectNumberMessage: { message: 404 },
    number: 42,
    null: null,
    undefined: undefined,
    partNotFound: new PartNotFoundError('a 28-inch rim')
  }
  return values[kind]
}

// The value really is thrown and caught, the way the supplier's client would do it.
export async function message(kind) {
  const value = await thrown(kind)
  try {
    throw value
  } catch (caught) {
    return (await errors()).errorMessage(caught)
  }
}

export async function failure(kind) {
  const value = await thrown(kind)
  try {
    throw value
  } catch (caught) {
    return (await errors()).describeOrderFailure(caught)
  }
}

const suppliers = {
  price: async () => 1899,
  free: async () => 0,
  negative: async () => -5,
  notANumber: async () => Number.NaN,
  rejectsError: async () => {
    throw new Error('Supplier offline')
  },
  rejectsString: async () => {
    throw 'timeout'
  },
  throwsAtOnce: () => {
    throw new Error('Bad part id')
  }
}

export async function quote(supplier) {
  const { getQuote } = await import('../src/quotes.ts')
  const asked = []
  const fetchPrice = (partId) => {
    asked.push(partId)
    return suppliers[supplier](partId)
  }
  const pending = getQuote('chain-8s', fetchPrice)
  const isPromise = pending instanceof Promise
  return { result: await pending, isPromise, asked }
}

export const unwrapOr = async (result, fallback) => (await import('../src/quotes.ts')).unwrapOr(result, fallback)
