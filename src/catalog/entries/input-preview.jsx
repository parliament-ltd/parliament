// Self-contained render wrapper for input@1.0. Used both by the catalog
// debug card (via previewRender) and by RoomShell (via render) until the
// ChatContext plumbing arrives in a later PR. Manages its own value state
// when no controlled value/onChange are passed in.
//
// Lives in its own file so input.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useState } from 'react'
import InputArea from '../../components/core/InputArea'

export default function InputPreview() {
  const [value, setValue] = useState('')
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
      <InputArea
        value={value}
        onChange={setValue}
        onSend={() => setValue('')}
        onStop={() => {}}
        isStreaming={false}
        placeholder="Ask a question..."
        availableTools={[]}
        activeTools={new Set()}
        onToggleTool={() => {}}
      />
      <p className="text-xs text-[var(--p-text-muted)] mt-3">
        Preview only — Send is a no-op in the catalog debug view.
      </p>
    </div>
  )
}
