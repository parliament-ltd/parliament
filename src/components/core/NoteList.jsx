/**
 * NoteList — stub for future modes (Kingfisher, Secretarybird).
 * Albatross manages notes inline on each MessageCard (per-message notes panel).
 * This component is reserved for modes that surface a dedicated notes panel.
 */
export default function NoteList({ notes = [], onEdit: _onEdit, onDelete: _onDelete }) {
  if (notes.length === 0) return null

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="px-3 py-2 rounded-lg border border-[#E9E9E7] bg-white text-xs text-[#37352F]"
        >
          {note.text}
        </div>
      ))}
    </div>
  )
}
