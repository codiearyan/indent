import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useIde, useIdes } from '@/stores/ides'
import { useSettings } from '@/stores/settings'
import { Row } from './controls'

/** Picks the IDE issues open in. Nothing is shown when no IDE was found on this computer. */
export function IdeSelect({ id }: { id: string }): React.JSX.Element | null {
  const ides = useIdes((s) => s.ides)
  const ide = useIde()
  const setIde = useSettings((s) => s.setIde)
  if (!ides || !ide) return null

  return (
    <Select value={ide.id} onValueChange={setIde}>
      <SelectTrigger id={id} className="w-40 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ides.map(({ id, label }) => (
          <SelectItem key={id} value={id}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** The same choice as a row of Settings. */
export function IdeRow(): React.JSX.Element | null {
  if (!useIde()) return null
  return (
    <Row id="open-in-ide" label="Open issues in" hint="Opens an issue's folder in your own IDE.">
      <IdeSelect id="open-in-ide" />
    </Row>
  )
}
