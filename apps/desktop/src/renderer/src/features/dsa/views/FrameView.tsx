import type { Frame } from '../types'
import { ArrayView } from './ArrayView'
import { BucketView } from './BucketView'
import { GraphView } from './GraphView'
import { GridView } from './GridView'
import { IntervalsView } from './IntervalsView'
import { ListView } from './ListView'
import { MapView } from './MapView'
import { TreeView } from './TreeView'

/**
 * Draws one frame of a step. Views keep their DOM between steps so changes animate. `fit` sizes
 * array, map and grid cells to their text, for flows whose values are names, not numbers.
 */
export function FrameView({ frame, fit }: { frame: Frame; fit?: boolean }): React.JSX.Element {
  switch (frame.kind) {
    case 'array':
      return <ArrayView frame={frame} fit={fit} />
    case 'bucket':
      return <BucketView frame={frame} />
    case 'map':
      return <MapView frame={frame} fit={fit} />
    case 'intervals':
      return <IntervalsView frame={frame} />
    case 'grid':
      return <GridView frame={frame} fit={fit} />
    case 'list':
      return <ListView frame={frame} />
    case 'tree':
      return <TreeView frame={frame} />
    case 'graph':
      return <GraphView frame={frame} />
  }
}
