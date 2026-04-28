// Local preview component for input@1.0's catalog debug card.
// Kept in its own file so the manifest entry stays a clean default-export
// (react-refresh's "only-export-components" rule).

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
