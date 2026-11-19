import type { Frame } from '../types'
import { ArrayView } from './ArrayView'
import { BucketView } from './BucketView'
import { GraphView } from './GraphView'
import { GridView } from './GridView'
import { IntervalsView } from './IntervalsView'
import { ListView } from './ListView'
import { MapView } from './MapView'
import { TreeView } from './TreeView'

/** Draws one frame of a step. Views keep their DOM between steps so changes animate. */
export function FrameView({ frame }: { frame: Frame }): React.JSX.Element {
  switch (frame.kind) {
    case 'array':
      return <ArrayView frame={frame} />
    case 'bucket':
      return <BucketView frame={frame} />
    case 'map':
      return <MapView frame={frame} />
    case 'intervals':
      return <IntervalsView frame={frame} />
    case 'grid':
      return <GridView frame={frame} />
    case 'list':
      return <ListView frame={frame} />
    case 'tree':
      return <TreeView frame={frame} />
    case 'graph':
      return <GraphView frame={frame} />
  }
}
