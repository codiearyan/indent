import { levelPrice, parseLevel, type ServiceLevel } from '../src/levels.ts'

// @ts-expect-error: 'quick' is not a service level
levelPrice('quick')
// @ts-expect-error: parseLevel can fail, so its result can be null
const level: ServiceLevel = parseLevel('full')
// @ts-expect-error: parseLevel takes text
parseLevel(3)
// @ts-expect-error: levelPrice returns a number of cents
const label: string = levelPrice('basic')
