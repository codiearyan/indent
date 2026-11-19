import { levelPrice, parseLevel, type ServiceLevel } from '../src/levels.ts'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

const exactlyThreeLevels: Equal<ServiceLevel, 'basic' | 'full' | 'overhaul'> = true
const parsed: ServiceLevel | null = parseLevel(' Full ')
const price: number = levelPrice('overhaul')
const fromParse = parseLevel('basic')
if (fromParse !== null) levelPrice(fromParse)
