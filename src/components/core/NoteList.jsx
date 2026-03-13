/**
 * NoteList — stub for future modes (Kingfisher, Secretarybird).
 * Albatross manages notes inline on each MessageCard (per-message notes panel).
 * This component is reserved for modes that surface a dedicated notes panel.
 */
export default function NoteList({ notes = [], onEdit, onDelete }) {
  if (notes.length === 0) return null

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="px-3 py-2 rounded-lg border border-[#EBEBEB] bg-white text-xs text-[#4A5568]"
        >
          {note.text}
        </div>
      ))}
    </div>
  )
}
